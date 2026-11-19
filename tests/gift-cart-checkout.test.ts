import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {giftCartItemSchema,normaliseGiftCart,giftCartTotal} from "../src/lib/gift-cards/cart-schema";
import {checkoutInput} from "../src/lib/customer-checkout-schema";
import {PaypalClient} from "../src/lib/paypal-provider-core";
const read=(name:string)=>readFileSync(name,"utf8");
const id="ec009231-2c8e-4731-b6cb-adb207810cc0";
const gift={id,amountCents:10000,recipientName:"Sophie",senderName:"Anna",theme:"classic",delivery:"download"} as const;
const shipping={firstName:"Ruby",lastName:"Test",street:"Beispielstraße 12",postalCode:"45130",city:"Essen",country:"DE"} as const;
const base={key:"b7bffcbf-3bd8-42e6-aa2b-785e1b842e3d",provider:"paypal",lines:[],gifts:[gift],shipping,email:"buyer@example.com",consent:true};
test("gift items are client-safe, uniquely identified, survive reloads and capped at five",()=>{
 assert.ok(giftCartItemSchema.safeParse(gift).success);
 assert.equal(giftCartTotal([gift,{...gift,amountCents:5000}]),15000);
 assert.equal(normaliseGiftCart([gift,gift,{...gift,id:"90900626-b90f-4b5b-8b30-b30cdd31c724"}]).length,2);
 assert.equal(normaliseGiftCart(Array.from({length:8},(_,i)=>({...gift,id:`00000000-0000-4000-8000-${String(i).padStart(12,"0")}`}))).length,5);
 for(const amountCents of [0,999,50001,-500])assert.ok(!giftCartItemSchema.safeParse({...gift,amountCents}).success);
 assert.ok(!giftCartItemSchema.safeParse({...gift,recipientName:"<script>"}).success);
 assert.ok(!giftCartItemSchema.safeParse({...gift,delivery:"email"}).success);
 assert.ok(giftCartItemSchema.safeParse({...gift,delivery:"email",recipientEmail:"sophie@example.com"}).success);
});
test("gift-only, physical+gift, legacy physical purchase use one secure checkout schema",()=>{
 assert.ok(checkoutInput.safeParse(base).success);
 assert.ok(checkoutInput.safeParse({...base,lines:[{id:1782,quantity:1}]}).success);
 assert.ok(checkoutInput.safeParse({...base,lines:[{id:1782,quantity:1}],gifts:[]}).success);
 assert.ok(!checkoutInput.safeParse({...base,lines:[],gifts:[]}).success);
 assert.ok(!checkoutInput.safeParse({...base,provider:"klarna"}).success);
 assert.ok(!checkoutInput.safeParse({...base,giftCode:"RH-ABCD-EFGH-JKLM-NPQR-STUV"}).success);
 assert.ok(!checkoutInput.safeParse({...base,gifts:[gift,gift]}).success);
 assert.ok(!checkoutInput.safeParse({...base,gifts:Array.from({length:6},(_,i)=>({...gift,id:`00000000-0000-4000-8000-${String(i).padStart(12,"0")}`}))}).success);
});
test("customer checkout amount includes all gift lines, charges physical shipping only once",()=>{
 const source=read("src/lib/customer-checkout.ts");
 assert.ok(source.includes('const shipping=items.length?shippingDeCents():0'));
 assert.ok(source.includes('gross=subtotal+digitalTotal+shipping'));
 assert.ok(source.includes('cartOrderId:created.id'));
 assert.ok(source.includes('digitalTotal=giftCartTotal(giftItems)'));
 assert.ok(source.includes('verifiedGateway.api.createGiftOrder'));
 assert.ok(source.includes('orderId:order.id,invoiceId:'));
 assert.ok(source.includes('giftItems.length&&!items.length'));
});
test("no voucher exists before verified payment and gift-only never schedules DHL",()=>{
 const final=read("src/lib/customer-order-finalize.ts");
 assert.ok(final.includes('issuedGifts=order.giftPurchases.map'));
 assert.ok(final.includes('if(order.lines.length)await tx.shippingJob.upsert'));
 assert.ok(final.includes('tx.giftCard.create'));
 assert.ok(final.indexOf('tx.order.updateMany')<final.indexOf('tx.giftCard.create'));
 assert.ok(final.includes('order.giftPurchases.reduce'));
 const webhook=read("app/api/payments/paypal/webhook/route.ts");
 const returnPage=read("app/kasse/paypal/return/page.tsx");
 assert.ok(webhook.includes('deliverGiftEmails(5)'));
 assert.ok(returnPage.includes('deliverGiftEmails(5)'));
 assert.ok(returnPage.includes('CheckoutSuccessClear'));
});
test("gift cart does not redirect directly to PayPal and works in the same cart",()=>{
 const form=read("src/components/gift-composer.tsx"),cart=read("src/components/cart-context.tsx");
 assert.ok(form.includes('cart.addGift('));assert.ok(form.includes('router.push("/warenkorb/")'));
 assert.ok(!form.includes('fetch("/api/gutschein/kaufen"'));
 assert.ok(cart.includes('rubyhair-gift-cart-v1'));
 assert.ok(cart.includes('setGifts(prev=>prev.filter'));
 const address=read("src/components/checkout-address-preview.tsx");
 assert.ok(address.includes('digitalOnly?"Deine Rechnungsadresse."'));
});
test("PayPal gift-only aggregated basket uses NO_SHIPPING and exact total",async()=>{
 const calls:any[]=[];
 const transport=async(url:RequestInfo|URL,init?:RequestInit)=>{
  if(String(url).includes("oauth2/token"))return new Response(JSON.stringify({access_token:"test-token-012345678901"}),{status:200});
  calls.push(JSON.parse(init?.body as string));
  return new Response(JSON.stringify({id:"PAYPAL22334455",links:[{rel:"approve",href:"https://www.paypal.com/checkoutnow?token=TEST"}]}),{status:200});
 };
 const api=new PaypalClient("live",{clientId:"id",clientSecret:"sec",webhookId:"wh"},transport as typeof fetch);
 await api.createGiftOrder({purchaseId:id,amountCents:250000,returnUrl:"https://rubyhair.de/kasse/paypal/return?orderId="+id,cancelUrl:"https://rubyhair.de/kasse/paypal/return?cancel=1"});
 assert.equal(calls.length,1);
 assert.equal(calls[0].purchase_units[0].amount.value,"2500.00");
 assert.equal(calls[0].payment_source.paypal.experience_context.shipping_preference,"NO_SHIPPING");
 assert.equal(calls[0].purchase_units[0].custom_id,id);
});
