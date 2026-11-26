import "server-only";
import {Prisma} from "@prisma/client";
import {getPrisma} from "@/lib/prisma";
import {providerForCheckout,CustomerCheckoutError} from "@/lib/customer-checkout";
import {requireOrderTransition} from "@/lib/order-lifecycle";
import {createCustomerInvoicePdf} from "@/lib/customer-invoice";
import {RUBY_TEST_SELLER} from "@/lib/qa-invoice";
import {generateGiftCode,giftCodeHash,encryptGiftCode} from "@/lib/gift-cards/rules";
import {verifiedCaptureReplay,paymentReplayOutcome} from "@/lib/payment-replay-policy";

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
 const order=await db.order.findUnique({where:{id:orderId},include:{lines:{include:{variant:{include:{product:true}}}},invoice:true,giftPurchases:true}});
 if(!order||order.testOnly||!order.customerEmail||order.totalCents<100)throw new CustomerCheckoutError("CUSTOMER_ORDER_NOT_FOUND",404);
 if(verifiedCaptureReplay(order.status,Boolean(order.invoice),Boolean(await db.paymentEvent.findFirst({
   where:{orderId:order.id,provider,eventType:"PAYMENT.CAPTURE.COMPLETED",providerEventId:captureId},select:{id:true}
  }))))return {paid:paymentReplayOutcome(order.status)==="paid",invoiceNumber:order.invoice!.invoiceNumber};
 if(!["pending_payment","payment_authorized"].includes(order.status))throw new CustomerCheckoutError("CUSTOMER_ORDER_NOT_PENDING",409);
 if(provider==="paypal"&&order.paymentReference!==providerOrderReference)throw new CustomerCheckoutError("PROVIDER_ORDER_REFERENCE_MISMATCH",409);
 if(provider==="klarna"&&!order.paymentReference?.startsWith("KLARNA-HPP:"))throw new CustomerCheckoutError("PROVIDER_ORDER_REFERENCE_MISMATCH",409);
 if(order.lines.some(l=>l.quantity<1||l.unitPriceCents<100))throw new CustomerCheckoutError("STORED_ORDER_LINES_INVALID",503);
 const giftSum=order.giftPurchases.reduce((sum,g)=>sum+g.amountCents,0);
 if(order.lines.reduce((sum,l)=>sum+l.lineTotalCents,0)+giftSum+order.shippingCents!==order.totalCents||
   order.giftPurchases.some(g=>g.status!=="pending"||g.provider!=="paypal"||!g.cartOrderId)||
   (giftSum>0&&provider!=="paypal")||(!order.lines.length&&!giftSum))
  throw new CustomerCheckoutError("STORED_ORDER_TOTAL_MISMATCH",503);
 // Each gift must get one cryptographically independent code; no card is issued
 // outside the atomic verified-capture finalization below.
 const issuedGifts=order.giftPurchases.map(g=>{const code=generateGiftCode();return {purchase:g,...encryptGiftCode(code),codeHash:giftCodeHash(code)}});
 if(order.giftAppliedCents<0||order.giftAppliedCents>=order.totalCents)throw new CustomerCheckoutError("INVALID_GIFT_TENDER",503);
 if(order.giftAppliedCents>0){
  const redemption=await db.giftRedemption.findUnique({where:{orderId:order.id}});
  if(!redemption||redemption.state!=="reserved"||redemption.amountCents!==order.giftAppliedCents)throw new CustomerCheckoutError("GIFT_RESERVATION_MISMATCH",503);
 }
 const billing=shape(order.billingAddress),issuedAt=new Date(),number=invoiceNo(order.orderNumber,issuedAt);
 const buyerName=billing.firstName+" "+billing.lastName;
 const invoiceLines=[...order.lines.map(l=>({description:`${l.variant.product.name} ${l.variant.colorLabel} ${l.variant.lengthLabel}`,
  quantity:l.quantity,unitCents:l.unitPriceCents,totalCents:l.lineTotalCents})),
  ...order.giftPurchases.map(g=>({description:`Ruby Hair Geschenkgutschein für ${g.recipientName}`,
   quantity:1,unitCents:g.amountCents,totalCents:g.amountCents}))];
 const pdf=createCustomerInvoicePdf({
  invoiceNumber:number,issuedAt,orderNumber:String(order.orderNumber),customerName:buyerName,
  customerEmail:order.customerEmail,billingStreet:billing.street,billingPostalCode:billing.postalCode,
  billingCity:billing.city,paymentMethod:provider,paymentReference:providerOrderReference,
  lines:invoiceLines,subtotalCents:order.subtotalCents,shippingCents:order.shippingCents,taxCents:order.taxCents,totalCents:order.totalCents,
  giftAppliedCents:order.giftAppliedCents
 });
 try{
  await db.$transaction(async tx=>{
   const changed=await tx.order.updateMany({where:{id:order.id,status:order.status,testOnly:false,totalCents:order.totalCents},
    data:{status:"payment_confirmed",reservationExpiresAt:null}});
   if(changed.count!==1)throw new CustomerCheckoutError("ORDER_CONCURRENCY_REVIEW",409);
   requireOrderTransition(order.status,"payment_confirmed","payment_provider");
   if(order.giftAppliedCents>0){
    const settled=await tx.giftRedemption.updateMany({where:{orderId:order.id,state:"reserved",amountCents:order.giftAppliedCents},data:{state:"settled",settledAt:issuedAt}});
    if(settled.count!==1)throw new CustomerCheckoutError("GIFT_RESERVATION_CONFLICT",409);
   }
   for(const issued of issuedGifts){
    const purchase=issued.purchase;
    const captured=await tx.giftPurchase.updateMany({where:{id:purchase.id,cartOrderId:order.id,status:"pending"},
     data:{status:"captured",capturedAt:issuedAt,buyerMailStatus:"queued",
      recipientMailStatus:purchase.delivery==="email"&&purchase.recipientEmail?"queued":"skipped"}});
    if(captured.count!==1)throw new CustomerCheckoutError("GIFT_ISSUE_CONCURRENCY",409);
    await tx.giftCard.create({data:{purchaseId:purchase.id,codeHash:issued.codeHash,
     codeCiphertext:issued.codeCiphertext,codeIv:issued.codeIv,codeTag:issued.codeTag,
     faceCents:purchase.amountCents,balanceCents:purchase.amountCents}});
   }
   await tx.paymentEvent.create({data:{orderId:order.id,provider,providerEventId:captureId,eventType:"PAYMENT.CAPTURE.COMPLETED"}});
   await tx.orderStatusEvent.create({data:{orderId:order.id,fromStatus:order.status,toStatus:"payment_confirmed",reason:`${provider}_verified_capture`} });
   await tx.invoice.create({data:{orderId:order.id,invoiceNumber:number,issuedAt,
    seller:RUBY_TEST_SELLER,buyer:{name:buyerName,email:order.customerEmail,street:billing.street,zip:billing.postalCode,city:billing.city},
    lines:invoiceLines as Prisma.InputJsonValue,taxRate:19,taxCents:order.taxCents,totalCents:order.totalCents,pdf:new Uint8Array(pdf)}});
   await tx.orderNotification.createMany({data:[{orderId:order.id,stage:"paid"},{orderId:order.id,stage:"paid_admin"}]});
   if(order.lines.length)await tx.shippingJob.upsert({where:{orderId:order.id},create:{orderId:order.id,status:"waiting_credentials"},update:{}});
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
export async function finalizePayPalCheckout(orderId:string,allowCapture:boolean,returnToken?:string,verifiedCardFlow=false){
 const db=getPrisma(),order=await db.order.findUnique({where:{id:orderId},include:{invoice:{select:{invoiceNumber:true}}}});
 if(!order||order.testOnly||!order.paymentReference||order.paymentReference.startsWith("KLARNA-"))
  throw new CustomerCheckoutError("PAYPAL_CUSTOMER_ORDER_NOT_FOUND",404);
 if(returnToken!==undefined&&order.paymentReference!==returnToken)throw new CustomerCheckoutError("PAYPAL_RETURN_REFERENCE_MISMATCH",403);
 if(order.invoice&&["payment_confirmed","preparing","shipped","delivered","refunded"].includes(order.status)){
  const captured=await db.paymentEvent.findFirst({where:{orderId:order.id,provider:"paypal",eventType:"PAYMENT.CAPTURE.COMPLETED"},select:{id:true}});
  if(verifiedCaptureReplay(order.status,true,Boolean(captured)))return {paid:paymentReplayOutcome(order.status)==="paid",invoiceNumber:order.invoice.invoiceNumber};
  throw new CustomerCheckoutError("PAYPAL_CAPTURE_REPLAY_INCONSISTENT",409);
 }
 if(!["pending_payment","payment_authorized"].includes(order.status))throw new CustomerCheckoutError("PAYPAL_ORDER_NOT_PENDING",409);
 if(allowCapture&&!verifiedCardFlow&&await db.orderStatusEvent.findFirst({where:{orderId:order.id,reason:"customer_card_checkout_reserved"},select:{id:true}}))allowCapture=false;
 const gateway=await providerForCheckout("paypal");
 let raw=await gateway.api.getOrder(order.paymentReference) as {status?:string};
 let captureResponse:unknown=null;
 if(verifiedCardFlow&&allowCapture&&(raw?.status==="CREATED"||raw?.status==="APPROVED")){
  // The v6 SDK may leave an approved card payment at CREATED until the first
  // capture. Verify funding, 3DS, order identity and amount from PayPal, not JS.
  const remote=await gateway.api.getOrderWithPaymentSource(order.paymentReference);
  const o=remote&&typeof remote==="object"&&!Array.isArray(remote)?remote as Record<string,unknown>:null;
  const src=o?.payment_source&&typeof o.payment_source==="object"?o.payment_source as Record<string,unknown>:null;
  const card=src?.card&&typeof src.card==="object"?src.card as Record<string,unknown>:null;
  const auth=card?.authentication_result&&typeof card.authentication_result==="object"?card.authentication_result as Record<string,unknown>:null;
  const units=Array.isArray(o?.purchase_units)?o.purchase_units:[];
  const u=units.length===1&&units[0]&&typeof units[0]==="object"?units[0] as Record<string,unknown>:null;
  const amount=u?.amount&&typeof u.amount==="object"?u.amount as Record<string,unknown>:null;
  const payments=u?.payments&&typeof u.payments==="object"?u.payments as Record<string,unknown>:null;
  const captures=Array.isArray(payments?.captures)?payments.captures:[];
  if(!o||o.id!==order.paymentReference||!(["CREATED","APPROVED"] as unknown[]).includes(o.status)||
    !card||auth?.liability_shift!=="POSSIBLE"||u?.custom_id!==order.id||
    amount?.currency_code!=="EUR"||amount?.value!==((order.totalCents-order.giftAppliedCents)/100).toFixed(2))
   throw new CustomerCheckoutError("CARD_PROVIDER_DETAILS_REQUIRE_REVIEW",409);
  if(captures.length!==0)throw new CustomerCheckoutError("CARD_EXISTING_CAPTURE_REQUIRES_REVIEW",409);
  // Only one attempt is allowed per Ruby Hair order, including a timeout.
  // No client retry, return navigation or webhook can initiate a second card capture.
  try{
   await db.$transaction(async tx=>{
    const attempted=await tx.orderStatusEvent.findFirst({where:{orderId:order.id,reason:"customer_card_capture_attempted_review"},select:{id:true}});
    if(attempted)throw new CustomerCheckoutError("CARD_CAPTURE_ATTEMPT_ALREADY_RECORDED",409);
    const current=await tx.order.findFirst({where:{id:order.id,status:"pending_payment",testOnly:false},select:{id:true}});
    if(!current)throw new CustomerCheckoutError("CARD_ORDER_STATE_CHANGED",409);
    await tx.orderStatusEvent.create({data:{orderId:order.id,fromStatus:"pending_payment",toStatus:"pending_payment",reason:"customer_card_capture_attempted_review"}});
   },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:10000});
  }catch{throw new CustomerCheckoutError("CARD_CAPTURE_ATTEMPT_REQUIRES_REVIEW",409)}
  try{captureResponse=await gateway.api.captureOrder(order.paymentReference,"RH-CAPTURE-"+order.id)}
  catch{/* A lost response is not permission to capture again. */}
  raw=await gateway.api.getOrder(order.paymentReference) as {status?:string};
 }else if(raw?.status==="APPROVED"&&allowCapture){
  try{captureResponse=await gateway.api.captureOrder(order.paymentReference,"RH-CAPTURE-"+order.id)}
  catch{/* The provider may have captured before its response was lost. */}
  raw=await gateway.api.getOrder(order.paymentReference) as {status?:string};
 }
 let verified;
 try{verified=gateway.api.requireCompletedCapture(raw,order.id,order.totalCents-order.giftAppliedCents,order.paymentReference)}
 catch{
  try{verified=gateway.api.requireCompletedCapture(captureResponse,order.id,order.totalCents-order.giftAppliedCents,order.paymentReference)}
  catch{throw new CustomerCheckoutError("PAYPAL_CAPTURE_NOT_YET_VERIFIED",409)}
 }
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
