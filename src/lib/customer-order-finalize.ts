import "server-only";
import {Prisma} from "@prisma/client";
import {getPrisma} from "@/lib/prisma";
import {providerForCheckout,CustomerCheckoutError} from "@/lib/customer-checkout";
import {requireOrderTransition} from "@/lib/order-lifecycle";
import {createCustomerInvoicePdf} from "@/lib/customer-invoice";
import {RUBY_TEST_SELLER} from "@/lib/qa-invoice";

const shape=(v:Prisma.JsonValue):{firstName:string;lastName:string;street:string;postalCode:string;city:string;country:string}=>{
 if(!v||typeof v!=="object"||Array.isArray(v)||
   !["firstName","lastName","street","postalCode","city"].every(k=>typeof v[k]==="string")||v.country!=="DE")
  throw new CustomerCheckoutError("INVALID_STORED_ADDRESS",503);
 return v as ReturnType<typeof shape>;
};
const invoiceNo=(n:bigint,date:Date)=>`RH-${date.getUTCFullYear()}-${String(n).padStart(7,"0")}`;
const validCaptureId=(v:string)=>/^[a-zA-Z0-9_-]{8,90}$/.test(v);

export async function finishCapturedCustomerOrder(orderId:string,provider:"paypal"|"klarna",captureId:string,providerOrderReference:string){
 if(!validCaptureId(captureId))throw new CustomerCheckoutError("INVALID_PROVIDER_CAPTURE",503);
 const db=getPrisma();
 const order=await db.order.findUnique({where:{id:orderId},include:{lines:{include:{variant:{include:{product:true}}}},invoice:true}});
 if(!order||order.testOnly||!order.customerEmail||order.totalCents<100)throw new CustomerCheckoutError("CUSTOMER_ORDER_NOT_FOUND",404);
 if(order.status==="payment_confirmed"&&order.invoice)return {paid:true,invoiceNumber:order.invoice.invoiceNumber};
 if(!["pending_payment","payment_authorized"].includes(order.status))throw new CustomerCheckoutError("CUSTOMER_ORDER_NOT_PENDING",409);
 if(provider==="paypal"&&order.paymentReference!==providerOrderReference)throw new CustomerCheckoutError("PROVIDER_ORDER_REFERENCE_MISMATCH",409);
 if(provider==="klarna"&&!order.paymentReference?.startsWith("KLARNA-HPP:"))throw new CustomerCheckoutError("PROVIDER_ORDER_REFERENCE_MISMATCH",409);
 if(order.lines.some(l=>l.quantity<1||l.unitPriceCents<100))throw new CustomerCheckoutError("STORED_ORDER_LINES_INVALID",503);
 const billing=shape(order.billingAddress),issuedAt=new Date(),number=invoiceNo(order.orderNumber,issuedAt);
 const buyerName=billing.firstName+" "+billing.lastName;
 const invoiceLines=order.lines.map(l=>({description:`${l.variant.product.name} ${l.variant.colorLabel} ${l.variant.lengthLabel}`,
  quantity:l.quantity,unitCents:l.unitPriceCents,totalCents:l.lineTotalCents}));
 const pdf=createCustomerInvoicePdf({
  invoiceNumber:number,issuedAt,orderNumber:String(order.orderNumber),customerName:buyerName,
  customerEmail:order.customerEmail,billingStreet:billing.street,billingPostalCode:billing.postalCode,
  billingCity:billing.city,paymentMethod:provider,paymentReference:providerOrderReference,
  lines:invoiceLines,subtotalCents:order.subtotalCents,shippingCents:order.shippingCents,taxCents:order.taxCents,totalCents:order.totalCents
 });
 try{
  await db.$transaction(async tx=>{
   const changed=await tx.order.updateMany({where:{id:order.id,status:order.status,testOnly:false,totalCents:order.totalCents},
    data:{status:"payment_confirmed",reservationExpiresAt:null}});
   if(changed.count!==1)throw new CustomerCheckoutError("ORDER_CONCURRENCY_REVIEW",409);
   requireOrderTransition(order.status,"payment_confirmed","payment_provider");
   await tx.paymentEvent.create({data:{orderId:order.id,provider,providerEventId:captureId,eventType:"PAYMENT.CAPTURE.COMPLETED"}});
   await tx.orderStatusEvent.create({data:{orderId:order.id,fromStatus:order.status,toStatus:"payment_confirmed",reason:`${provider}_verified_capture`} });
   await tx.invoice.create({data:{orderId:order.id,invoiceNumber:number,issuedAt,
    seller:RUBY_TEST_SELLER,buyer:{name:buyerName,email:order.customerEmail,street:billing.street,zip:billing.postalCode,city:billing.city},
    lines:invoiceLines as Prisma.InputJsonValue,taxRate:19,taxCents:order.taxCents,totalCents:order.totalCents,pdf:new Uint8Array(pdf)}});
   await tx.orderNotification.createMany({data:[{orderId:order.id,stage:"paid"},{orderId:order.id,stage:"paid_admin"}]});
   await tx.shippingJob.upsert({where:{orderId:order.id},create:{orderId:order.id,status:"waiting_credentials"},update:{}});
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:12000});
 }catch(e){
  const existing=await db.invoice.findUnique({where:{orderId:order.id}});
  if(existing)return {paid:true,invoiceNumber:existing.invoiceNumber};
  console.error("CUSTOMER_PAID_ORDER_NEEDS_RECONCILIATION",e instanceof Error?e.name:"unknown");
  throw new CustomerCheckoutError("CAPTURED_BUT_ORDER_NEEDS_RECONCILIATION",503);
 }
 return {paid:true,invoiceNumber:number};
}

