import "server-only";
import {randomUUID} from "node:crypto";
import {Prisma} from "@prisma/client";
import {getPrisma} from "@/lib/prisma";
import {PaypalClient} from "@/lib/paypal-provider-core";
import {loadPaymentValue} from "@/lib/payment-secrets";
import {QA_PRODUCT_SLUG,QA_PRICE_CENTS} from "@/lib/internal-test-product";
import {RUBY_TEST_SELLER,QA_INVOICE_TAX_CENTS,QA_INVOICE_TAX_RATE,qaInvoiceNumber,buildOneEuroInvoicePdf} from "@/lib/qa-invoice";
import {requireOrderTransition} from "@/lib/order-lifecycle";

const QA_PAYMENT_LIMIT=100;
const paypalId=/^[A-Za-z0-9_-]{8,60}$/;
export const QA_EMAIL_REGEX=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export class QaPaymentError extends Error{
 constructor(public readonly reason:string){super(reason);this.name="QaPaymentError"}
}
async function client(){
 const [clientId,clientSecret,webhookId]=await Promise.all([
  loadPaymentValue("paypal","live","clientId"),loadPaymentValue("paypal","live","clientSecret"),loadPaymentValue("paypal","live","webhookId")
 ]);
 if(!clientId||!clientSecret||!webhookId)throw new QaPaymentError("PAYPAL_KEYS_MISSING");
 return new PaypalClient("live",{clientId,clientSecret,webhookId});
}
export type QaBuyer={name:string;email:string;confirmedSeller:boolean;confirmedTax:boolean;confirmedCharge:boolean};
function validateBuyer(input:QaBuyer){
 if(!input.confirmedSeller||!input.confirmedTax||!input.confirmedCharge)throw new QaPaymentError("MERCHANT_CONFIRMATION_REQUIRED");
 if(input.name.trim().length<2||input.name.length>100||/[\r\n<>]/.test(input.name))throw new QaPaymentError("INVALID_NAME");
 if(!QA_EMAIL_REGEX.test(input.email)||input.email.length>254||/[\r\n]/.test(input.email))throw new QaPaymentError("INVALID_EMAIL");
 return {name:input.name.trim(),email:input.email.trim().toLowerCase()};
}
/** Creates ONE pending 1 EUR order, with a stock hold, before redirecting to PayPal.
 * Actual money is captured only by a second explicit authenticated action.
 */
