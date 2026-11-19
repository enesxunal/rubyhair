import "server-only";
import {createHmac} from "node:crypto";
import {Prisma} from "@prisma/client";
import {getPrisma} from "@/lib/prisma";
import {providerForCheckout,publicCheckoutMode} from "@/lib/customer-checkout";
import {giftInput,digestGift,giftCheckoutSignature,generateGiftCode,giftCodeHash,encryptGiftCode,decryptGiftCode,verifyGiftSignature,type GiftInput} from "./rules";

export class GiftError extends Error{constructor(public code:string,public http=400){super(code)}}
export async function startGiftPurchase(input:GiftInput,ipKey:string){
 if(!giftInput.safeParse(input).success)throw new GiftError("INVALID_GIFT",400);
 if(process.env.RUBY_GIFT_CARDS_LIVE_ENABLED!=="true")throw new GiftError("GIFT_SALES_NOT_APPROVED",503);
 const key=process.env.SESSION_SECRET;
 if(!key||key.length<32)throw new GiftError("GIFT_SECRETS_UNAVAILABLE",503);
 // Limit costly live provider-session creation by buyer and IP.
 const hmac=(scope:string,value:string)=>createHmac("sha256",key).update("gift-rate:"+scope+":"+value).digest("hex");
 const dbRate=getPrisma();
 async function hit(digest:string){
  const rows=await dbRate.$queryRaw<{count:number}[]>`
   INSERT INTO "customer_auth_rate_limits" ("key","count","windowStart") VALUES (${digest},1,NOW())
   ON CONFLICT ("key") DO UPDATE SET "count"=CASE WHEN "customer_auth_rate_limits"."windowStart"<NOW()-INTERVAL '1 hour' THEN 1 ELSE "customer_auth_rate_limits"."count"+1 END,
   "windowStart"=CASE WHEN "customer_auth_rate_limits"."windowStart"<NOW()-INTERVAL '1 hour' THEN NOW() ELSE "customer_auth_rate_limits"."windowStart" END
   RETURNING "count"`;
  return rows[0]?.count??100;
 }
 const buyerCount=await hit(hmac("buyer",input.buyerEmail.trim().toLowerCase()));
 if(buyerCount>6)throw new GiftError("RATE_LIMITED",429);
 const ipCount=await hit(hmac("ip",ipKey));
 if(ipCount>15)throw new GiftError("RATE_LIMITED",429);
 if(!["public","payments_public"].includes(publicCheckoutMode()))throw new GiftError("PAYMENT_UNAVAILABLE",503);
 const gateway=await providerForCheckout("paypal");
 const db=getPrisma(),digest=digestGift(input);
 const prior=await db.giftPurchase.findUnique({where:{requestKey:input.key}});
 if(prior)throw new GiftError(prior.requestHash===digest?"PAYMENT_ALREADY_STARTED":"IDEMPOTENCY_CONFLICT",409);
 const purchase=await db.giftPurchase.create({data:{
   requestKey:input.key,requestHash:digest,amountCents:input.amountCents,
   buyerEmail:input.buyerEmail.trim().toLowerCase(),recipientEmail:input.delivery==="email"?input.recipientEmail?.toLowerCase():null,
   recipientName:input.recipientName,senderName:input.senderName||null,message:input.message||null,theme:input.theme,
   delivery:input.delivery,provider:"paypal",status:"pending"
 }});
 const base=`https://rubyhair.de/geschenkgutschein/zahlung?id=${purchase.id}&state=${giftCheckoutSignature(purchase.id)}`;
 try{
  const result=await gateway.api.createGiftOrder({purchaseId:purchase.id,amountCents:purchase.amountCents,returnUrl:base,cancelUrl:base+"&cancel=1"});
  const recorded=await db.giftPurchase.updateMany({where:{id:purchase.id,status:"pending",providerOrderId:null},data:{providerOrderId:result.id}});
  if(recorded.count!==1)throw new GiftError("PAYMENT_REQUIRES_REVIEW",503);
  return {redirectUrl:result.approvalUrl,purchaseId:purchase.id};
 }catch(e){
  // Never retry an ambiguous provider creation using a new idempotency key.
  console.warn("GIFT_PROVIDER_START_REQUIRES_REVIEW",e instanceof Error?e.name:"unknown");
  throw new GiftError("PAYMENT_REQUIRES_REVIEW",503);
 }
}

