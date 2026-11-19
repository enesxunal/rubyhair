import "server-only";
import {createHmac,createHash,timingSafeEqual} from "node:crypto";
import {Prisma} from "@prisma/client";
import {z} from "zod";
import {getPrisma} from "@/lib/prisma";
import {loadPaymentValue} from "@/lib/payment-secrets";
import {PaypalClient} from "@/lib/paypal-provider-core";
import {KlarnaClient,KlarnaProviderError} from "@/lib/klarna-provider-core";
import {legacyStore} from "@/lib/legacy-store-facts";
import {giftCodeHash,giftCodeLooksValid} from "@/lib/gift-cards/rules";
import {createCustomerInvoicePdf} from "@/lib/customer-invoice";
import {RUBY_TEST_SELLER} from "@/lib/qa-invoice";

const simple=z.string().trim().min(2).max(85).refine(s=>!/[<>\r\n\x00-\x1f]/.test(s));
const postal=z.string().regex(/^\d{5}$/);
const address=z.object({firstName:simple,lastName:simple,street:simple.max(120),postalCode:postal,city:simple,country:z.literal("DE")}).strict();
export const checkoutInput=z.object({
 key:z.string().uuid(),provider:z.enum(["paypal","klarna"]),
 lines:z.array(z.object({id:z.number().int().positive(),quantity:z.number().int().min(1).max(99)}).strict()).min(1).max(30),
 shipping:address,billing:address.optional(),email:z.email().max(254),giftCode:z.string().min(10).max(45).optional(),consent:z.literal(true)
}).strict().superRefine((v,ctx)=>{
 const ids=new Set<number>();let qty=0;
 for(const [i,l] of v.lines.entries()){if(ids.has(l.id))ctx.addIssue({code:"custom",path:["lines",i],message:"Duplicate variant"});ids.add(l.id);qty+=l.quantity;}
 if(qty>99)ctx.addIssue({code:"custom",path:["lines"],message:"Cart too large"});
});
export type CustomerCheckoutInput=z.infer<typeof checkoutInput>;
export const grossTax19=(totalCents:number)=>Math.round(totalCents*19/119);
export const shippingDeCents=()=>{
 const raw=process.env.RUBY_SHIPPING_DE_CENTS;
 if(raw===undefined)return Math.round(legacyStore.shipping.standardEuro*100);
 if(!/^\d{1,5}$/.test(raw))throw new CustomerCheckoutError("SHIPPING_NOT_CONFIGURED",503);
 return Number(raw);
};
export class CustomerCheckoutError extends Error{
 constructor(public readonly reason:string,public readonly http=400){super(reason);this.name="CustomerCheckoutError"}
}
const hash=(input:CustomerCheckoutInput)=>createHash("sha256").update(JSON.stringify({
 provider:input.provider,giftCode:input.giftCode?giftCodeHash(input.giftCode):null,lines:[...input.lines].sort((a,b)=>a.id-b.id),
 shipping:input.shipping,billing:input.billing||input.shipping,email:input.email.toLowerCase()
})).digest("hex");
const secret=()=>{
 const key=process.env.SESSION_SECRET;
 if(!key||key.length<32)throw new CustomerCheckoutError("CHECKOUT_SIGNING_NOT_CONFIGURED",503);
 return key;
};
export function checkoutSignature(orderId:string,provider:"paypal"|"klarna"){
 return createHmac("sha256",secret()).update(`customer-checkout:v1:${provider}:${orderId}`).digest("hex");
}
export function verifyCheckoutSignature(orderId:string,provider:"paypal"|"klarna",signature:string){
 if(!/^[\da-f]{64}$/.test(signature))return false;
 const a=Buffer.from(checkoutSignature(orderId,provider),"hex"),b=Buffer.from(signature,"hex");
 return a.length===b.length&&timingSafeEqual(a,b);
}
export function publicCheckoutMode(){
 return process.env.RUBY_PUBLIC_CHECKOUT_MODE==="public"?"public":
  process.env.RUBY_PUBLIC_CHECKOUT_MODE==="klarna_public"?"klarna_public":
  process.env.RUBY_PUBLIC_CHECKOUT_MODE==="payments_public"?"payments_public":
  process.env.RUBY_PUBLIC_CHECKOUT_MODE==="admin_test"?"admin_test":"disabled";
}
export function providerForCheckout(provider:"paypal"):Promise<{provider:"paypal";api:PaypalClient}>;
export function providerForCheckout(provider:"klarna"):Promise<{provider:"klarna";api:KlarnaClient}>;
export function providerForCheckout(provider:"paypal"|"klarna"):Promise<{provider:"paypal";api:PaypalClient}|{provider:"klarna";api:KlarnaClient}>;
export async function providerForCheckout(provider:"paypal"|"klarna"):Promise<{provider:"paypal";api:PaypalClient}|{provider:"klarna";api:KlarnaClient}>{
 if(provider==="paypal"){
  const [clientId,clientSecret,webhookId]=await Promise.all([
   loadPaymentValue("paypal","live","clientId"),loadPaymentValue("paypal","live","clientSecret"),loadPaymentValue("paypal","live","webhookId")
  ]);
  if(!clientId||!clientSecret||!webhookId)throw new CustomerCheckoutError("PAYPAL_NOT_CONFIGURED",503);
  return {provider,api:new PaypalClient("live",{clientId,clientSecret,webhookId})} as const;
 }
 const [username,password,merchantId]=await Promise.all([
  loadPaymentValue("klarna","live","username"),loadPaymentValue("klarna","live","password"),loadPaymentValue("klarna","live","merchantId")
 ]);
 if(!username||!password||!merchantId)throw new CustomerCheckoutError("KLARNA_NOT_CONFIGURED",503);
 return {provider,api:new KlarnaClient(username,password)} as const;
}

