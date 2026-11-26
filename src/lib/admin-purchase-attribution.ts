import "server-only";
import {getPrisma} from "@/lib/prisma";
import {commerceRangeUTC} from "@/lib/admin-commerce-report";
import type {AnalyticsRange} from "@/lib/admin-analytics-report";
import {touchSchema,purchaseSourceLabels,type Touch} from "@/lib/purchase-attribution-policy";
export async function loadPurchaseAttributions(kind:"order"|"gift",ids:string[]){
 if(!ids.length)return new Map<string,{first:Touch;last:Touch}>();
 const rows=await getPrisma().purchaseAttribution.findMany({where:{kind,purchaseId:{in:ids},consent:{expiresAt:{gt:new Date()}}},select:{purchaseId:true,first:true,last:true}});
 const map=new Map<string,{first:Touch;last:Touch}>();
 for(const row of rows){const a=touchSchema.safeParse(row.first),b=touchSchema.safeParse(row.last);if(a.success&&b.success)map.set(row.purchaseId,{first:a.data,last:b.data})}
 return map;
}
export async function loadAttributionReport(range:AnalyticsRange){
 try{
 const db=getPrisma(),b=commerceRangeUTC(range);
 const start=b.start,end=b.endExclusive;
 // Count actual captures, not visits, authorizations or duplicated cart gifts.
 const captures=await db.paymentEvent.findMany({where:{eventType:{in:["PAYMENT.CAPTURE.COMPLETED","KLARNA.CAPTURE.COMPLETED"]},provider:{in:["paypal","klarna"]},receivedAt:{gte:start,lt:end},order:{testOnly:false,status:{in:["payment_confirmed","preparing","shipped","delivered"]},currency:"EUR",invoice:{isNot:null}}},select:{orderId:true,order:{select:{totalCents:true,giftAppliedCents:true}}},take:1501});
 const gifts=await db.giftPurchase.findMany({where:{cartOrderId:null,status:"captured",provider:"paypal",capturedAt:{gte:start,lt:end},card:{isNot:null}},select:{id:true,amountCents:true},take:1501});
 if(captures.length>1500||gifts.length>1500)return null;
 const orders=new Map(captures.map(r=>[r.orderId,r.order]));
 const orderAttr=await loadPurchaseAttributions("order",[...orders.keys()]);
 const giftAttr=await loadPurchaseAttributions("gift",gifts.map(g=>g.id));
 const totals=new Map<string,{source:string,count:number,cents:number}>();
 const add=(source:string,cents:number)=>{
  if(cents<=0)return;
  const row=totals.get(source)||{source,count:0,cents:0};row.count++;row.cents+=cents;totals.set(source,row);
 };
 for(const [id,o] of orders)add(orderAttr.get(id)?.last.source||"unknown",o.totalCents-o.giftAppliedCents);
 for(const g of gifts)add(giftAttr.get(g.id)?.last.source||"unknown",g.amountCents);
 return [...totals.values()].sort((a,b)=>b.cents-a.cents).map(row=>({...row,label:purchaseSourceLabels[row.source as keyof typeof purchaseSourceLabels]||purchaseSourceLabels.unknown}));
 }catch{console.warn("RUBY_ATTRIBUTION_REPORT_UNAVAILABLE");return null}
}
