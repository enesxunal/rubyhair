import "server-only";
import {getPrisma} from "@/lib/prisma";
import {commerceRangeUTC,createCommerceReport,type CapturedOrder,type StockSnapshot} from "@/lib/admin-commerce-report";
import type {AnalyticsRange} from "@/lib/admin-analytics-report";

/** Admin-only read path. The calling route checks isAdmin() before invoking. */
export async function loadCommerceReport(range:AnalyticsRange){
 const db=getPrisma(),bounds=commerceRangeUTC(range);
 const captureEvents=["PAYMENT.CAPTURE.COMPLETED","KLARNA.CAPTURE.COMPLETED"];
 const eventSelect={orderId:true,receivedAt:true,order:{select:{
  id:true,status:true,totalCents:true,giftAppliedCents:true,createdAt:true,testOnly:true,
  lines:{select:{quantity:true,lineTotalCents:true,variant:{select:{product:{select:{name:true}}}}}}
 }}} as const;
 // Include a sentinel to avoid silently presenting a truncated period as complete.
 // Vercel uses a two-connection Prisma pool. Keep at most two simultaneous reads
 // here; the previous four-way burst could intermittently starve a range report.
 const [captures,previous]=await Promise.all([
  db.paymentEvent.findMany({where:{eventType:{in:captureEvents},receivedAt:{gte:bounds.start,lt:bounds.endExclusive},order:{testOnly:false}},
   select:eventSelect,orderBy:{receivedAt:"desc"},take:1501}),
  db.paymentEvent.findMany({where:{eventType:{in:captureEvents},receivedAt:{gte:bounds.previousStart,lt:bounds.start},order:{testOnly:false}},
   select:eventSelect,orderBy:{receivedAt:"desc"},take:1501})
 ]);
 const [cohorts,variants]=await Promise.all([
  db.order.groupBy({by:["status"],where:{testOnly:false,createdAt:{gte:bounds.start,lt:bounds.endExclusive}},_count:{_all:true}}),
  db.variant.findMany({where:{active:true,product:{active:true}},select:{stockQuantity:true}})
 ]);
 const mapEvents=(events:typeof captures):CapturedOrder[]=>{
  const distinct=new Set<string>();const rows:CapturedOrder[]=[];
  for(const e of events){
   const o=e.order;
   if(distinct.has(o.id))continue;
   distinct.add(o.id);
   rows.push({id:o.id,status:o.status,totalCents:o.totalCents,giftAppliedCents:o.giftAppliedCents,
    createdAt:o.createdAt,capturedAt:e.receivedAt,lines:o.lines.map(l=>({productName:l.variant.product.name,quantity:l.quantity,lineTotalCents:l.lineTotalCents}))});
  }
  return rows;
 };
 const stock:StockSnapshot={verifiedUnits:0,outOfStock:0,lowStock:0,unknownStock:0,totalVariants:variants.length};
 for(const v of variants){
  if(v.stockQuantity===null){stock.unknownStock++;continue;}
  stock.verifiedUnits+=Math.max(0,v.stockQuantity);
  if(v.stockQuantity===0)stock.outOfStock++;
  else if(v.stockQuantity<=5)stock.lowStock++;
 }
 return createCommerceReport({captured:mapEvents(captures),previous:mapEvents(previous),
  cohorts:cohorts.map(x=>({status:x.status,count:x._count._all})),stock,
  truncated:captures.length>1500||previous.length>1500},range);
}

/** Do not turn transient pool errors into false zero revenue. Retry once, then
 * show an explicit unavailable state. Logs contain only Prisma error codes.
 * Call only after admin authentication, never from a public route. */
export async function loadCommerceReportSafely(range:AnalyticsRange){
 try{return await loadCommerceReport(range)}catch(error){
  const code=error&&typeof error==="object"&&"code" in error&&typeof error.code==="string"
   ?error.code:"UNKNOWN";
  console.error("RUBY_ANALYTICS_COMMERCE_READ_FAILED",{code,attempt:1});
  if(!new Set(["P2024","P1001","P1002","P1008","P1017"]).has(code))return null;
  try{return await loadCommerceReport(range)}catch(retryError){
   const retryCode=retryError&&typeof retryError==="object"&&"code" in retryError&&typeof retryError.code==="string"
    ?retryError.code:"UNKNOWN";
   console.error("RUBY_ANALYTICS_COMMERCE_READ_FAILED",{code:retryCode,attempt:2});
   return null;
  }
 }
}
