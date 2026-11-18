import "server-only";
import {randomUUID} from "node:crypto";
import {Prisma} from "@prisma/client";
import {getPrisma} from "@/lib/prisma";
import {loadPaymentValue} from "@/lib/payment-secrets";
import {PaypalClient} from "@/lib/paypal-provider-core";
import {QA_EMAIL_REGEX} from "@/lib/qa-live-paypal";
import {RUBY_TEST_SELLER,QA_INVOICE_TAX_CENTS,QA_INVOICE_TAX_RATE,qaInvoiceNumber,buildOneEuroInvoicePdf} from "@/lib/qa-invoice";
import {requireOrderTransition} from "@/lib/order-lifecycle";

/**
 * ONE existing live catalog variation, temporarily marked as a merchant-only
 * 1 EUR no-shipping test. This does NOT authorize the ordinary public checkout.
 * The real price is restored only after verified capture or a provider-verified
 * cancellation. Never automatically release a pending externally approved order.
 */
export const VARIANT_TEST_LEGACY_ID=886;
export const VARIANT_TEST_PRODUCT="tape-in-extensions";
export const VARIANT_TEST_COLOR="4";
export const VARIANT_TEST_LENGTH="45-50-cm";
export const VARIANT_TEST_ORIGINAL_CENTS=14000;
export const VARIANT_TEST_CENTS=100;

export class VariantTestError extends Error{
 constructor(public readonly reason:string){super(reason);this.name="VariantTestError";}
}

async function paypalClient(){
 const [clientId,clientSecret,webhookId]=await Promise.all([
  loadPaymentValue("paypal","live","clientId"),
  loadPaymentValue("paypal","live","clientSecret"),
  loadPaymentValue("paypal","live","webhookId")
 ]);
 if(!clientId||!clientSecret||!webhookId)throw new VariantTestError("PAYPAL_NOT_CONFIGURED");
 return new PaypalClient("live",{clientId,clientSecret,webhookId});
}

const openStates=["pending_payment","payment_confirmed","preparing","shipped","delivered"];

export async function getVariantTestState(){
 const db=getPrisma();
 const variant=await db.variant.findUnique({
  where:{legacyId:VARIANT_TEST_LEGACY_ID},include:{product:{select:{slug:true,active:true}}}
 });
 if(!variant||variant.product.slug!==VARIANT_TEST_PRODUCT)return {ready:false,pending:null,completed:null,priceCents:null};
 const orders=await db.order.findMany({
  where:{testOnly:true,lines:{some:{variantId:variant.id}}},
  select:{id:true,status:true,paymentReference:true,orderNumber:true,invoice:{select:{invoiceNumber:true}}},
  orderBy:{createdAt:"desc"},take:5
 });
 const pending=orders.find(x=>x.status==="pending_payment")||null;
 const completed=orders.find(x=>x.status==="payment_confirmed")||null;
 return {
  ready:variant.active&&variant.product.active&&variant.colorCode===VARIANT_TEST_COLOR&&
   variant.lengthCode===VARIANT_TEST_LENGTH&&variant.priceCents===VARIANT_TEST_CENTS&&variant.stockQuantity===1,
  pending,completed,priceCents:variant.priceCents
 };
}