export async function beginOneEuroQaPayment(input:QaBuyer):Promise<string>{
 const buyer=validateBuyer(input);
 const api=await client();
 const db=getPrisma();
 const order=await db.$transaction(async tx=>{
  const existing=await tx.order.count({where:{testOnly:true,status:{in:["pending_payment","payment_confirmed","preparing","shipped","delivered"]}}});
  if(existing)throw new QaPaymentError("QA_ORDER_ALREADY_EXISTS");
  const p=await tx.product.findUnique({where:{slug:QA_PRODUCT_SLUG},include:{variants:true}});
  if(!p||p.active||p.material!=="INTERNAL_QA"||p.currency!=="EUR")throw new QaPaymentError("QA_ITEM_NOT_HIDDEN");
  if(p.variants.length!==1||p.variants[0].active||p.variants[0].priceCents!==QA_PRICE_CENTS)throw new QaPaymentError("QA_VARIANT_UNSAFE");
  const variant=p.variants[0];
  const stock=await tx.variant.updateMany({where:{id:variant.id,active:false,stockQuantity:{gte:1}},data:{stockQuantity:{decrement:1}}});
  if(stock.count!==1)throw new QaPaymentError("QA_ITEM_UNAVAILABLE");
  return tx.order.create({data:{
   status:"pending_payment",currency:"EUR",testOnly:true,subtotalCents:QA_PAYMENT_LIMIT,
   shippingCents:0,taxCents:QA_INVOICE_TAX_CENTS,totalCents:QA_PAYMENT_LIMIT,
   reservationKey:randomUUID(),reservationExpiresAt:new Date(Date.now()+2*60*60*1000),
   customerEmail:buyer.email,
   billingAddress:{buyerName:buyer.name,confirmedSeller:true,confirmedTaxRate:QA_INVOICE_TAX_RATE} as Prisma.InputJsonValue,
   shippingAddress:Prisma.JsonNull,
   lines:{create:[{variantId:variant.id,quantity:1,unitPriceCents:QA_PRICE_CENTS,lineTotalCents:QA_PRICE_CENTS}]},
   statusEvents:{create:{fromStatus:null,toStatus:"pending_payment",reason:"merchant_qa_live_1eur"}}
  }});
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:10000});
 try{
  const paypal=await api.createOneEuroQaOrder({
   orderId:order.id,
   invoiceId:qaInvoiceNumber(order.orderNumber,new Date()),
   requestId:"QA-CREATE-"+order.id,
   returnUrl:"https://rubyhair.de/qa/paypal/return",
   cancelUrl:"https://rubyhair.de/qa/paypal/return?cancel=1"
  });
  const updated=await db.order.updateMany({where:{id:order.id,testOnly:true,status:"pending_payment",paymentReference:null},data:{paymentReference:paypal.id}});
  if(updated.count!==1)throw new QaPaymentError("QA_PAYMENT_REFERENCE_STORE_FAILED");
  return paypal.approvalUrl;
 }catch(error){
  // If payment order creation failed or ID storage failed, we do not capture.
  // Retain the pending order if external PayPal order might exist; an admin can
  // cancel after checking PayPal status. Never silently release reserved stock.
  console.error("RUBY_QA_PAYPAL_CREATE_PENDING_REVIEW",{category:error instanceof Error?error.name:"unknown"});
  throw new QaPaymentError("QA_START_FAILED_REVIEW_PENDING_ORDER");
 }
}

/** Confirm a returned live test purchase with PayPal. No money is taken on GET.
 * Replays are idempotent: completed orders only return the stored invoice.
 */
