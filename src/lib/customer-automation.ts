import "server-only";
import {getPrisma} from "@/lib/prisma";
import {releaseVerifiedUnpaidReservation} from "@/lib/stock-reservation-release";
import {revalidateTag} from "next/cache";
import {paypalReservationReleasable,klarnaReservationReleasable} from "@/lib/stock-reservation-policy";
import {packageTareG,packageWeightG} from "@/lib/dhl-weight";
import {getDhlIntegrationReadiness} from "@/lib/dhl-api";
import {createDhlShipmentLabel,validateDhlLiveTemplateOnly,type ShippingAddress} from "@/lib/dhl-labels";
import {sendStoreOrderMail} from "@/lib/store-mail-transport";
import {loadStoreMailSettings,adminOrderNotificationRecipients} from "@/lib/store-mail-settings";
import {orderMailStages,type OrderMailStage} from "@/lib/order-mail-templates";
import {providerForCheckout} from "@/lib/customer-checkout";
import {finishCapturedCustomerOrder} from "@/lib/customer-order-finalize";
import {requireOrderTransition} from "@/lib/order-lifecycle";

const db=()=>getPrisma();
const retryAt=(attempts:number)=>new Date(Date.now()+Math.min(6*3600,Math.pow(2,Math.min(attempts,7))*5*60)*1000);
const safeError=(e:unknown)=>e instanceof Error?e.name:"UNKNOWN";

export async function deliverQueuedOrderEmails(limit=10){
 const store=await loadStoreMailSettings();
 if(!store.stored||!store.password)return {sent:0,skipped:"SMTP_NOT_CONFIGURED"};
 const now=new Date(),stale=new Date(Date.now()-20*60*1000);
 const rows=await db().orderNotification.findMany({where:{OR:[
  {status:"queued",nextAttemptAt:{lte:now}},
  {status:"sending",updatedAt:{lt:stale}}
 ]},orderBy:{createdAt:"asc"},take:Math.max(1,Math.min(limit,20))});
 let sent=0;
 for(const item of rows){
  const claim=await db().orderNotification.updateMany({where:{id:item.id,status:item.status},data:{status:"sending",attempts:{increment:1}}});
  if(claim.count!==1)continue;
  try{
   const order=await db().order.findUnique({where:{id:item.orderId},include:{invoice:{select:{invoiceNumber:true,pdf:true}},lines:{include:{variant:{include:{product:{select:{name:true}}}}}},giftPurchases:{where:{status:"captured"},select:{recipientName:true,amountCents:true}}}});
   const isReceived=item.stage==="received"||item.stage==="received_admin";
   if(!order||order.testOnly||!order.customerEmail||!orderMailStages.includes(item.stage as OrderMailStage)||
      !isReceived&&item.stage!=="failed"&&item.stage!=="cancelled"&&!order.invoice||
      item.stage==="cancelled"&&order.status!=="cancelled"||
      isReceived&&!["payment_authorized","payment_confirmed","preparing","shipped","delivered"].includes(order.status))
    throw new Error("ORDER_NOTIFICATION_NOT_READY");
   const adminCopy=item.stage==="paid_admin"||item.stage==="received_admin";
   const dest=adminCopy?adminOrderNotificationRecipients(store.recipient):order.customerEmail;
   const kind=item.stage as OrderMailStage;
   const bill=order.billingAddress;
   const name=bill&&typeof bill==="object"&&!Array.isArray(bill)?
    String(bill.firstName||"")+" "+String(bill.lastName||""):"";
   await sendStoreOrderMail(kind,dest,{orderNumber:"RH-"+String(order.orderNumber),
    customerName:name.trim(),customerEmail:order.customerEmail,totalCents:order.totalCents,
    items:[...order.lines.map(line=>({name:line.variant.product.name+" "+line.variant.colorLabel+" "+line.variant.lengthLabel,quantity:line.quantity,totalCents:line.lineTotalCents})),
     ...order.giftPurchases.map(g=>({name:"Digitaler Geschenkgutschein für "+g.recipientName,quantity:1,totalCents:g.amountCents}))],
    pickup:order.deliveryMethod==="pickup",digitalOnly:order.lines.length===0&&order.giftPurchases.length>0,
    trackingNumber:order.trackingNumber||undefined,carrier:order.trackingCarrier||undefined},
    item.stage.startsWith("paid")&&order.invoice?{filename:order.invoice.invoiceNumber+".pdf",content:Buffer.from(order.invoice.pdf)}:undefined);
   await db().orderNotification.updateMany({where:{id:item.id,status:"sending"},data:{status:"sent",sentAt:new Date(),lastError:null}});
   sent++;
  }catch(e){
   await db().orderNotification.updateMany({where:{id:item.id,status:"sending"},data:{status:item.attempts>=8?"needs_review":"queued",nextAttemptAt:retryAt(item.attempts+1),lastError:safeError(e)}});
  }
 }
 return {sent};
}

