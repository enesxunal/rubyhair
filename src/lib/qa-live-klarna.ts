import "server-only";
import {randomUUID} from "node:crypto";
import {Prisma} from "@prisma/client";
import {getPrisma} from "@/lib/prisma";
import {loadPaymentValue} from "@/lib/payment-secrets";
import {KlarnaClient,KlarnaProviderError,requireExactOneEuroCapture} from "@/lib/klarna-provider-core";
import {QA_EMAIL_REGEX} from "@/lib/qa-live-paypal";
import {RUBY_TEST_SELLER,QA_INVOICE_TAX_RATE,QA_INVOICE_TAX_CENTS,qaInvoiceNumber,buildOneEuroInvoicePdf} from "@/lib/qa-invoice";
import {requireOrderTransition} from "@/lib/order-lifecycle";

export const KLARNA_QA_SLUG="rubyhair-intern-klarna-qa-1-eur";
const HPP_PREFIX="KLARNA-HPP:";
export class KlarnaQaError extends Error{
 constructor(public readonly reason:string){super(reason);this.name="KlarnaQaError"}
}
async function client(){
 const [username,password,merchantId]=await Promise.all([
  loadPaymentValue("klarna","live","username"),loadPaymentValue("klarna","live","password"),loadPaymentValue("klarna","live","merchantId")
 ]);
 if(!username||!password||!merchantId)throw new KlarnaQaError("KLARNA_KEYS_MISSING");
 return new KlarnaClient(username,password);
}
export async function getKlarnaQaProduct(){
 const p=await getPrisma().product.findUnique({where:{slug:KLARNA_QA_SLUG},include:{variants:true}});
 if(!p)return null;
 const v=p.variants.find(v=>v.colorCode==="klarna-only"&&v.lengthCode==="single");
 return {id:p.id,active:p.active,variantId:v?.id??null,variantActive:v?.active??null,priceCents:v?.priceCents??null,stockQuantity:v?.stockQuantity??null};
}
export async function prepareKlarnaQaProduct(){
 const db=getPrisma();
 return db.$transaction(async tx=>{
  const p=await tx.product.upsert({where:{slug:KLARNA_QA_SLUG},update:{},create:{
   slug:KLARNA_QA_SLUG,name:"Ruby Hair - Interner Klarna 1 EUR Testartikel",
   originalName:"Interner Klarna Zahlungstest - Keine Lieferung",headline:"Nur interne QA",
   intro:"Nur fuer eine autorisierte Klarna Testbestellung; keine Ware.",
   pack:"1 Testartikel",material:"INTERNAL_QA",currency:"EUR",image:"/assets/hero-brunette.webp",active:false
  }});
  if(p.active||p.material!=="INTERNAL_QA"||p.currency!=="EUR")throw new KlarnaQaError("KLARNA_QA_ITEM_UNSAFE");
  const v=await tx.variant.upsert({where:{productId_colorCode_lengthCode:{productId:p.id,colorCode:"klarna-only",lengthCode:"single"}},update:{},create:{
   productId:p.id,colorCode:"klarna-only",colorLabel:"Nur interne QA",lengthCode:"single",lengthLabel:"Einmaliger Klarna Test",priceCents:100,stockQuantity:1,image:"/assets/hero-brunette.webp",active:false
  }});
  if(v.active||v.priceCents!==100||v.stockQuantity===null||v.stockQuantity<0)throw new KlarnaQaError("KLARNA_QA_VARIANT_UNSAFE");
  return {hidden:!p.active&&!v.active,stock:v.stockQuantity};
 });
}
type Buyer={name:string;email:string;confirmedSeller:boolean;confirmedTax:boolean;confirmedCharge:boolean};
function checkBuyer(x:Buyer){
 if(!x.confirmedSeller||!x.confirmedTax||!x.confirmedCharge)throw new KlarnaQaError("KLARNA_CONFIRMATION_REQUIRED");
 if(x.name.trim().length<2||x.name.length>100||/[\r\n<>]/.test(x.name))throw new KlarnaQaError("KLARNA_INVALID_NAME");
 if(!QA_EMAIL_REGEX.test(x.email)||x.email.length>254)throw new KlarnaQaError("KLARNA_INVALID_EMAIL");
 return {name:x.name.trim(),email:x.email.toLowerCase().trim()};
}
export async function beginKlarnaQaPayment(input:Buyer):Promise<string>{
 const buyer=checkBuyer(input),api=await client(),db=getPrisma();
 const order=await db.$transaction(async tx=>{
  const p=await tx.product.findUnique({where:{slug:KLARNA_QA_SLUG},include:{variants:true}});
  if(!p||p.active||p.material!=="INTERNAL_QA"||p.currency!=="EUR"||p.variants.length!==1)throw new KlarnaQaError("KLARNA_QA_ITEM_UNSAFE");
  const v=p.variants[0];
  if(v.active||v.priceCents!==100||v.stockQuantity!==1)throw new KlarnaQaError("KLARNA_QA_STOCK_UNAVAILABLE");
  const existing=await tx.order.count({where:{testOnly:true,lines:{some:{variantId:v.id}},status:{in:["pending_payment","payment_confirmed","preparing","shipped","delivered"]}}});
  if(existing)throw new KlarnaQaError("KLARNA_QA_ALREADY_EXISTS");
  const reserved=await tx.variant.updateMany({where:{id:v.id,active:false,stockQuantity:1},data:{stockQuantity:{decrement:1}}});
  if(reserved.count!==1)throw new KlarnaQaError("KLARNA_QA_STOCK_UNAVAILABLE");
  return tx.order.create({include:{lines:{select:{variantId:true}}},data:{
   status:"pending_payment",currency:"EUR",testOnly:true,subtotalCents:100,shippingCents:0,taxCents:QA_INVOICE_TAX_CENTS,totalCents:100,
   reservationKey:randomUUID(),reservationExpiresAt:new Date(Date.now()+2*60*60*1000),
   customerEmail:buyer.email,billingAddress:{buyerName:buyer.name,confirmedSeller:true,confirmedTaxRate:19,provider:"klarna"} as Prisma.InputJsonValue,
   shippingAddress:Prisma.JsonNull,lines:{create:[{variantId:v.id,quantity:1,unitPriceCents:100,lineTotalCents:100}]},
   statusEvents:{create:{fromStatus:null,toStatus:"pending_payment",reason:"merchant_klarna_qa_live_1eur"}}
  }});
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:10000});
 let safeToCancel=true;
 try{
  const kp=await api.createPaymentSession(order.orderNumber.toString());
  const eligible=kp.payment_method_categories?.some(x=>x.identifier.toLowerCase()==="pay_now");
  if(!eligible)throw new KlarnaQaError("KLARNA_PAY_NOW_UNAVAILABLE");
  safeToCancel=false; // If HPP API succeeds but response is lost, preserve reservation.
  const hpp=await api.createHostedPage(kp.session_id,"https://rubyhair.de/qa/klarna/return?ref="+order.reservationKey);
  const changed=await db.order.updateMany({where:{id:order.id,status:"pending_payment",testOnly:true,paymentReference:null},data:{paymentReference:HPP_PREFIX+hpp.session_id}});
  if(changed.count!==1)throw new KlarnaQaError("KLARNA_SESSION_RECONCILIATION_REQUIRED");
  return hpp.redirect_url;
 }catch(e){
  if(e instanceof KlarnaProviderError&&/^KLARNA_HTTP_4\d\d$/.test(e.reason))safeToCancel=true;
  if(safeToCancel){
   await db.$transaction(async tx=>{
    const changed=await tx.order.updateMany({where:{id:order.id,testOnly:true,status:"pending_payment",paymentReference:null},data:{status:"cancelled",reservationExpiresAt:null}});
    if(changed.count===1){
     await tx.variant.updateMany({where:{id:order.lines?.[0]?.variantId??"00000000-0000-0000-0000-000000000000"},data:{stockQuantity:{increment:1}}});
    }
   }).catch(()=>{});
  }
  if(e instanceof KlarnaQaError)throw e;
  if(e instanceof KlarnaProviderError&&e.reason==="KLARNA_UNSAFE_REDIRECT")throw new KlarnaQaError("KLARNA_UNSAFE_REDIRECT");
  console.error("RUBY_KLARNA_QA_START_FAILED",{category:e instanceof Error?e.name:"unknown"});
  throw new KlarnaQaError("KLARNA_START_FAILED_REVIEW_PENDING");
 }
}
async function verifiedKlarnaOrder(order:{paymentReference:string|null;reservationKey:string|null}){
 if(!order.paymentReference?.startsWith(HPP_PREFIX)||!order.reservationKey)throw new KlarnaQaError("KLARNA_HPP_NOT_LINKED");
 const api=await client();
 const hpp=await api.readHostedPage(order.paymentReference.slice(HPP_PREFIX.length));
 if(hpp.status!=="COMPLETED"||!hpp.order_id)throw new KlarnaQaError("KLARNA_NOT_APPROVED");
 const providerOrder=await api.readOrder(hpp.order_id);
 if(providerOrder.order_id!==hpp.order_id||providerOrder.order_amount!==100||providerOrder.purchase_currency!=="EUR")throw new KlarnaQaError("KLARNA_ORDER_AMOUNT_MISMATCH");
 return {api,providerOrderId:hpp.order_id};
}
export async function getKlarnaQaApproval(reservationKey:string){
 if(!/^[0-9a-f-]{36}$/i.test(reservationKey))return {approved:false,reason:"INVALID_REFERENCE"};
 const order=await getPrisma().order.findUnique({where:{reservationKey},select:{id:true,orderNumber:true,status:true,paymentReference:true,reservationKey:true,testOnly:true}});
 if(!order?.testOnly||!order.paymentReference?.startsWith(HPP_PREFIX)||order.status!=="pending_payment")return {approved:false,reason:"NOT_PENDING"};
 try{await verifiedKlarnaOrder(order);return {approved:true,orderNumber:String(order.orderNumber)}}
 catch(e){return {approved:false,reason:e instanceof KlarnaQaError?e.reason:"KLARNA_CHECK_UNAVAILABLE"}}
}
export async function captureKlarnaQaPayment(reservationKey:string){
 if(!/^[0-9a-f-]{36}$/i.test(reservationKey))throw new KlarnaQaError("KLARNA_INVALID_REFERENCE");
 const db=getPrisma();
 const order=await db.order.findUnique({where:{reservationKey},include:{invoice:true,lines:true}});
 if(!order||!order.testOnly||order.totalCents!==100||order.taxCents!==16||order.currency!=="EUR"||order.shippingCents!==0||order.lines.length!==1)throw new KlarnaQaError("KLARNA_ORDER_UNSAFE");
 const variant=await db.variant.findUnique({where:{id:order.lines[0].variantId},select:{product:{select:{slug:true}}}});
 if(variant?.product.slug!==KLARNA_QA_SLUG)throw new KlarnaQaError("KLARNA_QA_VARIANT_MISMATCH");
 if(order.status==="payment_confirmed"&&order.invoice)return {orderId:order.id};
 if(order.status!=="pending_payment")throw new KlarnaQaError("KLARNA_NOT_PENDING");
 const {api,providerOrderId}=await verifiedKlarnaOrder(order);
 let captures=await api.readCaptures(providerOrderId);
 let captureId:string;
 try{captureId=requireExactOneEuroCapture(captures)}
 catch(e){
  const raw=Array.isArray(captures)?captures:captures.captures||[];
  if(raw.length)throw new KlarnaQaError("KLARNA_CAPTURE_RECONCILIATION_REQUIRED");
  try{await api.captureOneEuro(providerOrderId,order.id)}
  catch(error){console.error("RUBY_KLARNA_CAPTURE_RECHECK",{category:error instanceof Error?error.name:"unknown"});}
  captures=await api.readCaptures(providerOrderId);
  try{captureId=requireExactOneEuroCapture(captures)}
  catch{throw new KlarnaQaError("KLARNA_CAPTURE_RECONCILIATION_REQUIRED")}
 }
 const buyer=order.billingAddress;
 if(!buyer||typeof buyer!=="object"||Array.isArray(buyer)||buyer.confirmedSeller!==true||buyer.confirmedTaxRate!==QA_INVOICE_TAX_RATE||typeof buyer.buyerName!=="string"||!order.customerEmail)throw new KlarnaQaError("KLARNA_INVOICE_CUSTOMER_MISSING");
 const issuedAt=new Date(),invoiceNumber=qaInvoiceNumber(order.orderNumber,issuedAt);
 const pdf=buildOneEuroInvoicePdf({invoiceNumber,issuedAt,orderNumber:order.orderNumber,buyerName:buyer.buyerName,buyerEmail:order.customerEmail,captureId,provider:"klarna"});
 try{
  await db.$transaction(async tx=>{
   const changed=await tx.order.updateMany({where:{id:order.id,status:"pending_payment",testOnly:true,paymentReference:order.paymentReference},data:{status:"payment_confirmed",reservationExpiresAt:null}});
   if(changed.count!==1)throw new KlarnaQaError("KLARNA_ALREADY_RECORDED");
   requireOrderTransition("pending_payment","payment_confirmed","payment_provider");
   await tx.paymentEvent.create({data:{orderId:order.id,provider:"klarna",providerEventId:captureId,eventType:"KLARNA.CAPTURE.COMPLETED"}});
   await tx.orderStatusEvent.create({data:{orderId:order.id,fromStatus:"pending_payment",toStatus:"payment_confirmed",reason:"klarna_live_capture_exact_1eur"}});
   await tx.invoice.create({data:{orderId:order.id,invoiceNumber,issuedAt,seller:RUBY_TEST_SELLER,buyer:{name:buyer.buyerName,email:order.customerEmail},lines:[{description:"Interner Klarna-Testkauf (keine Warenlieferung)",qty:1,totalCents:100}],taxRate:19,taxCents:16,totalCents:100,pdf:new Uint8Array(pdf)}});
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:10000});
 }catch(e){
  const existing=await db.invoice.findUnique({where:{orderId:order.id}});
  if(existing)return {orderId:order.id};
  throw new KlarnaQaError("KLARNA_CAPTURE_ACCOUNTING_RECONCILIATION_REQUIRED");
 }
 return {orderId:order.id};
}

