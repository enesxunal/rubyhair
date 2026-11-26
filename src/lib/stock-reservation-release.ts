import {Prisma,type PrismaClient} from "@prisma/client";

/** Call only after matching terminal unpaid provider proof. */
export async function releaseVerifiedUnpaidReservation(db:PrismaClient,orderId:string,reference:string,cutoff:Date,notify=false){
 return db.$transaction(async tx=>{
  const order=await tx.order.findUnique({where:{id:orderId},include:{lines:true}});
  if(!order||order.testOnly||order.status!=="pending_payment"||order.paymentReference!==reference||!order.reservationExpiresAt||order.reservationExpiresAt>cutoff)return false;
  if(await tx.paymentEvent.count({where:{orderId}})||await tx.invoice.count({where:{orderId}}))return false;
  const changed=await tx.order.updateMany({where:{id:orderId,status:"pending_payment",testOnly:false,paymentReference:reference,reservationExpiresAt:{lte:cutoff}},data:{status:"cancelled",reservationExpiresAt:null}});
  if(changed.count!==1)return false;
  for(const line of order.lines){
   // Only return units that were actually decremented when the order was placed.
   if(!line.stockReserved)continue;
   const restored=await tx.variant.updateMany({where:{id:line.variantId,stockQuantity:{not:null}},data:{stockQuantity:{increment:line.quantity}}});
   if(restored.count!==1)throw new Error("RESERVED_STOCK_REQUIRES_REVIEW");
  }
  const redemption=await tx.giftRedemption.findUnique({where:{orderId}});
  if(redemption?.state==="reserved"){
   const released=await tx.giftRedemption.updateMany({where:{id:redemption.id,state:"reserved"},data:{state:"released"}});
   if(released.count===1)await tx.giftCard.update({where:{id:redemption.cardId},data:{balanceCents:{increment:redemption.amountCents}}});
  }
  await tx.orderStatusEvent.create({data:{orderId,fromStatus:"pending_payment",toStatus:"cancelled",reason:"verified_unpaid_payment_timeout"}});
  if(notify)await tx.orderNotification.upsert({where:{orderId_stage:{orderId,stage:"failed"}},create:{orderId,stage:"failed"},update:{}});
  return true;
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:10000});
}