function recipientAddress(v:unknown):ShippingAddress{
 if(!v||typeof v!=="object"||Array.isArray(v))throw new Error("MISSING_SHIPPING_ADDRESS");
 const x=v as Record<string,unknown>;
 if(x.country!=="DE"||!["firstName","lastName","street","postalCode","city"].every(k=>typeof x[k]==="string"))
  throw new Error("INVALID_SHIPPING_ADDRESS");
 return x as ShippingAddress;
}

export async function captureAuthorizedKlarna(orderId:string){
 const order=await db().order.findUnique({where:{id:orderId},include:{shippingJob:{select:{status:true}}}});
 if(!order||order.status!=="payment_authorized"||order.testOnly)return;
 if(order.deliveryMethod==="pickup"&&order.shippingJob?.status!=="pickup_handover")throw new Error("PICKUP_HANDOVER_REQUIRED");
 if(order.shippingJob?.status==="order_cancel_review")throw new Error("ORDER_CANCELLATION_IN_REVIEW");
 const m=/^Klarna authorized: ([0-9a-f-]{36})$/i.exec(order.fulfillmentNote||"");
 if(!m)throw new Error("KLARNA_ORDER_ID_MISSING");
 const gateway=await providerForCheckout("klarna");
 const orderIdAtKlarna=m[1];
 const before=await gateway.api.readOrder(orderIdAtKlarna);
 if(before.order_id!==orderIdAtKlarna||before.order_amount!==order.totalCents||before.purchase_currency!=="EUR")throw new Error("KLARNA_RECONCILIATION_MISMATCH");
 if(!before.captured_amount){
  try{await gateway.api.captureCustomerOrder(orderIdAtKlarna,order.totalCents,order.id)}catch{ /* Read provider again before any retry. */ }
 }
 const checked=await gateway.api.readOrder(orderIdAtKlarna);
 if(checked.captured_amount!==order.totalCents)throw new Error("KLARNA_CAPTURE_NOT_VERIFIED");
 const raw=await gateway.api.readCaptures(orderIdAtKlarna);
 const captures=Array.isArray(raw)?raw:(raw.captures||[]);
 if(captures.length!==1||captures[0].captured_amount!==order.totalCents||!/^[0-9a-f-]{36}$/i.test(captures[0].capture_id))
  throw new Error("KLARNA_CAPTURE_DETAILS_MISMATCH");
 await finishCapturedCustomerOrder(order.id,"klarna",captures[0].capture_id,orderIdAtKlarna);
}

/** Prepare a label only after provider payment or verified Klarna authorization,
 * only when merchant-supplied DHL contract credentials and package weight exist.
 * An ambiguous label response is held for manual reconciliation to avoid buying two labels. */