export async function cancelKlarnaQaPayment(orderId:string){
 if(!/^[0-9a-f-]{36}$/i.test(orderId))throw new KlarnaQaError("KLARNA_INVALID_REFERENCE");
 const db=getPrisma();
 const order=await db.order.findUnique({where:{id:orderId},include:{lines:{include:{variant:{include:{product:true}}}}}});
 if(!order||!order.testOnly||order.status!=="pending_payment"||order.lines.length!==1||order.lines[0].variant.product.slug!==KLARNA_QA_SLUG)throw new KlarnaQaError("KLARNA_CANCELLATION_UNSAFE");
 if(!order.paymentReference?.startsWith(HPP_PREFIX))throw new KlarnaQaError("KLARNA_EXTERNAL_SESSION_REVIEW_REQUIRED");
 const api=await client();
 const hppId=order.paymentReference.slice(HPP_PREFIX.length);
 const status=await api.readHostedPage(hppId);
 if(status.status==="WAITING"){
  await api.disableHostedPage(hppId);
  const after=await api.readHostedPage(hppId);
  if(after.status!=="DISABLED")throw new KlarnaQaError("KLARNA_SESSION_DISABLE_UNVERIFIED");
 }else if(!["CANCELLED","FAILED","ERROR","DISABLED"].includes(status.status)){
  throw new KlarnaQaError("KLARNA_ORDER_ALREADY_AUTHORIZED_OR_IN_PROGRESS");
 }
 await db.$transaction(async tx=>{
  const changed=await tx.order.updateMany({where:{id:order.id,testOnly:true,status:"pending_payment",paymentReference:order.paymentReference},data:{status:"cancelled",reservationExpiresAt:null}});
  if(changed.count!==1)throw new KlarnaQaError("KLARNA_CANCEL_RACE");
  const stock=await tx.variant.updateMany({where:{id:order.lines[0].variantId,stockQuantity:{not:null}},data:{stockQuantity:{increment:1}}});
  if(stock.count!==1)throw new KlarnaQaError("KLARNA_STOCK_RECONCILIATION_REQUIRED");
  await tx.orderStatusEvent.create({data:{orderId:order.id,fromStatus:"pending_payment",toStatus:"cancelled",reason:"klarna_qa_session_terminated_no_payment"}});
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:10000});
}