type Buyer={name:string;email:string;confirmedSeller:boolean;confirmedTax:boolean;confirmedCharge:boolean};
export async function beginVariantTest(input:Buyer){
 if(!input.confirmedSeller||!input.confirmedTax||!input.confirmedCharge)throw new VariantTestError("EXPLICIT_BUYER_CONFIRMATION_REQUIRED");
 if(input.name.trim().length<2||input.name.length>100||/[\r\n<>]/.test(input.name))throw new VariantTestError("BUYER_NAME_INVALID");
 if(!QA_EMAIL_REGEX.test(input.email)||input.email.length>254)throw new VariantTestError("BUYER_EMAIL_INVALID");
 // Provider authentication first, before creating any order or reserving stock.
 const api=await paypalClient();
 const db=getPrisma();
 const order=await db.$transaction(async tx=>{
  const variant=await tx.variant.findUnique({where:{legacyId:VARIANT_TEST_LEGACY_ID},include:{product:true}});
  if(!variant||!variant.active||!variant.product.active||variant.product.slug!==VARIANT_TEST_PRODUCT||
   variant.colorCode!==VARIANT_TEST_COLOR||variant.lengthCode!==VARIANT_TEST_LENGTH||
   variant.priceCents!==VARIANT_TEST_CENTS||variant.stockQuantity!==1)
   throw new VariantTestError("TEST_VARIATION_NOT_PREPARED");
  const existing=await tx.order.count({where:{testOnly:true,lines:{some:{variantId:variant.id}},status:{in:openStates}}});
  if(existing>0)throw new VariantTestError("VARIANT_TEST_ALREADY_PENDING_OR_COMPLETED");
  const reserved=await tx.variant.updateMany({
   where:{id:variant.id,active:true,priceCents:VARIANT_TEST_CENTS,stockQuantity:1},
   data:{stockQuantity:{decrement:1}}
  });
  if(reserved.count!==1)throw new VariantTestError("VARIANT_TEST_STOCK_RACE");
  return tx.order.create({data:{
   testOnly:true,status:"pending_payment",currency:"EUR",subtotalCents:100,shippingCents:0,
   taxCents:QA_INVOICE_TAX_CENTS,totalCents:100,
   customerEmail:input.email.trim().toLowerCase(),
   billingAddress:{
    buyerName:input.name.trim(),confirmedSeller:true,confirmedTaxRate:QA_INVOICE_TAX_RATE,
    variantTest:true,originalPriceCents:VARIANT_TEST_ORIGINAL_CENTS,originalStockNull:true,
    noShipping:true
   } as Prisma.InputJsonValue,
   shippingAddress:Prisma.JsonNull,
   reservationKey:randomUUID(),reservationExpiresAt:new Date(Date.now()+2*60*60*1000),
   lines:{create:[{variantId:variant.id,quantity:1,unitPriceCents:100,lineTotalCents:100}]},
   statusEvents:{create:{fromStatus:null,toStatus:"pending_payment",reason:"merchant_existing_variant_1eur_no_delivery_test"}}
  }});
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:10000});
 try{
  const external=await api.createOneEuroQaOrder({
   orderId:order.id,invoiceId:qaInvoiceNumber(order.orderNumber,new Date()),
   requestId:"VARIANT-QA-CREATE-"+order.id,
   returnUrl:"https://rubyhair.de/qa/paypal/return?variantTest=1",
   cancelUrl:"https://rubyhair.de/qa/paypal/return?variantTest=1&cancel=1"
  });
  const stored=await db.order.updateMany({where:{id:order.id,testOnly:true,status:"pending_payment",paymentReference:null},data:{paymentReference:external.id}});
  if(stored.count!==1)throw new VariantTestError("PAYPAL_REFERENCE_STORE_FAILED");
  return external.approvalUrl;
 }catch(e){
  console.error("RUBY_VARIANT_TEST_ORDER_REQUIRES_REVIEW",e instanceof Error?e.name:"unknown");
  // Never silently release inventory after an ambiguous PayPal create response.
  throw new VariantTestError("PAYPAL_ORDER_CREATION_REQUIRES_REVIEW");
 }
}

function ensureTestOrder(order:{
 totalCents:number;currency:string;shippingCents:number;taxCents:number;billingAddress:Prisma.JsonValue;
 lines:{quantity:number;unitPriceCents:number;lineTotalCents:number;variant:{legacyId:number|null}}[];
}){
 if(order.totalCents!==100||order.currency!=="EUR"||order.shippingCents!==0||order.taxCents!==16||
  order.lines.length!==1||order.lines[0].variant.legacyId!==VARIANT_TEST_LEGACY_ID||
  order.lines[0].quantity!==1||order.lines[0].unitPriceCents!==100||order.lines[0].lineTotalCents!==100)
  throw new VariantTestError("TEST_ORDER_AMOUNT_OR_VARIANT_MISMATCH");
 const b=order.billingAddress;
 if(!b||typeof b!=="object"||Array.isArray(b)||b.variantTest!==true||
  b.confirmedSeller!==true||b.confirmedTaxRate!==19||b.originalPriceCents!==VARIANT_TEST_ORIGINAL_CENTS||
  b.originalStockNull!==true||b.noShipping!==true||typeof b.buyerName!=="string")
  throw new VariantTestError("TEST_ORDER_BUYER_INVALID");
 return b.buyerName;
}

