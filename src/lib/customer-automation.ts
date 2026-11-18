import "server-only";
import {getPrisma} from "@/lib/prisma";
import {getDhlIntegrationReadiness} from "@/lib/dhl-api";
import {createDhlShipmentLabel,type ShippingAddress} from "@/lib/dhl-labels";
import {sendStoreOrderMail} from "@/lib/store-mail-transport";
import {loadStoreMailSettings} from "@/lib/store-mail-settings";
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
   const order=await db().order.findUnique({where:{id:item.orderId},include:{invoice:{select:{invoiceNumber:true,pdf:true}}}});
   if(!order||order.testOnly||!order.customerEmail||!(["paid","paid_admin","processing","shipped","delivered","failed"].includes(item.stage))||item.stage!=="failed"&&!order.invoice)
    throw new Error("ORDER_NOTIFICATION_NOT_READY");
   const adminCopy=item.stage==="paid_admin";
   const dest=adminCopy?store.recipient:order.customerEmail;
   const kind=adminCopy?"paid":item.stage as "paid"|"processing"|"shipped"|"delivered"|"failed";
   const bill=order.billingAddress;
   const name=bill&&typeof bill==="object"&&!Array.isArray(bill)?
    String(bill.firstName||"")+" "+String(bill.lastName||""):"";
   await sendStoreOrderMail(kind,dest,{orderNumber:"RH-"+String(order.orderNumber),
    customerName:name.trim(),totalCents:order.totalCents,
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

async function captureAuthorizedKlarna(orderId:string){
 const order=await db().order.findUnique({where:{id:orderId}});
 if(!order||order.status!=="payment_authorized"||order.testOnly)return;
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
 if(process.env.RUBY_DHL_LIVE_LABELS_ENABLED!=="true"||!process.env.RUBY_DHL_WEIGHT_G)return {created:0,skipped:"DHL_LABELS_DISABLED"};
 const ready=await getDhlIntegrationReadiness("live");
 if(!ready.credentialsComplete)return {created:0,skipped:"DHL_CREDENTIALS_INCOMPLETE"};
 const rows=await db().shippingJob.findMany({where:{status:"waiting_credentials"},orderBy:{createdAt:"asc"},take:Math.max(1,Math.min(limit,10))});
 let created=0;
 for(const job of rows){
  const order=await db().order.findUnique({where:{id:job.orderId}});
  if(!order||order.testOnly||!(["payment_confirmed","payment_authorized"].includes(order.status)))continue;
  const claim=await db().shippingJob.updateMany({where:{id:job.id,status:"waiting_credentials",trackingNumber:null},data:{status:"submitting",attemptCount:{increment:1}}});
  if(claim.count!==1)continue;
  try{
   const label=await createDhlShipmentLabel({orderNumber:String(order.orderNumber),recipient:recipientAddress(order.shippingAddress)});
   await db().$transaction(async tx=>{
    await tx.shippingJob.update({where:{id:job.id},data:{status:"label_created",trackingNumber:label.trackingNumber,labelPdf:new Uint8Array(label.labelPdf),lastError:null}});
    await tx.order.update({where:{id:order.id},data:{trackingCarrier:"DHL",trackingNumber:label.trackingNumber}});
   });
   created++;
  }catch(e){
   await db().shippingJob.updateMany({where:{id:job.id,status:"submitting"},data:{status:"needs_review",lastError:safeError(e)}});
   // An unknown carrier response may already have bought a label; do not retry.
  }
 }
 return {created};
}

export async function finalizePreparedShippingJobs(limit=5){
 const jobs=await db().shippingJob.findMany({where:{status:"label_created"},take:Math.max(1,Math.min(limit,10)),orderBy:{createdAt:"asc"}});
 let prepared=0;
 for(const job of jobs){
  try{
   const order=await db().order.findUnique({where:{id:job.orderId}});
   if(!order||order.testOnly||!job.trackingNumber)continue;
   if(order.status==="payment_authorized")await captureAuthorizedKlarna(order.id);
   const newOrder=await db().order.findUnique({where:{id:order.id}});
   if(!newOrder||newOrder.status!=="payment_confirmed")continue;
   await db().$transaction(async tx=>{
    const changed=await tx.order.updateMany({where:{id:order.id,status:"payment_confirmed"},data:{status:"preparing"}});
    if(changed.count!==1)throw new Error("FULFILLMENT_CONCURRENCY");
    requireOrderTransition("payment_confirmed","preparing","fulfillment");
    await tx.orderStatusEvent.create({data:{orderId:order.id,fromStatus:"payment_confirmed",toStatus:"preparing",reason:"dhl_label_created_waiting_parcel_handover"}});
    await tx.orderNotification.upsert({where:{orderId_stage:{orderId:order.id,stage:"processing"}},create:{orderId:order.id,stage:"processing"},update:{}});
    await tx.shippingJob.update({where:{id:job.id},data:{status:"awaiting_handover"}});
   });
   prepared++;
  }catch(e){console.error("SHIPPING_FINALIZE_REQUIRES_REVIEW",safeError(e));}
 }
 return {prepared};
}

export async function runCustomerJobs(limit=5){
 const result={emails:await deliverQueuedOrderEmails(limit),labels:await createQueuedDhlLabels(limit),prepared:await finalizePreparedShippingJobs(limit)};
 const afterShipping=await deliverQueuedOrderEmails(limit);result.emails={...result.emails,sent:(result.emails.sent||0)+(afterShipping.sent||0)};
 return result;
}

async function cancelUnpaidCustomerOrder(orderId:string){
 const order=await db().order.findUnique({where:{id:orderId},include:{lines:true}});
 if(!order||order.testOnly||order.status!=="pending_payment")return false;
 return db().$transaction(async tx=>{
  const changed=await tx.order.updateMany({where:{id:orderId,status:"pending_payment",testOnly:false},data:{status:"cancelled",reservationExpiresAt:null}});
  if(changed.count!==1)return false;
  for(const line of order.lines){
   // Only return units that were actually decremented when the order was placed.
   if(!line.stockReserved)continue;
   await tx.variant.updateMany({where:{id:line.variantId,stockQuantity:{not:null}},data:{stockQuantity:{increment:line.quantity}}});
  }
  await tx.orderStatusEvent.create({data:{orderId,fromStatus:"pending_payment",toStatus:"cancelled",reason:"verified_unpaid_payment_timeout"}});
  await tx.orderNotification.upsert({where:{orderId_stage:{orderId,stage:"failed"}},create:{orderId,stage:"failed"},update:{}});
  return true;
 });
}

/** Expire only provider-verified UNPAID reservations. Never infer no payment from a
 * timeout, a missing callback, a 500 response, or unavailable provider API. */
export async function expireCustomerPaymentReservations(limit=10){
 const orders=await db().order.findMany({where:{testOnly:false,status:"pending_payment",reservationExpiresAt:{lt:new Date()}},
  take:Math.max(1,Math.min(limit,20)),orderBy:{reservationExpiresAt:"asc"}});
 let cancelled=0,reconciled=0;
 for(const order of orders){
  if(!order.paymentReference)continue;
  try{
   if(order.paymentReference.startsWith("KLARNA-HPP:")){
    const sessionId=order.paymentReference.slice("KLARNA-HPP:".length);
    const gateway=await providerForCheckout("klarna");
    const hpp=await gateway.api.readHostedPage(sessionId);
    if(["CANCELLED","FAILED","EXPIRED"].includes(hpp.status)){
     if(await cancelUnpaidCustomerOrder(order.id))cancelled++;
    }
    // COMPLETE sessions must be reconciled against the provider, not cancelled.
    continue;
   }
   const gateway=await providerForCheckout("paypal");
   const status=await gateway.api.getOrder(order.paymentReference) as {status?:string};
   if(["CREATED","PAYER_ACTION_REQUIRED","SAVED","VOIDED"].includes(status.status||"")){
    if(await cancelUnpaidCustomerOrder(order.id))cancelled++;
   }else if(["APPROVED","COMPLETED"].includes(status.status||"")){
    try{await (await import("@/lib/customer-order-finalize")).finalizePayPalCheckout(order.id,true);reconciled++}
    catch{/* Hold the reservation; provider may be captured already. */}
   }
  }catch{/* External status unknown; never release a possibly paid reservation. */}
 }
 return {cancelled,reconciled};
}
