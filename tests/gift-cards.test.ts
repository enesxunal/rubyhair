import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 giftInput,digestGift,generateGiftCode,giftCodeHash,giftCodeLooksValid,encryptGiftCode,decryptGiftCode,
 giftCheckoutSignature,giftViewSignature,verifyGiftSignature,escapeGiftXml
} from "../src/lib/gift-cards/rules";
import {PaypalClient} from "../src/lib/paypal-provider-core";
const read=(file:string)=>readFileSync(file,"utf8");
const fixture={key:"86eef83d-57a7-4f65-b82c-bdaeffae6db1",amountCents:10000,buyerEmail:"buyer@example.com",recipientName:"Sophie",senderName:"Anna",message:"Alles Liebe!",theme:"classic",delivery:"download",provider:"paypal"} as const;
test("gift purchase strictly validates Euro amounts, delivery and content",()=>{
 assert.ok(giftInput.safeParse(fixture).success);
 for(const amountCents of [999,50001,10.5,0,-1])assert.ok(!giftInput.safeParse({...fixture,amountCents}).success);
 for(const amountCents of [1000,5000,10000,20000,50000])assert.ok(giftInput.safeParse({...fixture,amountCents}).success);
 assert.ok(!giftInput.safeParse({...fixture,delivery:"email"}).success);
 assert.ok(giftInput.safeParse({...fixture,delivery:"email",recipientEmail:"friend@example.com"}).success);
 assert.ok(!giftInput.safeParse({...fixture,recipientName:"<script>bad</script>"}).success);
 assert.ok(!giftInput.safeParse({...fixture,message:"<iframe>"}).success);
 assert.ok(!giftInput.safeParse({...fixture,provider:"klarna"}).success);
 assert.ok(!giftInput.safeParse({...fixture,unexpected:1}).success);
});
test("gift codes are strong, high entropy, hashed and encrypted at rest",()=>{
 const original=process.env.SESSION_SECRET;
 process.env.SESSION_SECRET="rubyhair-gift-test-secret-is-only-for-local-nonproduction-testing";
 try{
 const a=generateGiftCode(),b=generateGiftCode();
 assert.notEqual(a,b);assert.ok(giftCodeLooksValid(a));
 assert.equal(giftCodeLooksValid("RH-AAAA"),false);
 const codeHash=giftCodeHash(a);
 assert.equal(giftCodeHash(a.toLowerCase().replaceAll("-","")),codeHash);
 assert.ok(!codeHash.includes(a));
 const encrypted=encryptGiftCode(a);
 assert.ok(!encrypted.codeCiphertext.includes(a));
 assert.equal(decryptGiftCode(encrypted),a);
 assert.throws(()=>decryptGiftCode({...encrypted,codeTag:"AAAAAAAAAAAAAAAAAAAAAA"}));
 assert.notEqual(giftViewSignature("11111111-1111-1111-1111-111111111111"),giftCheckoutSignature("11111111-1111-1111-1111-111111111111"));
 assert.ok(verifyGiftSignature("11111111-1111-1111-1111-111111111111",giftViewSignature("11111111-1111-1111-1111-111111111111"),"view-v1"));
 assert.equal(verifyGiftSignature("11111111-1111-1111-1111-111111111111",giftCheckoutSignature("11111111-1111-1111-1111-111111111111"),"view-v1"),false);
 assert.equal(escapeGiftXml("<div>&\"'"),"&lt;div&gt;&amp;&quot;&apos;");
 }finally{if(original===undefined)delete process.env.SESSION_SECRET;else process.env.SESSION_SECRET=original}
});
test("request digest remains stable for an identical form, not for changed amount",()=>{
 assert.equal(digestGift(fixture),digestGift({...fixture}));
 assert.notEqual(digestGift(fixture),digestGift({...fixture,amountCents:20000}));
});
test("PayPal gift method uses verified custom id, exact euros and NO_SHIPPING",async()=>{
 const calls:{url:string;body?:unknown}[]=[];
 const transport=async(url:RequestInfo|URL,init?:RequestInit)=>{
  calls.push({url:String(url),body:init?.body&&typeof init.body==="string"&&init.body.startsWith("{")?JSON.parse(init.body):undefined});
  if(String(url).includes("/oauth2/token"))return new Response(JSON.stringify({access_token:"long-test-token-for-oauth"}),{status:200});
  return new Response(JSON.stringify({id:"PAYER123456",links:[{rel:"approve",href:"https://www.paypal.com/checkoutnow?token=PAYMENT"}]}),{status:200});
 };
 const paypal=new PaypalClient("live",{clientId:"id",clientSecret:"secret",webhookId:"wh"},transport as typeof fetch);
 const id="11111111-1111-1111-1111-111111111111";
 const r=await paypal.createGiftOrder({purchaseId:id,amountCents:20000,returnUrl:"https://rubyhair.de/geschenkgutschein/zahlung?id="+id,cancelUrl:"https://rubyhair.de/geschenkgutschein/zahlung?id="+id+"&cancel=1"});
 assert.equal(r.id,"PAYER123456");
 const data=calls.find(x=>String(x.url).includes("/v2/checkout/orders"))?.body as Record<string,unknown>;
 const unit=(data.purchase_units as Record<string,unknown>[])[0];
 assert.equal(unit.custom_id,id);
 assert.equal((unit.amount as {value:string}).value,"200.00");
 assert.equal((data.payment_source as {paypal:{experience_context:{shipping_preference:string}}}).paypal.experience_context.shipping_preference,"NO_SHIPPING");
 await assert.rejects(()=>paypal.createGiftOrder({purchaseId:id,amountCents:999,returnUrl:"https://rubyhair.de/",cancelUrl:"https://rubyhair.de/"}));
});
test("gift settlement and customer tender are not created on unverified purchase",()=>{
 const server=read("src/lib/gift-cards/server.ts");
 assert.ok(server.includes('gateway.api.requireCompletedCapture(raw,id,purchase.amountCents,purchase.providerOrderId)'));
 assert.ok(server.indexOf('requireCompletedCapture(raw,id')<server.indexOf('tx.giftCard.create'));
 assert.ok(server.includes('status:"captured"'));
 assert.ok(server.includes('RUBY_GIFT_CARDS_LIVE_ENABLED'));
 const checkoutPreview=read("src/components/checkout-preview.tsx");
 assert.ok(checkoutPreview.includes('rh-gift-summary-deduction'));
 assert.ok(checkoutPreview.includes('rh-gift-summary-remaining'));
 assert.ok(checkoutPreview.includes('Noch zu zahlen'));
 assert.ok(checkoutPreview.includes('euros(remainingCents/100)'));
 const checkout=read("src/lib/customer-checkout.ts");
 assert.ok(checkout.includes('balanceCents:{gte:giftApplied}'));
 assert.ok(checkout.includes('tx.giftRedemption.create'));
 assert.ok(checkout.includes('giftAppliedCents:giftApplied'));
 assert.ok(checkout.includes('giftApplied===gross'));
 assert.ok(checkout.includes('giftOnlySignature'));
 const finalize=read("src/lib/customer-order-finalize.ts");
 assert.ok(finalize.includes('order.totalCents-order.giftAppliedCents'));
 assert.ok(finalize.includes('tx.giftRedemption.updateMany'));
 const worker=read("src/lib/customer-automation.ts");
 assert.ok(worker.includes('state:"released"'));
 assert.ok(worker.includes('balanceCents:{increment:redemption.amountCents}'));
});
test("public gift image routes are proofed and private; admin history is isolated",()=>{
 const route=read("app/api/gutschein/bild/[id]/route.tsx");
 assert.ok(route.includes('getPaidGiftByLink(id,sign)'));
 assert.ok(route.includes('"Cache-Control","private, no-store'));
 assert.ok(route.includes('"Content-Disposition"'));
 const admin=read("app/admin/gutscheine/page.tsx");
 assert.ok(admin.includes('isAdmin()'));
 assert.ok(admin.includes('balanceCents'));
 const proxy=read("proxy.ts");
 assert.ok(proxy.includes('api\\/gutschein\\/bild'));
 const form=read("src/components/gift-composer.tsx");
 assert.ok(form.includes('enabled:boolean'));
 assert.ok(form.includes('disabled={!enabled'));
 assert.ok(form.includes('Geschenkgutschein'));
 const smtp=read("src/lib/gift-cards/mail.ts");
 assert.ok(smtp.includes('status:"captured"'));
 assert.ok(smtp.includes('giftViewUrl(purchase.id)'));
 assert.ok(smtp.includes('Gutscheincode:'));
});
test("migration preserves existing payment and inventory tables",()=>{
 const sql=read("prisma/migrations/20261119190000_gift_cards/migration.sql");
 for(const name of ["gift_purchases","gift_cards","gift_redemptions"])assert.ok(sql.includes('CREATE TABLE "'+name+'"'));
 assert.ok(sql.includes('giftAppliedCents'));
 assert.ok(!/DROP TABLE|DELETE FROM|UPDATE "orders"|ALTER TABLE "payment_events"|ALTER TABLE "variants"|ALTER TABLE "invoices"/.test(sql));
});