export const giftOnlySignature=(id:string)=>createHmac("sha256",secret()).update("rubyhair-gift-only-order-v1:"+id).digest("hex");
export async function createCustomerCheckout(input:CustomerCheckoutInput){
 if(input.giftCode&&(!giftCodeLooksValid(input.giftCode)||input.provider!=="paypal"))throw new CustomerCheckoutError("GIFT_CODE_INVALID_OR_PROVIDER_UNSUPPORTED",400);
 const db=getPrisma();
 // Provider may not be needed for a fully gift-card-covered order.
 const gateway=input.giftCode?null:await providerForCheckout(input.provider);
 const digest=hash(input);
 const replay=await db.order.findUnique({where:{reservationKey:input.key}});
 if(replay){
  if(replay.testOnly||replay.requestDigest!==digest)throw new CustomerCheckoutError("CHECKOUT_IDEMPOTENCY_CONFLICT",409);
  // A completed/ambiguous external checkout is never silently started again.
  throw new CustomerCheckoutError("CHECKOUT_ALREADY_STARTED",409);
 }
 const items=[...input.lines].sort((a,b)=>a.id-b.id);
 const order=await db.$transaction(async tx=>{
  const variants=await tx.variant.findMany({where:{legacyId:{in:items.map(i=>i.id)}},include:{product:true}});
  if(variants.length!==items.length)throw new CustomerCheckoutError("UNKNOWN_PRODUCT",409);
  const byId=new Map(variants.map(v=>[v.legacyId!,v]));
  let subtotal=0;
  const lines:{variantId:string;quantity:number;unitPriceCents:number;lineTotalCents:number;stockReserved:boolean}[]=[];
  for(const item of items){
   const v=byId.get(item.id)!;
   if(!v.active||!v.product.active||v.product.currency!=="EUR"||v.priceCents<100||
     !Number.isSafeInteger(v.priceCents)||v.stockQuantity!==null&&v.stockQuantity<item.quantity)
     throw new CustomerCheckoutError("ITEM_UNAVAILABLE",409);
   const total=v.priceCents*item.quantity;
   if(total>2000000||subtotal+total>2000000)throw new CustomerCheckoutError("ORDER_TOO_LARGE",400);
   subtotal+=total;lines.push({variantId:v.id,quantity:item.quantity,unitPriceCents:v.priceCents,lineTotalCents:total,stockReserved:v.stockQuantity!==null});
  }
  // NULL inventory is *unlimited/available* by merchant policy; positive stock is
  // reserved atomically, and restored exactly once if an external order is unpaid.
  for(const l of lines){
   const v=variants.find(v=>v.id===l.variantId)!;
   if(v.stockQuantity===null)continue;
   const updated=await tx.variant.updateMany({where:{id:v.id,active:true,stockQuantity:{gte:l.quantity}},data:{stockQuantity:{decrement:l.quantity}}});
   if(updated.count!==1)throw new CustomerCheckoutError("STOCK_CHANGED",409);
  }
  const shipping=shippingDeCents(),gross=subtotal+shipping,tax=grossTax19(gross);
  let cardId:string|null=null,giftApplied=0;
  if(input.giftCode){
   const card=await tx.giftCard.findUnique({where:{codeHash:giftCodeHash(input.giftCode)}});
   if(!card||card.status!=="active"||card.balanceCents<1)throw new CustomerCheckoutError("GIFT_CODE_NOT_AVAILABLE",409);
   cardId=card.id;giftApplied=Math.min(gross,card.balanceCents);
   const spent=await tx.giftCard.updateMany({where:{id:card.id,status:"active",balanceCents:{gte:giftApplied}},data:{balanceCents:{decrement:giftApplied}}});
   if(spent.count!==1)throw new CustomerCheckoutError("GIFT_BALANCE_CHANGED",409);
  }
  const created=await tx.order.create({data:{
   testOnly:false,status:"pending_payment",currency:"EUR",subtotalCents:subtotal,shippingCents:shipping,taxCents:tax,totalCents:gross,giftAppliedCents:giftApplied,
   customerEmail:input.email.toLowerCase(),billingAddress:{...(input.billing||input.shipping),consentToTermsAt:new Date().toISOString()} as Prisma.InputJsonValue,
   shippingAddress:input.shipping as Prisma.InputJsonValue,reservationKey:input.key,requestDigest:digest,
   reservationExpiresAt:new Date(Date.now()+2*60*60*1000),
   lines:{create:lines},statusEvents:{create:{fromStatus:null,toStatus:"pending_payment",reason:"customer_checkout_reserved"}}
  }});
  if(cardId&&giftApplied>0)await tx.giftRedemption.create({data:{cardId,orderId:created.id,amountCents:giftApplied,state:giftApplied===gross?"settled":"reserved",settledAt:giftApplied===gross?new Date():null}});
  if(giftApplied===gross){
   const bill=input.billing||input.shipping,issuedAt=new Date();
   const number=`RH-${issuedAt.getUTCFullYear()}-${String(created.orderNumber).padStart(7,"0")}`;
   const invoiceLines=items.map(item=>{
    const v=variants.find(v=>v.legacyId===item.id)!;
    return {description:`${v.product.name} ${v.colorLabel} ${v.lengthLabel}`,quantity:item.quantity,unitCents:v.priceCents,totalCents:v.priceCents*item.quantity};
   });
   const pdf=createCustomerInvoicePdf({invoiceNumber:number,issuedAt,orderNumber:String(created.orderNumber),
    customerName:bill.firstName+" "+bill.lastName,customerEmail:input.email,
    billingStreet:bill.street,billingPostalCode:bill.postalCode,billingCity:bill.city,
    paymentMethod:"gutschein",paymentReference:"GIFT-"+created.id,lines:invoiceLines,
    subtotalCents:subtotal,shippingCents:shipping,taxCents:tax,totalCents:gross,giftAppliedCents:giftApplied});
   await tx.order.update({where:{id:created.id},data:{status:"payment_confirmed",reservationExpiresAt:null,paymentReference:"GIFT-"+created.id}});
   await tx.paymentEvent.create({data:{orderId:created.id,provider:"gift_card",providerEventId:"GIFT-"+created.id,eventType:"GIFT_REDEEMED"}});
   await tx.orderStatusEvent.create({data:{orderId:created.id,fromStatus:"pending_payment",toStatus:"payment_confirmed",reason:"gift_card_fully_funded"}});
   await tx.invoice.create({data:{orderId:created.id,invoiceNumber:number,issuedAt,seller:RUBY_TEST_SELLER,
    buyer:{name:bill.firstName+" "+bill.lastName,email:input.email,street:bill.street,zip:bill.postalCode,city:bill.city},
    lines:invoiceLines as Prisma.InputJsonValue,taxRate:19,taxCents:tax,totalCents:gross,pdf:new Uint8Array(pdf)}});
   await tx.orderNotification.createMany({data:[{orderId:created.id,stage:"paid"},{orderId:created.id,stage:"paid_admin"}]});
   await tx.shippingJob.create({data:{orderId:created.id,status:"waiting_credentials"}});
  }
  return created;
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:12000});
 if(order.giftAppliedCents===order.totalCents)return {redirectUrl:`https://rubyhair.de/kasse/gutschein/erfolg?orderId=${order.id}&state=${giftOnlySignature(order.id)}`,orderId:order.id,amountCents:0,giftOnly:true};
 // Keep a reservation on ambiguous PSP results so funds cannot be used twice.
 const cashDue=order.totalCents-order.giftAppliedCents;
 if(cashDue<=0)throw new CustomerCheckoutError("GIFT_REMAINDER_INVALID",409);
 const verifiedGateway=gateway||await providerForCheckout(input.provider);
 let klarnaSessionCreated=false;
 try{
  const base=`https://rubyhair.de/kasse/${input.provider}/return?orderId=${order.id}&state=${checkoutSignature(order.id,input.provider)}`;
  let reference:string,url:string;
  if(verifiedGateway.provider==="paypal"){
   const a=await verifiedGateway.api.createOrder({
    orderId:order.id,invoiceId:"RH-"+order.orderNumber.toString(),requestId:"RH-CREATE-"+order.id,
    totalCents:cashDue,shippingCents:Math.min(order.shippingCents,cashDue),
    shipping:{fullName:input.shipping.firstName+" "+input.shipping.lastName,street:input.shipping.street,
      postalCode:input.shipping.postalCode,city:input.shipping.city,country:"DE"},
    returnUrl:base,cancelUrl:base+"&cancel=1"
   });
   reference=a.id;url=a.approvalUrl;
  }else{
   const lines=await db.orderLine.findMany({where:{orderId:order.id},include:{variant:{include:{product:true}}}});
   const session=await verifiedGateway.api.createCustomerPaymentSession(order,lines);
   klarnaSessionCreated=true;
   const page=await verifiedGateway.api.createCustomerHostedPage(session.session_id,base);
   reference="KLARNA-HPP:"+page.session_id;url=page.redirect_url;
  }
  const changed=await db.order.updateMany({where:{id:order.id,status:"pending_payment",paymentReference:null},data:{paymentReference:reference}});
  if(changed.count!==1)throw new CustomerCheckoutError("PROVIDER_ORDER_REQUIRES_REVIEW",503);
  return {redirectUrl:url,orderId:order.id,amountCents:cashDue};
 }catch(error){
  // A deterministic 4xx before a Klarna session exists cannot have authorized a
  // customer. Release only this specific, provably unstarted reservation.
  if(verifiedGateway.provider==="klarna"&&!klarnaSessionCreated&&
     error instanceof KlarnaProviderError&&/^KLARNA_HTTP_(400|401|403)$/.test(error.reason)){
   const released=await db.$transaction(async tx=>{
    const updated=await tx.order.updateMany({
     where:{id:order.id,testOnly:false,status:"pending_payment",paymentReference:null},
     data:{status:"cancelled",reservationExpiresAt:null}
    });
    if(updated.count!==1)return false;
    const stored=await tx.orderLine.findMany({where:{orderId:order.id}});
    for(const line of stored){
     if(line.stockReserved)await tx.variant.updateMany({
      where:{id:line.variantId,stockQuantity:{not:null}},
      data:{stockQuantity:{increment:line.quantity}}
     });
    }
    await tx.orderStatusEvent.create({data:{
     orderId:order.id,fromStatus:"pending_payment",toStatus:"cancelled",
     reason:"klarna_session_rejected_before_creation"
    }});
    return true;
   }).catch(()=>false);
   if(released)throw new CustomerCheckoutError("KLARNA_PROVIDER_REJECTED",503);
  }
  console.error("CUSTOMER_PROVIDER_START_REQUIRES_RECONCILIATION",error instanceof Error?error.name:"unknown");
  throw new CustomerCheckoutError("PROVIDER_ORDER_REQUIRES_REVIEW",503);
 }
}
