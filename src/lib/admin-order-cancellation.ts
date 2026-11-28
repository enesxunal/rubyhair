import "server-only";
import {Prisma} from "@prisma/client";
import {getPrisma} from "@/lib/prisma";
import {providerForCheckout} from "@/lib/customer-checkout";
import {cancelHold,cancellationLocalReason,remoteCancellationState,cancelIdempotencyKey} from "@/lib/order-cancellation-policy";
const select={id:true,orderNumber:true,testOnly:true,status:true,currency:true,totalCents:true,deliveryMethod:true,giftAppliedCents:true,trackingNumber:true,shippedAt:true,deliveredAt:true,paymentReference:true,fulfillmentNote:true,invoice:{select:{id:true}},payments:{select:{id:true}},giftPurchases:{select:{id:true}},shippingJob:{select:{id:true,status:true,trackingNumber:true}}} as const;
export async function readCancellationOrder(number:bigint){
 const db=getPrisma();
 const row=await db.order.findUnique({where:{orderNumber:number},select});
 if(!row||row.testOnly)return null;
 const hasLabel=row.shippingJob?Boolean(await db.shippingJob.findFirst({where:{id:row.shippingJob.id,labelPdf:{not:null}},select:{id:true}})):false;
 return {...row,shippingJob:row.shippingJob?{...row.shippingJob,hasLabel}:null};
}
type CancelOrder=NonNullable<Awaited<ReturnType<typeof readCancellationOrder>>>;
async function remote(o:CancelOrder){
 const providerId=/^Klarna authorized: ([0-9a-f-]{36})$/i.exec(o.fulfillmentNote||"")?.[1];
 if(!providerId||!o.paymentReference)throw Error("REFERENCE");
 const {api}=await providerForCheckout("klarna");
 const hpp=await api.readHostedPage(o.paymentReference.slice("KLARNA-HPP:".length));
 if(hpp.order_id!==providerId||!["COMPLETE","COMPLETED"].includes(hpp.status))throw Error("REFERENCE");
 const getState=async()=>{
  const r=await api.readOrder(providerId),raw=await api.readCaptures(providerId);
  const captures=Array.isArray(raw)?raw:raw.captures;
  if(!Array.isArray(captures))return "review";
  return remoteCancellationState(r,providerId,o.totalCents,captures);
 };
 return {api,providerId,getState};
}
export async function inspectCancellation(number:bigint){
 const order=await readCancellationOrder(number);
 if(!order)return {order:null,state:"not_found"};
 const reason=cancellationLocalReason(order);
 if(reason)return {order,state:reason};
 try{return {order,state:await (await remote(order)).getState()}}catch{return {order,state:"provider_unavailable"}}
}
export async function cancelVerifiedKlarnaOrder(number:bigint){
 const db=getPrisma(),o=await readCancellationOrder(number);
 if(!o||cancellationLocalReason(o)||!o.shippingJob)throw Error("LOCAL_REVIEW");
 const gateway=await remote(o);
 let state=await gateway.getState();
 if(!["authorized","cancelled"].includes(state))throw Error("PROVIDER_REVIEW");
 // Claim the shipping job first: no label booking or manual handover during
 // cancellation. On ambiguity retain the hold for a read/retry, never restore stock.
 const held=await db.shippingJob.updateMany({where:{id:o.shippingJob.id,status:o.shippingJob.status,trackingNumber:null,labelPdf:null,order:{is:{id:o.id,status:"payment_authorized",trackingNumber:null,testOnly:false,shippedAt:null,deliveredAt:null}}},data:{status:cancelHold,lastError:null}});
 if(held.count!==1)throw Error("CONCURRENT_SHIPPING");
 if(state==="authorized"){
  try{await gateway.api.cancelUncapturedOrder(gateway.providerId,cancelIdempotencyKey(o.id))}catch{/* Verify actual provider outcome; no blind retry. */}
  state=await gateway.getState();
 }
 if(state!=="cancelled")throw Error("CANCELLATION_NOT_VERIFIED");
 await db.$transaction(async tx=>{
  const current=await tx.order.findUnique({where:{id:o.id},include:{lines:true,invoice:{select:{id:true}},payments:{select:{id:true}},giftPurchases:{select:{id:true}},shippingJob:{select:{id:true,status:true,trackingNumber:true}}}});
  if(!current||!current.shippingJob||current.shippingJob.status!==cancelHold||cancellationLocalReason({...current,shippingJob:{...current.shippingJob,hasLabel:false}}))throw Error("LOCAL_STATE_CHANGED");
  const changed=await tx.order.updateMany({where:{id:o.id,status:"payment_authorized",paymentReference:o.paymentReference,totalCents:o.totalCents,trackingNumber:null,shippedAt:null,deliveredAt:null},data:{status:"cancelled",reservationExpiresAt:null}});
  if(changed.count!==1)throw Error("CONCURRENT_ORDER");
  for(const line of current.lines){
   if(!line.stockReserved)continue;
   const restored=await tx.variant.updateMany({where:{id:line.variantId,stockQuantity:{not:null}},data:{stockQuantity:{increment:line.quantity}}});
   if(restored.count!==1)throw Error("STOCK_REVIEW");
  }
  await tx.shippingJob.updateMany({where:{id:current.shippingJob.id,status:cancelHold},data:{status:"canceled",lastError:null}});
  await tx.orderStatusEvent.create({data:{orderId:o.id,fromStatus:"payment_authorized",toStatus:"cancelled",reason:"admin_klarna_cancellation_provider_verified"}});
  await tx.orderNotification.updateMany({where:{orderId:o.id,status:"queued",stage:{in:["received","received_admin","awaiting_payment"]}},data:{status:"skipped"}});
  await tx.orderNotification.upsert({where:{orderId_stage:{orderId:o.id,stage:"cancelled"}},create:{orderId:o.id,stage:"cancelled"},update:{}});
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:10000});
}
