import {createHash} from "node:crypto";
import type {PrismaClient} from "@prisma/client";
import {Prisma} from "@prisma/client";
import {z} from "zod";
import {requireOrderTransition} from "./order-lifecycle";

/**
 * INTERNAL LOCAL-ONLY stock hold prototype. It is intentionally NOT exposed
 * from a public route and must never be treated as a customer order/payment.
 * Callers cannot supply price, tax, shipping, customer data or status.
 */
const testInput=z.object({
  reservationKey:z.string().uuid(),
  lines:z.array(z.object({
    variantId:z.string().uuid(),
    quantity:z.number().int().min(1).max(99)
  }).strict()).min(1).max(30)
}).strict().superRefine((data,ctx)=>{
  const ids=new Set<string>();
  let sum=0;
  for(const [index,line] of data.lines.entries()){
    if(ids.has(line.variantId))ctx.addIssue({code:"custom",path:["lines",index,"variantId"],message:"Duplicate variant"});
    ids.add(line.variantId);sum+=line.quantity;
  }
  if(sum>99)ctx.addIssue({code:"custom",path:["lines"],message:"Cart quantity limit exceeded"});
});
export type TestOrderInput=z.infer<typeof testInput>;
export type TestOrderResult={id:string;number:string;status:string;totalCents:number;expiresAt:Date|null;replayed:boolean};
export class TestOrderError extends Error{
  constructor(public code:string,message:string){super(message);this.name="TestOrderError";}
}

/* Defense in depth: this cannot run on Vercel, or against any remote database. */
export function assertLocalTestMode(){
  if(process.env.RUBY_LOCAL_ORDER_TESTS!=="LOCAL_TEST_ONLY" || process.env.VERCEL){
    throw new TestOrderError("TEST_ONLY","Local test order reservation is disabled");
  }
  let host="";
  try{host=new URL(process.env.DATABASE_URL||"").hostname.toLowerCase();}
  catch{throw new TestOrderError("TEST_ONLY","PostgreSQL connection is required");}
  if(!["localhost","127.0.0.1","[::1]"].includes(host)){
    throw new TestOrderError("TEST_ONLY","Refusing a non-local PostgreSQL connection");
  }
}
const digest=(lines:TestOrderInput["lines"])=>createHash("sha256")
 .update(JSON.stringify(lines.map(x=>({id:x.variantId,quantity:x.quantity})).sort((a,b)=>a.id.localeCompare(b.id))))
 .digest("hex");

function summary(row:{id:string;orderNumber:bigint;status:string;totalCents:number;reservationExpiresAt:Date|null},replayed=false):TestOrderResult{
 return {id:row.id,number:row.orderNumber.toString(),status:row.status,totalCents:row.totalCents,expiresAt:row.reservationExpiresAt,replayed};
}

