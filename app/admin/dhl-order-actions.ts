"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {isAdmin} from "@/lib/admin-auth";
import {getPrisma} from "@/lib/prisma";
import {measuredPackageWeightG} from "@/lib/dhl-weight";
import {createDhlShipmentLabel,cancelDhlShipment,type ShippingAddress} from "@/lib/dhl-labels";

const orderUrl="/admin/bestellungen?dhl=";
const validId=(v:unknown):v is string=>typeof v==="string"&&/^[0-9a-f-]{36}$/i.test(v);
const address=(v:unknown):ShippingAddress=>{
 if(!v||typeof v!=="object"||Array.isArray(v))throw new Error("DHL_ADDRESS_MISSING");
 const a=v as Record<string,unknown>;
 if(a.country!=="DE"||!["firstName","lastName","street","postalCode","city"].every(k=>typeof a[k]==="string"&&String(a[k]).trim()))throw new Error("DHL_ADDRESS_INVALID");
 return a as ShippingAddress;
};
const refresh=()=>{revalidatePath("/admin/bestellungen");revalidatePath("/admin/dhl");};

export async function createOrderDhlLabelAction(form:FormData){
 if(!await isAdmin())redirect("/admin/login");
 const id=form.get("id");
 if(!validId(id)||form.get("confirmed")!=="on")redirect(orderUrl+"invalid");
 const db=getPrisma();
 let result="review";
 try{
  const order=await db.order.findUnique({where:{id},include:{payments:true,shippingJob:true,lines:{select:{quantity:true}}}});
  if(!order||order.testOnly||!order.lines.length||!order.paymentReference||order.trackingNumber||
     !(order.status==="payment_authorized"?order.paymentReference.startsWith("KLARNA-HPP:")&&/^Klarna authorized: [0-9a-f-]{36}$/i.test(order.fulfillmentNote||""):["payment_confirmed","preparing"].includes(order.status)&&order.payments.some(p=>p.eventType==="PAYMENT.CAPTURE.COMPLETED"&&p.provider!=="manual"&&p.providerEventId.length>0)))throw new Error("DHL_ORDER_NOT_ELIGIBLE");
  const recipient=address(order.shippingAddress);
  const weightG=measuredPackageWeightG(order.lines,form.get("weightG"));
  const job=order.shippingJob;
  if(!job||!["waiting_credentials","canceled"].includes(job.status)||job.trackingNumber||job.labelPdf)throw new Error("DHL_JOB_NOT_ELIGIBLE");
  const claim=await db.shippingJob.updateMany({where:{id:job.id,status:job.status,trackingNumber:null,labelPdf:null,order:{is:{status:order.status,trackingNumber:null,testOnly:false}}},data:{status:"submitting",attemptCount:{increment:1},lastError:null}});
  if(claim.count!==1)throw new Error("DHL_CONCURRENT_REQUEST");
  try{
   const label=await createDhlShipmentLabel({orderNumber:String(order.orderNumber),recipient,weightG},fetch,true);
   await db.$transaction(async tx=>{
    const changed=await tx.shippingJob.updateMany({where:{id:job.id,status:"submitting"},data:{status:"awaiting_handover",trackingNumber:label.trackingNumber,labelPdf:new Uint8Array(label.labelPdf),lastError:null}});
    if(changed.count!==1)throw new Error("DHL_CONCURRENT_UPDATE");
    const updated=await tx.order.updateMany({where:{id,status:order.status,trackingNumber:null},data:{trackingCarrier:"DHL",trackingNumber:label.trackingNumber}});
    if(updated.count!==1)throw new Error("DHL_ORDER_CHANGED");
   });
   result="created";
  }catch(e){
   await db.shippingJob.updateMany({where:{id:job.id,status:"submitting"},data:{status:"needs_review",lastError:e instanceof Error?e.name:"UNKNOWN"}});
  }
 }catch(e){console.warn("DHL_MANUAL_CREATE_REVIEW",e instanceof Error?e.name:"UNKNOWN")}
 refresh();redirect(orderUrl+result);
}

export async function cancelOrderDhlLabelAction(form:FormData){
 if(!await isAdmin())redirect("/admin/login");
 const id=form.get("id");
 if(!validId(id)||form.get("confirmed")!=="on")redirect(orderUrl+"invalid");
 const db=getPrisma();
 let result="review";
 try{
  const order=await db.order.findUnique({where:{id},include:{shippingJob:true}});
  const job=order?.shippingJob;
  if(!order||order.testOnly||!["payment_confirmed","preparing","payment_authorized"].includes(order.status)||!job||!["label_created","awaiting_handover"].includes(job.status)||!job.trackingNumber||order.trackingNumber!==job.trackingNumber)throw new Error("DHL_CANCEL_NOT_ELIGIBLE");
  const tracking=job.trackingNumber;
  const claim=await db.shippingJob.updateMany({where:{id:job.id,status:job.status,trackingNumber:tracking,order:{is:{status:order.status,trackingNumber:tracking,testOnly:false}}},data:{status:"canceling"}});
  if(claim.count!==1)throw new Error("DHL_CONCURRENT_CANCEL");
  try{
   await cancelDhlShipment(tracking);
   await db.$transaction(async tx=>{
    const changed=await tx.shippingJob.updateMany({where:{id:job.id,status:"canceling",trackingNumber:tracking},data:{status:"canceled",trackingNumber:null,labelPdf:null,lastError:null}});
    if(changed.count!==1)throw new Error("DHL_CANCEL_CONCURRENT_UPDATE");
    const updated=await tx.order.updateMany({where:{id,status:order.status,trackingNumber:tracking},data:{trackingNumber:null,trackingCarrier:null}});
    if(updated.count!==1)throw new Error("DHL_CANCEL_ORDER_CHANGED");
   });
   result="canceled";
  }catch(e){
   await db.shippingJob.updateMany({where:{id:job.id,status:"canceling"},data:{status:"needs_review",lastError:"DHL_CANCEL_REQUIRES_REVIEW"}});
  }
 }catch(e){console.warn("DHL_MANUAL_CANCEL_REVIEW",e instanceof Error?e.name:"UNKNOWN")}
 refresh();redirect(orderUrl+result);
}