export async function createQueuedDhlLabels(limit=5){
 if(process.env.RUBY_DHL_LIVE_LABELS_ENABLED!=="true"||process.env.RUBY_DHL_SENDER_APPROVED!=="true")return {created:0,skipped:"DHL_LABELS_DISABLED"};
 const tare=packageTareG();if(tare===null)return {created:0,skipped:"DHL_PACKAGING_WEIGHT_NOT_CONFIGURED"};
 // No retrospective bookings for orders placed before the automation launch.
 // A live label can incur charges; old orders require manual reconciliation.
 const startAt=process.env.RUBY_DHL_AUTOMATION_START_AT||"";
 if(!/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(startAt)||
   !Number.isFinite(Date.parse(startAt)))return {created:0,skipped:"DHL_START_DATE_NOT_SET"};
 const ready=await getDhlIntegrationReadiness("live");
 if(!ready.credentialsComplete)return {created:0,skipped:"DHL_CREDENTIALS_INCOMPLETE"};
 // A newly issued DHL API key may authenticate before the shipping subscription
 // activates. Do not claim jobs or attempt a billable POST until validate=true
 // accepts the current contract and sender template.
 const validation=await validateDhlLiveTemplateOnly();
 if(validation!=="valid")return {created:0,skipped:"DHL_VALIDATION_"+validation.toUpperCase()};
 const rows=await db().shippingJob.findMany({where:{status:"waiting_credentials",trackingNumber:null,labelPdf:null,order:{is:{testOnly:false,deliveryMethod:"dhl",createdAt:{gte:new Date(startAt)},trackingNumber:null,status:{in:["payment_confirmed","payment_authorized","preparing"]}}}},orderBy:{createdAt:"asc"},take:Math.max(1,Math.min(limit,10))});
 let created=0;
 for(const job of rows){
  const order=await db().order.findUnique({where:{id:job.orderId},include:{lines:{select:{quantity:true}},payments:true}});
  if(!order||order.testOnly||order.deliveryMethod!=="dhl"||order.createdAt.getTime()<Date.parse(startAt)||
    !(["payment_confirmed","payment_authorized","preparing"].includes(order.status)))continue;
  if(order.trackingNumber||!order.lines.length||!order.paymentReference||!(order.status==="payment_authorized"?order.paymentReference.startsWith("KLARNA-HPP:")&&/^Klarna authorized: [0-9a-f-]{36}$/i.test(order.fulfillmentNote||""):order.payments.some(p=>p.eventType==="PAYMENT.CAPTURE.COMPLETED"&&p.provider!=="manual"&&p.providerEventId.length>0)))continue;
  let weightG:number;try{weightG=packageWeightG(order.lines,tare)}catch{continue}
  const claim=await db().shippingJob.updateMany({where:{id:job.id,status:"waiting_credentials",trackingNumber:null,labelPdf:null,order:{is:{status:order.status,trackingNumber:null,testOnly:false,deliveryMethod:"dhl"}}},data:{status:"submitting",attemptCount:{increment:1}}});
  if(claim.count!==1)continue;
  try{
   const label=await createDhlShipmentLabel({orderNumber:String(order.orderNumber),recipient:recipientAddress(order.shippingAddress),weightG});
   await db().$transaction(async tx=>{
    const booked=await tx.shippingJob.updateMany({where:{id:job.id,status:"submitting",trackingNumber:null},data:{status:"label_created",trackingNumber:label.trackingNumber,labelPdf:new Uint8Array(label.labelPdf),lastError:null}});
    if(booked.count!==1)throw new Error("DHL_CONCURRENT_UPDATE");
    const updated=await tx.order.updateMany({where:{id:order.id,status:order.status,trackingNumber:null},data:{trackingCarrier:"DHL",trackingNumber:label.trackingNumber}});
    if(updated.count!==1)throw new Error("DHL_ORDER_CHANGED");
   });
   created++;
  }catch(e){
   await db().shippingJob.updateMany({where:{id:job.id,status:"submitting"},data:{status:"needs_review",lastError:safeError(e)}});
   // An unknown carrier response may already have bought a label; do not retry.
  }
 }
 return {created};
}