/** Canonical PayPal GET and exact captured amount required before any card is issued. */
export async function reconcileGiftPurchase(id:string,allowCapture:boolean,returnPaypalId?:string){
 const db=getPrisma();
 const purchase=await db.giftPurchase.findUnique({where:{id},include:{card:true}});
 if(!purchase||!purchase.providerOrderId)throw new GiftError("PURCHASE_NOT_FOUND",404);
 if(returnPaypalId&&purchase.providerOrderId!==returnPaypalId)throw new GiftError("PAYMENT_REFERENCE_MISMATCH",403);
 if(purchase.card&&purchase.status==="captured")return {paid:true,cardId:purchase.card.id,purchaseId:id};
 if(purchase.status!=="pending")throw new GiftError("PURCHASE_NOT_PENDING",409);
 const gateway=await providerForCheckout("paypal");
 let raw=await gateway.api.getOrder(purchase.providerOrderId) as {status?:string};
 if(allowCapture&&raw?.status==="APPROVED"){
  try{await gateway.api.captureOrder(purchase.providerOrderId,"RHG-CAPTURE-"+id)}catch{ /* Provider may have captured before response. */ }
  raw=await gateway.api.getOrder(purchase.providerOrderId) as {status?:string};
 }
 let verified;
 try{verified=gateway.api.requireCompletedCapture(raw,id,purchase.amountCents,purchase.providerOrderId)}
 catch{throw new GiftError("PAYMENT_NOT_YET_VERIFIED",409)}
 const code=generateGiftCode();
 const encrypted=encryptGiftCode(code),codeHash=giftCodeHash(code);
 try{
  const out=await db.$transaction(async tx=>{
   const changed=await tx.giftPurchase.updateMany({where:{id,status:"pending",providerOrderId:purchase.providerOrderId,providerCaptureId:null},data:{
     status:"captured",capturedAt:new Date(),providerCaptureId:verified.captureId,buyerMailStatus:"queued",
     recipientMailStatus:purchase.delivery==="email"&&purchase.recipientEmail?"queued":"skipped"}});
   if(changed.count!==1)return null;
   return tx.giftCard.create({data:{purchaseId:id,codeHash,...encrypted,faceCents:purchase.amountCents,balanceCents:purchase.amountCents}});
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:12000});
  if(out)return {paid:true,cardId:out.id,purchaseId:id};
 }catch(e){
  // Idempotent race: another callback/webhook may have created the card.
  const existing=await db.giftCard.findUnique({where:{purchaseId:id}});
  if(existing)return {paid:true,cardId:existing.id,purchaseId:id};
  console.error("GIFT_CAPTURED_RECONCILIATION_REQUIRED",e instanceof Error?e.name:"unknown");
  throw new GiftError("CAPTURED_NEEDS_RECONCILIATION",503);
 }
 const existing=await db.giftCard.findUnique({where:{purchaseId:id}});
 if(existing)return {paid:true,cardId:existing.id,purchaseId:id};
 throw new GiftError("CAPTURED_NEEDS_RECONCILIATION",503);
}
export async function getPaidGiftByLink(id:string,proof:string){
 if(!/^[0-9a-f-]{36}$/i.test(id)||!verifyGiftSignature(id,proof,"view-v1"))return null;
 const purchase=await getPrisma().giftPurchase.findUnique({where:{id},include:{card:true}});
 if(!purchase||purchase.status!=="captured"||!purchase.card)return null;
 return {purchase,code:decryptGiftCode(purchase.card)};
}
export async function getGiftBalanceByCode(code:string){
 const {giftCodeLooksValid,giftCodeHash}=await import("./rules");
 if(!giftCodeLooksValid(code))return null;
 const card=await getPrisma().giftCard.findUnique({where:{codeHash:giftCodeHash(code)},select:{balanceCents:true,faceCents:true,status:true}});
 return card?.status==="active"?{balanceCents:card.balanceCents,faceCents:card.faceCents}:null;
}
