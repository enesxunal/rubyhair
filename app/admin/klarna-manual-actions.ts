"use server";
import {after} from "next/server";
import {redirect} from "next/navigation";
import {z} from "zod";
import {isAdmin} from "@/lib/admin-auth";
import {getPrisma} from "@/lib/prisma";
import {captureAuthorizedKlarna,runCustomerJobs} from "@/lib/customer-automation";
import {requireOrderTransition} from "@/lib/order-lifecycle";

const manualHandover=z.object({
 id:z.string().uuid(),
 tracking:z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9-]{7,59}$/),
 confirmed:z.literal(true)
});

// Only after a REAL parcel has been handed over. The admin supplies the
// physical DHL tracking number; this action never purchases a label.
export async function confirmManualKlarnaHandoverAction(data:FormData){
 if(!await isAdmin())redirect("/admin/login");
 const parsed=manualHandover.safeParse({
  id:data.get("id"),tracking:data.get("tracking"),
  confirmed:data.get("parcelHandedOver")==="on"
 });
 if(!parsed.success)redirect("/admin/bestellungen?manualKlarna=invalid");
 const {id,tracking}=parsed.data;
 const db=getPrisma();
 try{
  const before=await db.order.findUnique({where:{id},include:{shippingJob:true}});
  if(!before||before.testOnly||before.deliveryMethod!=="dhl"||!before.paymentReference?.startsWith("KLARNA-HPP:")||
     !/^Klarna authorized: [0-9a-f-]{36}$/i.test(before.fulfillmentNote||""))
    throw new Error("UNVERIFIED_KLARNA_ORDER");
  if(before.status==="shipped"&&before.trackingNumber===tracking)return;
  if(!["payment_authorized","payment_confirmed"].includes(before.status)||(before.trackingNumber&&before.trackingNumber!==tracking)||
     ["manual_shipped","submitting","canceling","needs_review","order_cancel_review"].includes(before.shippingJob?.status||"")||
     (["label_created","awaiting_handover"].includes(before.shippingJob?.status||"")&&before.shippingJob?.trackingNumber!==tracking))
    throw new Error("NOT_ELIGIBLE_FOR_MANUAL_HANDOVER");
  if(before.status==="payment_authorized"){
   // Provider GET -> idempotent capture -> GET again -> exact amount -> invoice.
   // If capture succeeds and the DB write fails, retrying re-reads the provider.
   await captureAuthorizedKlarna(id);
  }
  const verified=await db.order.findUnique({where:{id},include:{invoice:true,payments:true}});
  if(!verified||verified.status!=="payment_confirmed"||!verified.invoice||
     !verified.payments.some(p=>p.provider==="klarna"&&p.eventType==="PAYMENT.CAPTURE.COMPLETED"))
    throw new Error("CAPTURE_NOT_RECONCILED");
  requireOrderTransition("payment_confirmed","preparing","fulfillment");
  requireOrderTransition("preparing","shipped","fulfillment");
  await db.$transaction(async tx=>{
   const prepared=await tx.order.updateMany({
    where:{id,status:"payment_confirmed",testOnly:false,trackingNumber:before.trackingNumber===tracking?tracking:null},
    data:{status:"preparing"}
   });
   if(prepared.count!==1)throw new Error("CONCURRENT_HANDOVER");
   const now=new Date();
   await tx.order.update({where:{id},data:{
    status:"shipped",trackingCarrier:"DHL",trackingNumber:tracking,shippedAt:now
   }});
   await tx.orderStatusEvent.createMany({data:[
    {orderId:id,fromStatus:"payment_confirmed",toStatus:"preparing",reason:"manual_dhl_after_verified_klarna_capture"},
    {orderId:id,fromStatus:"preparing",toStatus:"shipped",reason:"admin_confirmed_physical_dhl_handover"}
   ]});
   await tx.shippingJob.upsert({
    where:{orderId:id},
    create:{orderId:id,status:"manual_shipped",trackingNumber:tracking},
    update:{status:["label_created","awaiting_handover"].includes(before.shippingJob?.status||"")?"shipped":"manual_shipped",trackingNumber:tracking,lastError:null}
   });
   await tx.orderNotification.upsert({
    where:{orderId_stage:{orderId:id,stage:"shipped"}},
    create:{orderId:id,stage:"shipped"},update:{}
   });
  },{timeout:12000});
  after(async()=>{try{await runCustomerJobs(2)}catch(e){console.error("RUBY_KLARNA_MANUAL_EMAIL_RETRY_REQUIRED",e instanceof Error?e.name:"UNKNOWN")}});
 }catch(e){
  console.error("RUBY_KLARNA_MANUAL_HANDOVER_REVIEW",e instanceof Error?e.name:"UNKNOWN");
  redirect("/admin/bestellungen?manualKlarna=review");
 }
 redirect("/admin/bestellungen?manualKlarna=shipped");
}
