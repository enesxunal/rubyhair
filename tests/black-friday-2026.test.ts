import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {products} from "../src/lib/catalog";
import {checkoutInput} from "../src/lib/customer-checkout-schema";
import {
 blackFridayActive,blackFridayCouponValid,blackFridayUnitCents,blackFridayCatalog,
 BLACK_FRIDAY_START,BLACK_FRIDAY_END,BLACK_FRIDAY_CODE
} from "../src/lib/black-friday";
const read=(s:string)=>readFileSync(s,"utf8");
const at=new Date("2026-11-22T14:00:00Z");
test("BLACKFRIDAY 15% coupon campaign Berlin start and end strictly enforced",()=>{
 assert.equal(BLACK_FRIDAY_START,"2026-11-19T23:00:00.000Z");
 assert.equal(BLACK_FRIDAY_END,"2026-11-30T23:00:00.000Z");
 assert.equal(BLACK_FRIDAY_CODE,"BLACKFRIDAY");
 assert.equal(blackFridayActive(new Date("2026-11-19T22:59:59Z")),false);
 assert.equal(blackFridayCouponValid("BLACKFRIDAY",new Date("2026-11-19T22:59:59Z")),false);
 assert.equal(blackFridayCouponValid("blackfriday",new Date("2026-11-19T23:00:00Z")),true);
 assert.equal(blackFridayCouponValid(" BlackFriday ",new Date("2026-11-30T22:59:59Z")),true);
 assert.equal(blackFridayCouponValid("BLACKFRIDAY",new Date("2026-11-30T23:00:00Z")),false);
 assert.equal(blackFridayCouponValid("BF15",at),false);
});
test("Automatic sale applies without a code; explicit correct code never doubles it",()=>{
 assert.equal(blackFridayUnitCents(14000,"tape-in-extensions",at),11900);
 assert.equal(blackFridayUnitCents(14000,"tape-in-extensions",at,undefined,"badcode"),14000);
 assert.equal(blackFridayUnitCents(14000,"tape-in-extensions",at,undefined,"blackfriday"),11900);
 assert.equal(blackFridayUnitCents(16500,"tape-in-extensions",at,undefined,"BLACKFRIDAY"),14025);
 assert.equal(blackFridayUnitCents(10001,"keratin-bondings",at,undefined,"BLACKFRIDAY"),8501);
 assert.equal(blackFridayUnitCents(14000,"tape-in-extensions",new Date("2026-12-01T00:00:00Z"),undefined,"BLACKFRIDAY"),14000);
 assert.equal(blackFridayUnitCents(5000,"geschenkgutschein",at,undefined,"BLACKFRIDAY"),5000);
 assert.equal(blackFridayUnitCents(100,"rubyhair-intern-qa-1-eur",at,"INTERNAL_QA","BLACKFRIDAY"),100);
 assert.equal(blackFridayUnitCents(14000,"tape-in-extensions",at,undefined,"BLACKFRIDAY")*2,23800);
});
test("Display catalog projects the sale once; raw server catalog remains unchanged",()=>{
 assert.notStrictEqual(blackFridayCatalog(products,at),products);
 assert.strictEqual(blackFridayCatalog(products,new Date(BLACK_FRIDAY_END)),products);
 for(const p of products){const discounted=blackFridayCatalog([p],at)[0];for(const [i,v] of p.variations.entries())assert.equal(discounted.variations[i].price,blackFridayUnitCents(Math.round(v.price*100),p.slug,at,p.material)/100); }
 for(const product of blackFridayCatalog(products,at))for(const v of product.variations){
  assert.equal(v.original_price,undefined);
  assert.equal(v.documented_prior_price,undefined);
 }
 const server=read("src/lib/catalog-server.ts");
 assert.ok(server.includes("products:await liveProducts()"));
});
test("Server quote, checkout reservation, providers, order lines and invoices use automatic pricing",()=>{
 const quote=read("src/lib/cart-quote.ts"),checkout=read("src/lib/customer-checkout.ts");
 assert.ok(quote.includes("blackFridayUnitCents(regularCents,p.slug,pricedAt,p.material,request.couponCode)"));
 assert.ok(quote.includes("couponError")&&quote.includes("regularSubtotalCents-subtotalCents"));
 assert.ok(quote.includes("checkoutEnabled:!couponError"));
 assert.ok(checkout.includes('if(input.couponCode&&!blackFridayCouponValid(input.couponCode,pricedAt))'));
 assert.ok(checkout.includes("blackFridayUnitCents(v.priceCents,v.product.slug,pricedAt,v.product.material,input.couponCode)"));
 assert.ok(checkout.includes("unitPriceCents,lineTotalCents:total"));
 assert.ok(checkout.includes("subtotalCents:subtotal+digitalTotal"));
 assert.ok(checkout.includes("giftCartTotal(giftItems)"));
 assert.ok(checkout.includes("couponCode:normalizedPromoCode(input.couponCode)||null"));
 assert.ok(read("src/components/customer-payment-submit.tsx").includes("giftCode,couponCode,consent:true"));
 assert.ok(read("src/components/checkout-preview.tsx").includes("useCartQuote(lines,couponCode)"));
 assert.ok(read("src/components/cart-page.tsx").includes("setCouponCode(couponDraft)"));
});
test("Checkout schema accepts separate coupon and existing gift code, rejects excessive input",()=>{
 const address={firstName:"Julia",lastName:"Muster",street:"Beispielstrasse 5",postalCode:"45127",city:"Essen",country:"DE"};
 const basic={key:"123e4567-e89b-42d3-a456-426614174000",provider:"paypal",lines:[{id:886,quantity:1}],shipping:address,email:"test@example.com",consent:true};
 assert.equal(checkoutInput.safeParse({...basic,couponCode:"BLACKFRIDAY"}).success,true);
 assert.equal(checkoutInput.safeParse({...basic,couponCode:"x".repeat(100)}).success,false);
 assert.equal(checkoutInput.safeParse({...basic,giftCode:"RH-ABCD-ABCD-ABCD-ABCD-ABCD",couponCode:"BLACKFRIDAY"}).success,true);
});
test("Campaign displays automatic prices and prefilled coupon",()=>{
 const promo=read("src/components/black-friday-experience.tsx");
 assert.ok(promo.includes("setInterval(tick,1000)"));
 assert.ok(promo.includes("coupon-popup-shown"));
 assert.ok(promo.includes("Der Code BLACKFRIDAY wird automatisch angewendet."));
 assert.ok(promo.includes("Der Aktionspreis gilt direkt im Shop"));
 assert.ok(read("src/components/black-friday-badge.tsx").includes("BLACK FRIDAY · –15 %"));
 assert.ok(read("app/kollektionen/page.tsx").includes("BlackFridayBadge"));
 assert.ok(!read("src/components/product-detail.tsx").includes("<del aria-label=\"Preis vor Black Friday\""));
});