/** Creating a label is NOT proof of parcel handover. Never capture Klarna here. */
export async function finalizePreparedShippingJobs(limit=5){
 const jobs=await db().shippingJob.findMany({where:{status:"label_created"},take:Math.max(1,Math.min(limit,10)),orderBy:{createdAt:"asc"}});
 let prepared=0;
 for(const job of jobs){
  try{
   const order=await db().order.findUnique({where:{id:job.orderId}});
   if(!order||order.testOnly||order.deliveryMethod!=="dhl"||!job.trackingNumber)continue;
   if(!["payment_authorized","payment_confirmed","preparing"].includes(order.status))continue;
   await db().$transaction(async tx=>{
    if(order.status==="payment_confirmed"){
     const changed=await tx.order.updateMany({where:{id:order.id,status:"payment_confirmed"},data:{status:"preparing"}});
     if(changed.count!==1)throw new Error("FULFILLMENT_CONCURRENCY");
     requireOrderTransition("payment_confirmed","preparing","fulfillment");
     await tx.orderStatusEvent.create({data:{orderId:order.id,fromStatus:"payment_confirmed",toStatus:"preparing",reason:"dhl_label_created_waiting_parcel_handover"}});
     await tx.orderNotification.upsert({where:{orderId_stage:{orderId:order.id,stage:"processing"}},create:{orderId:order.id,stage:"processing"},update:{}});
    }
    // Authorized Klarna orders stay authorized until verified physical handover.
    const changed=await tx.shippingJob.updateMany({where:{id:job.id,status:"label_created",trackingNumber:job.trackingNumber},data:{status:"awaiting_handover"}});
    if(changed.count!==1)throw new Error("DHL_LABEL_STATUS_CONCURRENCY");
   });
   prepared++;
  }catch(e){console.error("SHIPPING_FINALIZE_REQUIRES_REVIEW",safeError(e));}
 }
 return {prepared};
}

// Recover Klarna-authorized orders even if the buyer closed their browser
// before the "after()" callback ran. Deduplicated by (orderId,stage).
export async function queueAuthorizedKlarnaNotifications(limit=10){
 const orders=await db().order.findMany({
  where:{testOnly:false,status:"payment_authorized",customerEmail:{not:null},OR:[
   {notifications:{none:{stage:"received"}}},
   {notifications:{none:{stage:"received_admin"}}}
  ]},
  select:{id:true},orderBy:{createdAt:"asc"},take:Math.max(1,Math.min(limit,20))
 });
 let queued=0;
 for(const order of orders){
  const result=await db().orderNotification.createMany({
   data:[{orderId:order.id,stage:"received"},{orderId:order.id,stage:"received_admin"}],
   skipDuplicates:true
  });
  queued+=result.count;
 }
 return {queued};
}
export async function runCustomerJobs(limit=5){
 const authorized=await queueAuthorizedKlarnaNotifications(limit);
 const result={authorized,emails:await deliverQueuedOrderEmails(limit),labels:await createQueuedDhlLabels(limit),prepared:await finalizePreparedShippingJobs(limit)};
 const afterShipping=await deliverQueuedOrderEmails(limit);result.emails={...result.emails,sent:(result.emails.sent||0)+(afterShipping.sent||0)};
 return result;
}

async function cancelUnpaidCustomerOrder(orderId:string,reference:string,cutoff:Date,notify:boolean){
 const released=await releaseVerifiedUnpaidReservation(db(),orderId,reference,cutoff,notify);
 if(released)try{revalidateTag("rubyhair-live-catalog","max")}catch{/* TTL remains the fallback */}
 return released;
}

/** Expire only provider-verified UNPAID reservations. Never infer no payment from a
 * timeout, a missing callback, a 500 response, or unavailable provider API. */