/** The only PayPal capture entry: canonical GET after any POST, exact order, exact amount,
 * PayPal idempotency key tied to our order. Safe to call again after a callback timeout. */
export async function finalizePayPalCheckout(orderId:string,allowCapture:boolean,returnToken?:string){
 const db=getPrisma(),order=await db.order.findUnique({where:{id:orderId},include:{invoice:{select:{invoiceNumber:true}}}});
 if(!order||order.testOnly||!order.paymentReference||order.paymentReference.startsWith("KLARNA-"))
  throw new CustomerCheckoutError("PAYPAL_CUSTOMER_ORDER_NOT_FOUND",404);
 if(returnToken!==undefined&&order.paymentReference!==returnToken)throw new CustomerCheckoutError("PAYPAL_RETURN_REFERENCE_MISMATCH",403);
 if(order.status==="payment_confirmed"&&order.invoice)return {paid:true,invoiceNumber:order.invoice.invoiceNumber};
 const gateway=await providerForCheckout("paypal");
 let raw=await gateway.api.getOrder(order.paymentReference) as {status?:string};
 if(raw?.status==="APPROVED"&&allowCapture){
  try{await gateway.api.captureOrder(order.paymentReference,"RH-CAPTURE-"+order.id)}
  catch{/* The provider may have captured before its response was lost. */}
  raw=await gateway.api.getOrder(order.paymentReference) as {status?:string};
 }
 let verified;
 try{verified=gateway.api.requireCompletedCapture(raw,order.id,order.totalCents,order.paymentReference)}
 catch{throw new CustomerCheckoutError("PAYPAL_CAPTURE_NOT_YET_VERIFIED",409)}
 return finishCapturedCustomerOrder(order.id,"paypal",verified.captureId,order.paymentReference);
}

export async function confirmKlarnaCheckout(orderId:string,hppSessionId:string,providerOrderId:string){
 const db=getPrisma(),order=await db.order.findUnique({where:{id:orderId}});
 if(!order||order.testOnly||order.paymentReference!=="KLARNA-HPP:"+hppSessionId)
  throw new CustomerCheckoutError("KLARNA_ORDER_NOT_PENDING",409);
 if(["payment_authorized","payment_confirmed","preparing"].includes(order.status))return {authorized:true};
 if(order.status!=="pending_payment")throw new CustomerCheckoutError("KLARNA_ORDER_NOT_PENDING",409);
 const gateway=await providerForCheckout("klarna");
 const hpp=await gateway.api.readHostedPage(hppSessionId);
 if(hpp.status!=="COMPLETED"&&hpp.status!=="COMPLETE")throw new CustomerCheckoutError("KLARNA_HPP_NOT_COMPLETED",409);
 if(!hpp.order_id||hpp.order_id!==providerOrderId)throw new CustomerCheckoutError("KLARNA_EXTERNAL_ORDER_MISMATCH",409);
 const external=await gateway.api.readOrder(providerOrderId);
 if(external.order_id!==providerOrderId||external.order_amount!==order.totalCents||external.purchase_currency!=="EUR")
  throw new CustomerCheckoutError("KLARNA_AMOUNT_MISMATCH",409);
 await db.$transaction(async tx=>{
  const changed=await tx.order.updateMany({where:{id:order.id,status:"pending_payment",testOnly:false},data:{status:"payment_authorized",fulfillmentNote:"Klarna authorized: "+providerOrderId}});
  if(changed.count!==1)throw new CustomerCheckoutError("KLARNA_AUTH_CONCURRENCY",409);
  requireOrderTransition("pending_payment","payment_authorized","payment_provider");
  await tx.orderStatusEvent.create({data:{orderId:order.id,fromStatus:"pending_payment",toStatus:"payment_authorized",reason:"klarna_hpp_verified_authorized"}});
  await tx.orderNotification.createMany({data:[{orderId:order.id,stage:"received"},{orderId:order.id,stage:"received_admin"}],skipDuplicates:true});
  await tx.shippingJob.upsert({where:{orderId:order.id},create:{orderId:order.id,status:"waiting_credentials"},update:{}});
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:10000});
 return {authorized:true};
}