export async function confirmOneEuroQaPayment(paypalOrderId:string){
 if(!paypalId.test(paypalOrderId))throw new QaPaymentError("INVALID_PAYPAL_ID");
 const db=getPrisma();
 const order=await db.order.findFirst({where:{paymentReference:paypalOrderId,testOnly:true},include:{lines:true,invoice:true}});
 if(!order||order.totalCents!==QA_PAYMENT_LIMIT||order.currency!=="EUR"||order.shippingCents!==0||order.taxCents!==QA_INVOICE_TAX_CENTS||order.lines.length!==1)
   throw new QaPaymentError("QA_ORDER_MISMATCH");
 if(order.status==="payment_confirmed"&&order.invoice)return {orderId:order.id,invoiceId:order.invoice.id,alreadyCaptured:true};
 if(order.status!=="pending_payment")throw new QaPaymentError("QA_ORDER_NOT_PENDING");
 const api=await client();
 let raw:unknown;
 try{raw=await api.captureOrder(paypalOrderId,"QA-CAPTURE-"+order.id)}
 catch(error){
  // A timeout can happen *after* PayPal captured the EUR 1.00. Check the
  // authoritative order before treating this as a failed payment.
  try{raw=await api.getOrder(paypalOrderId)}
  catch{throw new QaPaymentError("PAYPAL_CAPTURE_STATUS_UNKNOWN_RETRY");}
 }
 let paid;
 try{paid=api.requireCompletedCapture(raw,order.id,QA_PAYMENT_LIMIT,paypalOrderId)}
 catch{throw new QaPaymentError("PAYPAL_CAPTURE_NOT_VERIFIED");}
 const buyer=order.billingAddress;
 if(!buyer||typeof buyer!=="object"||Array.isArray(buyer)||
   buyer.confirmedSeller!==true||buyer.confirmedTaxRate!==QA_INVOICE_TAX_RATE||
   typeof buyer.buyerName!=="string"||!order.customerEmail)throw new QaPaymentError("QA_INVOICE_CUSTOMER_INCOMPLETE");
 const issuedAt=new Date();
 const invoiceNumber=qaInvoiceNumber(order.orderNumber,issuedAt);
 const pdf=buildOneEuroInvoicePdf({invoiceNumber,issuedAt,orderNumber:order.orderNumber,buyerName:buyer.buyerName,buyerEmail:order.customerEmail,captureId:paid.captureId});
 try{
  const result=await db.$transaction(async tx=>{
   const changed=await tx.order.updateMany({where:{id:order.id,testOnly:true,status:"pending_payment",paymentReference:paypalOrderId,totalCents:QA_PAYMENT_LIMIT},data:{status:"payment_confirmed",reservationExpiresAt:null}});
   if(changed.count!==1)throw new QaPaymentError("QA_CAPTURE_RACE_RETRY");
   requireOrderTransition("pending_payment","payment_confirmed","payment_provider");
   await tx.paymentEvent.create({data:{orderId:order.id,provider:"paypal",providerEventId:paid.captureId,eventType:"PAYMENT.CAPTURE.COMPLETED"}});
   await tx.orderStatusEvent.create({data:{orderId:order.id,fromStatus:"pending_payment",toStatus:"payment_confirmed",reason:"paypal_live_capture_exact_1eur"}});
   return tx.invoice.create({data:{orderId:order.id,invoiceNumber,issuedAt,seller:RUBY_TEST_SELLER,buyer:{name:buyer.buyerName,email:order.customerEmail},lines:[{description:"Interner PayPal-Testkauf (keine Warenlieferung)",qty:1,totalCents:100}],taxRate:QA_INVOICE_TAX_RATE,taxCents:QA_INVOICE_TAX_CENTS,totalCents:100,pdf:new Uint8Array(pdf)}});
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:10000});
  return {orderId:order.id,invoiceId:result.id,alreadyCaptured:false};
 }catch(error){
  const existing=await db.invoice.findUnique({where:{orderId:order.id}});
  if(existing)return {orderId:order.id,invoiceId:existing.id,alreadyCaptured:true};
  console.error("RUBY_QA_CAPTURED_BUT_RECORD_NOT_COMPLETE",{category:error instanceof Error?error.name:"unexpected"});
  throw new QaPaymentError("PAYPAL_CAPTURED_ACCOUNTING_RECONCILIATION_REQUIRED");
 }
}

/** Abandon a test order only when PayPal has not captured it. */
export async function cancelPendingOneEuroQaOrder(orderId:string){
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(orderId))throw new QaPaymentError("INVALID_ORDER_ID");
 const db=getPrisma();
 const order=await db.order.findUnique({where:{id:orderId},include:{lines:true}});
 if(!order||!order.testOnly||order.status!=="pending_payment"||order.lines.length!==1)throw new QaPaymentError("QA_CANCEL_NOT_ALLOWED");
 if(order.paymentReference){
  const api=await client();
  const raw=await api.getOrder(order.paymentReference) as {status?:string};
  if(raw?.status==="COMPLETED"||raw?.status==="APPROVED")throw new QaPaymentError("QA_PAYPAL_STATUS_NEEDS_CAPTURE_REVIEW");
  if(!["CREATED","PAYER_ACTION_REQUIRED","SAVED","VOIDED"].includes(raw?.status||""))throw new QaPaymentError("QA_PAYPAL_STATUS_UNKNOWN");
 }
 await db.$transaction(async tx=>{
  const changed=await tx.order.updateMany({where:{id:order.id,status:"pending_payment",testOnly:true},data:{status:"cancelled",reservationExpiresAt:null}});
  if(changed.count!==1)throw new QaPaymentError("QA_CANCEL_RACE");
  const stock=await tx.variant.updateMany({where:{id:order.lines[0].variantId,stockQuantity:{not:null}},data:{stockQuantity:{increment:1}}});
  if(stock.count!==1)throw new QaPaymentError("QA_STOCK_RECONCILIATION_REQUIRED");
  await tx.orderStatusEvent.create({data:{orderId:order.id,fromStatus:"pending_payment",toStatus:"cancelled",reason:"qa_cancelled_after_paypal_status_check"}});
 });
}