export async function expireCustomerPaymentReservations(limit=10,options:{releaseOnly?:boolean;dryRun?:boolean}={}){
 const cutoff=new Date();
 const where={testOnly:false,status:"pending_payment",paymentReference:{not:null},...(!options.dryRun?{reservationExpiresAt:{lte:cutoff}}:{})};
 const batchSize=Math.max(1,Math.min(limit,20));
 // Rotate through expired orders so unresolved legacy rows cannot starve new ones.
 const count=await db().order.count({where});
 const pageCount=Math.max(1,Math.ceil(count/batchSize));
 const skip=options.releaseOnly&&!options.dryRun?(Math.floor(cutoff.getTime()/300000)%pageCount)*batchSize:0;
 const orders=await db().order.findMany({where,take:batchSize,skip,orderBy:[{reservationExpiresAt:"asc"},{id:"asc"}]});
 let cancelled=0,reconciled=0,held=0,eligible=0;
 const details:{order:string;provider:string;status:string;releasable:boolean}[]=[];
 for(const order of orders){
  if(!order.paymentReference)continue;
  try{
   if(order.paymentReference.startsWith("KLARNA-HPP:")){
    const sessionId=order.paymentReference.slice("KLARNA-HPP:".length);
    const gateway=await providerForCheckout("klarna");
    const hpp=await gateway.api.readHostedPage(sessionId);
    const releasable=Boolean(order.reservationExpiresAt&&order.reservationExpiresAt<=cutoff&&klarnaReservationReleasable(hpp,sessionId));
    details.push({order:"RH-"+order.orderNumber.toString(),provider:"klarna",status:hpp.status,releasable});
    if(releasable){
     eligible++;if(options.dryRun)continue;
     if(await cancelUnpaidCustomerOrder(order.id,order.paymentReference,cutoff,false))cancelled++;else held++;
    }else if(!options.releaseOnly&&!options.dryRun&&["COMPLETE","COMPLETED"].includes(hpp.status)&&hpp.order_id){
     // A buyer may close their browser after approval; reconcile without relying
     // on the return URL. This verifies HPP and the exact provider order amount.
     try{await (await import("@/lib/customer-order-finalize")).confirmKlarnaCheckout(order.id,sessionId,hpp.order_id);reconciled++}
     catch{held++;/* Preserve reservation if the external result is ambiguous. */}
    }else held++;
    continue;
   }
   const gateway=await providerForCheckout("paypal");
   const status=await gateway.api.getOrder(order.paymentReference) as {status?:string};
   const releasable=Boolean(order.reservationExpiresAt&&order.reservationExpiresAt<=cutoff&&paypalReservationReleasable(status,order.id,order.paymentReference,order.totalCents-order.giftAppliedCents));
   details.push({order:"RH-"+order.orderNumber.toString(),provider:"paypal",status:status.status||"UNKNOWN",releasable});
   if(releasable){
    eligible++;if(options.dryRun)continue;
    if(await cancelUnpaidCustomerOrder(order.id,order.paymentReference,cutoff,false))cancelled++;else held++;
   }else if(!options.releaseOnly&&!options.dryRun&&["APPROVED","COMPLETED"].includes(status.status||"")){
    try{await (await import("@/lib/customer-order-finalize")).finalizePayPalCheckout(order.id,true);reconciled++}
    catch{held++;/* Hold the reservation; provider may be captured already. */}
   }else held++;
  }catch(error){held++;/* External status unknown; never release a possibly paid reservation. */
   const code=error instanceof Error?error.message:"UNKNOWN";
   details.push({order:"RH-"+order.orderNumber.toString(),provider:order.paymentReference.startsWith("KLARNA-")?"klarna":"paypal",status:/^(PAYPAL_REQUEST_FAILED_[0-9]{3}|KLARNA_HTTP_[0-9]{3})$/.test(code)?code:"PROVIDER_UNAVAILABLE",releasable:false});
  }
 }
 return {cancelled,reconciled,held,eligible,checked:orders.length, ...(options.dryRun?{details}: {})};
}
