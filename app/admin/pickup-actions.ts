"use server";
import {after} from "next/server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {isAdmin} from "@/lib/admin-auth";
import {getPrisma} from "@/lib/prisma";
import {captureAuthorizedKlarna,deliverQueuedOrderEmails} from "@/lib/customer-automation";
import {requireOrderTransition} from "@/lib/order-lifecycle";

// This action is only for the merchant's confirmation of actual personal handover.
export async function confirmPickupAction(data:FormData){
 if(!await isAdmin())redirect("/admin/login");
 const id=data.get("id"),target="/admin/bestellungen?pickup=";
 if(typeof id!=="string"||!/^[0-9a-f-]{36}$/i.test(id)||data.get("handedOver")!=="on")redirect(target+"invalid");
 const db=getPrisma();
 let result="review";
 try{
  const before=await db.order.findUnique({where:{id},include:{shippingJob:true,lines:{select:{id:true}}}});
  if(!before||before.testOnly||before.deliveryMethod!=="pickup"||!before.lines.length||before.shippingCents!==0||before.trackingNumber||before.shippedAt||before.deliveredAt||!before.shippingJob||before.shippingJob.trackingNumber||before.shippingJob.labelPdf||!["payment_authorized","payment_confirmed","preparing"].includes(before.status)||!["pickup_waiting","pickup_handover"].includes(before.shippingJob.status))throw Error("PICKUP_NOT_ELIGIBLE");
  const claim=await db.shippingJob.updateMany({where:{id:before.shippingJob.id,status:before.shippingJob.status,trackingNumber:null,labelPdf:null,order:{is:{id,deliveryMethod:"pickup",testOnly:false,status:before.status}}},data:{status:"pickup_handover"}});
  if(claim.count!==1)throw Error("PICKUP_CONCURRENT_CHANGE");
  if(before.status==="payment_authorized")await captureAuthorizedKlarna(id);
  await db.$transaction(async tx=>{
   const order=await tx.order.findUnique({where:{id},include:{invoice:{select:{id:true}},payments:true,shippingJob:true}});
   if(!order||order.testOnly||order.deliveryMethod!=="pickup"||order.shippingJob?.status!=="pickup_handover"||order.trackingNumber||order.shippedAt||order.deliveredAt||!order.invoice||!["payment_confirmed","preparing"].includes(order.status)||!order.payments.some(p=>(["paypal","klarna"].includes(p.provider)&&p.eventType==="PAYMENT.CAPTURE.COMPLETED")||(p.provider==="gift_card"&&p.eventType==="GIFT_REDEEMED"&&order.giftAppliedCents===order.totalCents)))throw Error("PICKUP_PAYMENT_REVIEW");
   requireOrderTransition(order.status,"delivered","pickup_fulfillment");
   const changed=await tx.order.updateMany({where:{id,deliveryMethod:"pickup",status:order.status,deliveredAt:null,trackingNumber:null,testOnly:false},data:{status:"delivered",deliveredAt:new Date()}});
   if(changed.count!==1)throw Error("PICKUP_ORDER_CHANGED");
   const job=await tx.shippingJob.updateMany({where:{id:order.shippingJob.id,status:"pickup_handover"},data:{status:"pickup_completed",lastError:null}});
   if(job.count!==1)throw Error("PICKUP_JOB_CHANGED");
   await tx.orderStatusEvent.create({data:{orderId:id,fromStatus:order.status,toStatus:"delivered",reason:"admin_confirmed_personal_pickup"}});
   await tx.orderNotification.upsert({where:{orderId_stage:{orderId:id,stage:"delivered"}},create:{orderId:id,stage:"delivered"},update:{}});
  },{timeout:12000});
  result="completed";
  after(async()=>{try{await deliverQueuedOrderEmails(5)}catch{}});
 }catch{console.warn("RUBY_PICKUP_REVIEW")}
 revalidatePath("/admin/bestellungen");revalidatePath("/admin");
 redirect(target+result);
}