export async function captureVariantTest(paypalOrderId:string){
 if(!/^[A-Za-z0-9_-]{8,60}$/.test(paypalOrderId))throw new VariantTestError("PAYPAL_ID_INVALID");
 const db=getPrisma();
 const order=await db.order.findFirst({
  where:{testOnly:true,paymentReference:paypalOrderId,lines:{some:{variant:{legacyId:VARIANT_TEST_LEGACY_ID}}}},
  include:{lines:{include:{variant:true}},invoice:true}
 });
 if(!order)throw new VariantTestError("VARIANT_TEST_ORDER_NOT_FOUND");
 const buyerName=ensureTestOrder(order);
 if(order.status==="payment_confirmed"&&order.invoice)return {paid:true,orderId:order.id,invoiceNumber:order.invoice.invoiceNumber};
 if(order.status!=="pending_payment"||!order.customerEmail)throw new VariantTestError("VARIANT_TEST_ORDER_NOT_PENDING");
 const api=await paypalClient();
 let raw:unknown;
 try{raw=await api.captureOrder(paypalOrderId,"VARIANT-QA-CAPTURE-"+order.id)}
 catch{
  try{raw=await api.getOrder(paypalOrderId)}
  catch{throw new VariantTestError("PROVIDER_CAPTURE_STATUS_UNKNOWN");}
 }
 let captured;
 try{captured=api.requireCompletedCapture(raw,order.id,100,paypalOrderId)}
 catch{throw new VariantTestError("PAYPAL_PAYMENT_NOT_VERIFIED");}
 const issuedAt=new Date(),invoiceNumber=qaInvoiceNumber(order.orderNumber,issuedAt);
 const pdf=buildOneEuroInvoicePdf({
  invoiceNumber,issuedAt,orderNumber:order.orderNumber,buyerName,buyerEmail:order.customerEmail,
  captureId:captured.captureId,provider:"paypal",itemDescription:"Tape-in Extensions Farbe 4 / 45-50 cm (TEST)"
 });
 try{
  const result=await db.$transaction(async tx=>{
   const changed=await tx.order.updateMany({
    where:{id:order.id,testOnly:true,status:"pending_payment",paymentReference:paypalOrderId,totalCents:100},
    data:{status:"payment_confirmed",reservationExpiresAt:null}
   });
   if(changed.count!==1)throw new VariantTestError("CAPTURE_CONCURRENCY_RECONCILE");
   requireOrderTransition("pending_payment","payment_confirmed","payment_provider");
   await tx.paymentEvent.create({data:{
    orderId:order.id,provider:"paypal",providerEventId:captured.captureId,eventType:"PAYMENT.CAPTURE.COMPLETED"
   }});
   await tx.orderStatusEvent.create({data:{orderId:order.id,fromStatus:"pending_payment",toStatus:"payment_confirmed",reason:"live_variant_test_verified_paypal_1eur_no_shipping"}});
   // Restore public catalog price and original NULL stock in the SAME transaction.
   const restored=await tx.variant.updateMany({
    where:{id:order.lines[0].variantId,active:true,priceCents:100,stockQuantity:0},
    data:{priceCents:VARIANT_TEST_ORIGINAL_CENTS,stockQuantity:null}
   });
   if(restored.count!==1)throw new VariantTestError("CATALOG_RESTORE_REQUIRES_REVIEW");
   return tx.invoice.create({data:{
    orderId:order.id,invoiceNumber,issuedAt,seller:RUBY_TEST_SELLER,
    buyer:{name:buyerName,email:order.customerEmail},
    lines:[{description:"Tape-in Extensions Farbe 4, 45–50 cm (interner Test, keine Lieferung)",qty:1,totalCents:100}],
    taxRate:QA_INVOICE_TAX_RATE,taxCents:QA_INVOICE_TAX_CENTS,totalCents:100,pdf:new Uint8Array(pdf)
   }});
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:10000});
  return {paid:true,orderId:order.id,invoiceNumber:result.invoiceNumber};
 }catch(e){
  const existing=await db.invoice.findUnique({where:{orderId:order.id}});
  if(existing)return {paid:true,orderId:order.id,invoiceNumber:existing.invoiceNumber};
  console.error("RUBY_VARIANT_TEST_CAPTURED_RECONCILIATION",e instanceof Error?e.name:"unknown");
  throw new VariantTestError("CAPTURED_PAYMENT_REQUIRES_MANUAL_RECONCILIATION");
 }
}

export async function cancelVariantTest(orderId:string){
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(orderId))throw new VariantTestError("ORDER_ID_INVALID");
 const db=getPrisma();
 const order=await db.order.findUnique({where:{id:orderId},include:{lines:{include:{variant:true}}}});
 if(!order||!order.testOnly||order.status!=="pending_payment"||order.lines.length!==1)
  throw new VariantTestError("CANCELLATION_NOT_ALLOWED");
 ensureTestOrder(order);
 if(order.paymentReference){
  const api=await paypalClient();
  const raw=await api.getOrder(order.paymentReference) as {status?:string};
  if(!["CREATED","PAYER_ACTION_REQUIRED","SAVED","VOIDED"].includes(raw?.status||""))
   throw new VariantTestError("EXTERNAL_PAYMENT_RECONCILIATION_REQUIRED");
 }
 await db.$transaction(async tx=>{
  const updated=await tx.order.updateMany({where:{id:order.id,status:"pending_payment",testOnly:true},data:{status:"cancelled",reservationExpiresAt:null}});
  if(updated.count!==1)throw new VariantTestError("CANCEL_CONCURRENCY");
  const restored=await tx.variant.updateMany({
   where:{id:order.lines[0].variantId,priceCents:100,stockQuantity:0,active:true},
   data:{priceCents:VARIANT_TEST_ORIGINAL_CENTS,stockQuantity:null}
  });
  if(restored.count!==1)throw new VariantTestError("RESTORE_CONFLICT");
  await tx.orderStatusEvent.create({data:{orderId:order.id,fromStatus:"pending_payment",toStatus:"cancelled",reason:"variant_qa_provider_checked_unpaid_restore_price"}});
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:10000});
}