export async function reserveLocalTestOrder(db:PrismaClient,raw:unknown):Promise<TestOrderResult>{
 assertLocalTestMode();
 const parsed=testInput.safeParse(raw);
 if(!parsed.success)throw new TestOrderError("INVALID_REQUEST","Invalid test cart");
 const input=parsed.data,hash=digest(input.lines);
 const existing=await db.order.findUnique({where:{reservationKey:input.reservationKey}});
 if(existing){
   if(!existing.testOnly||existing.requestDigest!==hash)throw new TestOrderError("IDEMPOTENCY_CONFLICT","Key used with another cart");
   return summary(existing,true);
 }
 const sorted=[...input.lines].sort((a,b)=>a.variantId.localeCompare(b.variantId));
 try{
  return await db.$transaction(async tx=>{
    const variants=await tx.variant.findMany({
      where:{id:{in:sorted.map(x=>x.variantId)}},
      include:{product:{select:{active:true,currency:true}}}
    });
    const map=new Map(variants.map(v=>[v.id,v]));
    let subtotal=0;
    const orderLines=[];
    for(const item of sorted){
      const variant=map.get(item.variantId);
      if(!variant||!variant.active||!variant.product.active||variant.product.currency!=="EUR")
        throw new TestOrderError("UNAVAILABLE_VARIANT","Inactive or unknown variant");
      if(variant.stockQuantity===null)
        throw new TestOrderError("UNVERIFIED_STOCK","Physical stock has not been confirmed");
      if(variant.stockQuantity<item.quantity)
        throw new TestOrderError("INSUFFICIENT_STOCK","Not enough inventory");
      if(variant.priceCents<=0||!Number.isSafeInteger(variant.priceCents))
        throw new TestOrderError("INVALID_PRICE","Invalid DB price");
      const lineTotalCents=variant.priceCents*item.quantity;
      if(!Number.isSafeInteger(lineTotalCents))throw new TestOrderError("INVALID_PRICE","Price overflow");
      subtotal+=lineTotalCents;
      if(!Number.isSafeInteger(subtotal)||subtotal>2147483647)
        throw new TestOrderError("INVALID_PRICE","Order total exceeds database limit");
      orderLines.push({variantId:variant.id,quantity:item.quantity,unitPriceCents:variant.priceCents,lineTotalCents});
    }
    for(const line of orderLines){
      const result=await tx.variant.updateMany({
        where:{id:line.variantId,active:true,stockQuantity:{gte:line.quantity}},
        data:{stockQuantity:{decrement:line.quantity}}
      });
      if(result.count!==1)throw new TestOrderError("INSUFFICIENT_STOCK","Stock changed during checkout");
    }
    const order=await tx.order.create({data:{
      status:"test_reserved",testOnly:true,reservationKey:input.reservationKey,requestDigest:hash,
      reservationExpiresAt:new Date(Date.now()+15*60*1000),
      currency:"EUR",subtotalCents:subtotal,totalCents:subtotal,
      shippingCents:0,taxCents:0,customerEmail:null,billingAddress:Prisma.JsonNull,shippingAddress:Prisma.JsonNull,
      lines:{create:orderLines},
      statusEvents:{create:{fromStatus:null,toStatus:"test_reserved",reason:"local_test_reservation"}}
    }});
    return summary(order);
  },{timeout:10000});
 }catch(error){
  if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002"){
   const duplicate=await db.order.findUnique({where:{reservationKey:input.reservationKey}});
   if(duplicate){
     if(!duplicate.testOnly||duplicate.requestDigest!==hash)throw new TestOrderError("IDEMPOTENCY_CONFLICT","Key used with another cart");
     return summary(duplicate,true);
   }
  }
  throw error;
 }
}
export async function endLocalTestReservation(db:PrismaClient,orderId:string,reason:"test_cancelled"|"test_expired"="test_cancelled",now=new Date()):Promise<TestOrderResult>{
 assertLocalTestMode();
 if(!z.string().uuid().safeParse(orderId).success)throw new TestOrderError("INVALID_REQUEST","Invalid test order ID");
 return db.$transaction(async tx=>{
   const order=await tx.order.findUnique({where:{id:orderId},include:{lines:true}});
   if(!order||!order.testOnly)throw new TestOrderError("NOT_FOUND","No such local test order");
   if(order.status!=="test_reserved")return summary(order,true);
   if(reason==="test_expired"&&(!order.reservationExpiresAt||order.reservationExpiresAt>now))
     return summary(order,true);
   requireOrderTransition(order.status,reason,"local_test");
   const changed=await tx.order.updateMany({where:{id:orderId,testOnly:true,status:"test_reserved"},data:{status:reason}});
   if(changed.count!==1){
     const fresh=await tx.order.findUniqueOrThrow({where:{id:orderId}});
     return summary(fresh,true);
   }
   for(const line of [...order.lines].sort((a,b)=>a.variantId.localeCompare(b.variantId))){
     const restored=await tx.variant.updateMany({
       where:{id:line.variantId,stockQuantity:{not:null}},
       data:{stockQuantity:{increment:line.quantity}}
     });
     if(restored.count!==1)throw new TestOrderError("STOCK_RECONCILIATION_REQUIRED","Stock changed to unknown during hold");
   }
   await tx.orderStatusEvent.create({data:{orderId,fromStatus:"test_reserved",toStatus:reason,reason:reason==="test_expired"?"reservation_timeout":"manual_test_cancel"}});
   return summary({...order,status:reason});
 });
}
export async function expireLocalTestReservations(db:PrismaClient,now=new Date()):Promise<number>{
 assertLocalTestMode();
 const orders=await db.order.findMany({
   where:{testOnly:true,status:"test_reserved",reservationExpiresAt:{lte:now}},
   select:{id:true},take:100,orderBy:{reservationExpiresAt:"asc"}
 });
 let expired=0;
 for(const order of orders){
   const result=await endLocalTestReservation(db,order.id,"test_expired",now);
   if(!result.replayed)expired++;
 }
 return expired;
}
