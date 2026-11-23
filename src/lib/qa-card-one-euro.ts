import "server-only";
import {randomUUID} from "node:crypto";
import {Prisma} from "@prisma/client";
import {getPrisma} from "@/lib/prisma";
import {providerForCheckout} from "@/lib/customer-checkout";
import {confirmOneEuroQaPayment,QA_EMAIL_REGEX} from "@/lib/qa-live-paypal";
import {qaInvoiceNumber,QA_INVOICE_TAX_CENTS,QA_INVOICE_TAX_RATE} from "@/lib/qa-invoice";
import {assessOneEuroCardCapture} from "@/lib/qa-card-capture-policy";

export const CARD_QA_SLUG="rubyhair-intern-cardfields-qa-1-eur";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const paypalId=/^[A-Za-z0-9_-]{8,60}$/;
export class CardQaError extends Error{constructor(public readonly reason:string,public readonly code=409){super(reason)}}
export type CardQaBuyer={name:string;email:string;postalCode:string;confirmSeller:boolean;confirmTax:boolean;confirmCharge:boolean};
const qaWhere={testOnly:true,lines:{some:{variant:{product:{slug:CARD_QA_SLUG}}}}} as const;
export async function lastCardQaOrder(){return getPrisma().order.findFirst({where:qaWhere,orderBy:{createdAt:"desc"},select:{id:true,orderNumber:true,status:true,paymentReference:true,invoice:{select:{invoiceNumber:true}}}})}
export async function beginCardQaOrder(input:CardQaBuyer){
 if(!input.confirmSeller||!input.confirmTax||!input.confirmCharge)throw new CardQaError("MERCHANT_CONFIRMATION_REQUIRED",400);
 const name=input.name?.trim(),email=input.email?.trim().toLowerCase(),zip=input.postalCode?.trim();
 if(!name||name.length<2||name.length>100||/[\r\n<>]/.test(name))throw new CardQaError("INVALID_BUYER_NAME",400);
 if(!email||!QA_EMAIL_REGEX.test(email)||email.length>254)throw new CardQaError("INVALID_EMAIL",400);
 if(!zip||!/^[0-9]{5}$/.test(zip))throw new CardQaError("INVALID_POSTAL_CODE",400);
 const {api}=await providerForCheckout("paypal");
 const db=getPrisma();
 const order=await db.$transaction(async tx=>{
  const product=await tx.product.upsert({where:{slug:CARD_QA_SLUG},update:{},create:{slug:CARD_QA_SLUG,
   name:"Ruby Hair - interner Kartentest 1 EUR",originalName:"Nur Kartentest; keine Lieferung",headline:"Nur QA",intro:"Nicht sichtbar",pack:"1 Test",material:"INTERNAL_QA",currency:"EUR",image:"/assets/hero-brunette.webp",active:false}});
  if(product.active||product.material!=="INTERNAL_QA"||product.currency!=="EUR")throw new CardQaError("QA_PRODUCT_UNSAFE");
  const variant=await tx.variant.upsert({where:{productId_colorCode_lengthCode:{productId:product.id,colorCode:"qa-card",lengthCode:"single"}},update:{},create:{
   productId:product.id,colorCode:"qa-card",colorLabel:"Interner Test",lengthCode:"single",lengthLabel:"1 EUR",priceCents:100,stockQuantity:1,image:"/assets/hero-brunette.webp",active:false}});
  if(variant.active||variant.priceCents!==100||variant.stockQuantity!==1)throw new CardQaError("TEST_ALREADY_USED");
  if(await tx.order.count({where:qaWhere}))throw new CardQaError("TEST_ALREADY_EXISTS");
  const reserved=await tx.variant.updateMany({where:{id:variant.id,stockQuantity:1,active:false,priceCents:100},data:{stockQuantity:{decrement:1}}});
  if(reserved.count!==1)throw new CardQaError("TEST_RESERVATION_CONFLICT");
  return tx.order.create({data:{testOnly:true,status:"pending_payment",currency:"EUR",subtotalCents:100,shippingCents:0,taxCents:QA_INVOICE_TAX_CENTS,totalCents:100,
   customerEmail:email,reservationKey:randomUUID(),reservationExpiresAt:new Date(Date.now()+2*60*60*1000),
   billingAddress:{buyerName:name,confirmedSeller:true,confirmedTaxRate:QA_INVOICE_TAX_RATE,qaCard:true,postalCode:zip} as Prisma.InputJsonValue,
   shippingAddress:Prisma.JsonNull,lines:{create:[{variantId:variant.id,quantity:1,unitPriceCents:100,lineTotalCents:100}]},
   statusEvents:{create:{fromStatus:null,toStatus:"pending_payment",reason:"admin_one_euro_card_test_created"}}}});
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:12000});
 console.info("RUBY_CARD_QA_RESERVED",{orderId:order.id,amountCents:100});
 try{
  const external=await api.createOneEuroQaCardOrder({orderId:order.id,invoiceId:qaInvoiceNumber(order.orderNumber,new Date()),requestId:"QA-CARD-CREATE-"+order.id,
   returnUrl:"https://rubyhair.de/admin/paypal-kart-test",cancelUrl:"https://rubyhair.de/admin/paypal-kart-test"});
  const saved=await db.order.updateMany({where:{id:order.id,testOnly:true,status:"pending_payment",paymentReference:null},data:{paymentReference:external.id}});
  if(saved.count!==1)throw new CardQaError("PAYPAL_REFERENCE_STORE_FAILED");
  console.info("RUBY_CARD_QA_PROVIDER_ORDER",{orderId:order.id,amountCents:100});
  return {orderId:order.id,paypalOrderId:external.id,amountCents:100};
 }catch(e){console.error("RUBY_CARD_QA_CREATE_REVIEW",{orderId:order.id,type:e instanceof Error?e.name:"other"});throw new CardQaError("TEST_ORDER_NEEDS_REVIEW",503)}
}
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
export async function captureCardQaOrder(orderId:string,paypalOrderId:string,sdkLiabilityShift:unknown){
 if(!uuid.test(orderId)||!paypalId.test(paypalOrderId))throw new CardQaError("INVALID_ID",400);
 const db=getPrisma();const order=await db.order.findFirst({where:{id:orderId,...qaWhere},include:{invoice:true,lines:true}});
 if(!order||order.paymentReference!==paypalOrderId||order.totalCents!==100||order.currency!=="EUR"||order.shippingCents!==0||order.taxCents!==16||order.lines.length!==1)
  throw new CardQaError("TEST_ORDER_MISMATCH");
 if(order.status==="payment_confirmed"&&order.invoice)return {paid:true,invoiceNumber:order.invoice.invoiceNumber,alreadyCaptured:true};
 if(order.status!=="pending_payment")throw new CardQaError("TEST_NOT_PENDING");
 const {api}=await providerForCheckout("paypal");
 const remote=await api.getOrderWithPaymentSource(paypalOrderId);
 if(!obj(remote)||remote.id!==paypalOrderId||typeof remote.status!=="string")throw new CardQaError("PROVIDER_STATUS_UNKNOWN");
 const checked=assessOneEuroCardCapture(remote,orderId,paypalOrderId,sdkLiabilityShift);
 if(!checked.ok){console.warn("RUBY_CARD_QA_CAPTURE_HELD",{orderId,reason:checked.reason,remoteStatus:remote.status});throw new CardQaError(checked.reason)}
 console.info("RUBY_CARD_QA_PAYMENT_SOURCE_VERIFIED",{orderId,remoteStatus:checked.providerStatus,amountCents:100});
 // Serialize the one and only capture attempt. A previous ambiguous result must
 // never be repeated by another click, a stale browser tab or a manual API call.
 await db.$transaction(async tx=>{
  const previous=await tx.orderStatusEvent.findFirst({where:{orderId,reason:"admin_card_capture_attempted_review"},select:{id:true}});
  if(previous)throw new CardQaError("CAPTURE_ALREADY_ATTEMPTED_REQUIRES_REVIEW");
  const stillPending=await tx.order.findFirst({where:{id:orderId,status:"pending_payment",testOnly:true},select:{id:true}});
  if(!stillPending)throw new CardQaError("CAPTURE_ORDER_CHANGED_REQUIRES_REVIEW");
  await tx.orderStatusEvent.create({data:{orderId,fromStatus:"pending_payment",toStatus:"pending_payment",reason:"admin_card_capture_attempted_review"}});
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:9000});
 console.info("RUBY_CARD_QA_CAPTURE_REQUEST",{orderId,amountCents:100});
 try{
  const result=await confirmOneEuroQaPayment(paypalOrderId);
  const invoice=await db.invoice.findUnique({where:{orderId},select:{invoiceNumber:true}});
  if(!invoice)throw new CardQaError("INVOICE_RECONCILIATION_REQUIRED",503);
  console.info("RUBY_CARD_QA_CAPTURE_CONFIRMED",{orderId,amountCents:100,reused:result.alreadyCaptured});
  return {paid:true,invoiceNumber:invoice.invoiceNumber,alreadyCaptured:result.alreadyCaptured};
 }catch(e){console.error("RUBY_CARD_QA_CAPTURE_REVIEW",{orderId,type:e instanceof Error?e.name:"other"});throw new CardQaError("CAPTURE_STATUS_REQUIRES_REVIEW",503)}
}
export async function cardQaStatus(orderId:string){
 if(!uuid.test(orderId))throw new CardQaError("INVALID_ID",400);
 const order=await getPrisma().order.findFirst({where:{id:orderId,...qaWhere},select:{id:true,status:true,totalCents:true,paymentReference:true,invoice:{select:{invoiceNumber:true}}}});
 if(!order)return null;
 let paypalStatus="NOT_CREATED",paypalFunding="UNVERIFIED",paypalAmount="UNKNOWN",captureStatus="NOT_VERIFIED",captureAmount="UNKNOWN",captureCount=-1,liabilityShift="UNVERIFIED";
 if(order.paymentReference)try{
  const {api}=await providerForCheckout("paypal");const p=await api.getOrderWithPaymentSource(order.paymentReference);
  if(obj(p)){
   paypalStatus=typeof p.status==="string"?p.status:"UNKNOWN";
   const source=obj(p.payment_source)?p.payment_source:null;
   paypalFunding=source?Object.keys(source).join(",")||"NONE":"NONE";
   const card=source&&obj(source.card)?source.card:null;
   const auth=card&&obj(card.authentication_result)?card.authentication_result:null;
   liabilityShift=auth&&typeof auth.liability_shift==="string"?auth.liability_shift:"UNVERIFIED";
   const units=Array.isArray(p.purchase_units)?p.purchase_units:[];
   if(units.length===1&&obj(units[0])){
    const unit=units[0];
    const amt=obj(unit.amount)?unit.amount:null;
    paypalAmount=amt&&amt.currency_code==="EUR"&&typeof amt.value==="string"?amt.value+" EUR":"INVALID_AMOUNT";
    const pay=obj(unit.payments)?unit.payments:null;
    const caps=pay&&Array.isArray(pay.captures)?pay.captures:[];
    captureCount=caps.length;
    if(caps.length===0)captureStatus="NO_CAPTURE_IN_PAYPAL_ORDER";
    else if(caps.length===1&&obj(caps[0])){
     const c=caps[0];captureStatus=typeof c.status==="string"?c.status:"UNKNOWN";
     captureAmount=obj(c.amount)&&c.amount.currency_code==="EUR"&&typeof c.amount.value==="string"?c.amount.value+" EUR":"UNKNOWN";
    }else captureStatus="MULTIPLE_CAPTURES_REQUIRES_REVIEW";
   }
  }
 }catch{paypalStatus="TEMPORARILY_UNAVAILABLE"}
 // A capture was already attempted on this one-off QA. Do not allow repeated
 // card approval based solely on an order still showing CREATED.
 const canRetry=false;
 return {orderId:order.id,orderStatus:order.status,amountCents:order.totalCents,paypalStatus,paypalFunding,paypalAmount,captureStatus,captureAmount,captureCount,liabilityShift,canRetry,invoiceNumber:order.invoice?.invoiceNumber||null};
}
