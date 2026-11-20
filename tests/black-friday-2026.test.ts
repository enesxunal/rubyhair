import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {products} from "../src/lib/catalog";
import {
 blackFridayActive,blackFridayUnitCents,blackFridayCatalog,documentedEarlierPriceCents,
 BLACK_FRIDAY_START,BLACK_FRIDAY_END
} from "../src/lib/black-friday";

const read=(s:string)=>readFileSync(s,"utf8");
test("Berlin 20–30 Nov 2026 campaign boundaries are exact, automatically expire",()=>{
 assert.equal(BLACK_FRIDAY_START,"2026-11-19T23:00:00.000Z");
 assert.equal(BLACK_FRIDAY_END,"2026-11-30T23:00:00.000Z");
 assert.equal(blackFridayActive(new Date("2026-11-19T22:59:59Z")),false);
 assert.equal(blackFridayActive(new Date("2026-11-19T23:00:00Z")),true);
 assert.equal(blackFridayActive(new Date("2026-11-30T22:59:59Z")),true);
 assert.equal(blackFridayActive(new Date("2026-11-30T23:00:00Z")),false);
});
test("Sale prices are rounded once per unit in integer cents, never from client input",()=>{
 const inside=new Date("2026-11-20T13:00:00Z");
 assert.equal(blackFridayUnitCents(14000,"tape-in-extensions",inside),11900);
 assert.equal(blackFridayUnitCents(16500,"tape-in-extensions",inside),14025);
 assert.equal(blackFridayUnitCents(10001,"keratin-bondings",inside),8501);
 assert.equal(blackFridayUnitCents(14000,"tape-in-extensions",new Date("2026-12-01")),14000);
 assert.equal(blackFridayUnitCents(10000,"geschenkgutschein",inside),10000);
 assert.equal(blackFridayUnitCents(100,"rubyhair-intern-qa-1-eur",inside,"INTERNAL_QA"),100);
});
test("Every active physical catalog variation shows discount, old price and documented earlier amount without base mutation",()=>{
 const now=new Date("2026-11-20T15:00:00Z");
 const before=JSON.stringify(products);
 const sale=blackFridayCatalog(products,now);
 let active=0;
 for(const item of sale)for(const v of item.variations){
  const original=products.find(p=>p.slug===item.slug)!.variations.find(old=>old.id===v.id)!;
  if(!v.available||!v.purchasable){
   assert.equal(v.original_price,undefined);
   continue;
  }
  active++;
  assert.equal(v.original_price,original.price);
  assert.equal(Math.round(v.price*100),Math.round(Math.round(original.price*100)*0.85));
  const recorded=documentedEarlierPriceCents(v.id,item.slug,Math.round(original.price*100));
  if(recorded!==null)assert.equal(v.documented_prior_price,recorded/100);
 }
 assert.ok(active>30);
 assert.equal(JSON.stringify(products),before);
 assert.deepEqual(blackFridayCatalog(products,new Date("2026-12-01")),products);
});
test("Price reduction is applied to stored order lines, invoices and providers after stock check",()=>{
 const checkout=read("src/lib/customer-checkout.ts");
 assert.ok(checkout.includes("blackFridayUnitCents(v.priceCents,v.product.slug,pricedAt,v.product.material)"));
 assert.ok(checkout.includes("unitPriceCents,lineTotalCents:total"));
 assert.ok(checkout.includes("unitCents:stored.unitPriceCents,totalCents:stored.lineTotalCents"));
 assert.ok(checkout.includes("subtotalCents:subtotal+digitalTotal"));
 assert.ok(checkout.includes("giftCartTotal(giftItems)"));
 const priceFeed=read("src/lib/catalog-server.ts");
 assert.ok(priceFeed.includes('blackFridayCatalog(await liveProducts())'));
 assert.ok(priceFeed.includes('blackFridayCatalog(importedProducts)'));
 const quote=read("src/lib/cart-quote.ts");
 assert.ok(quote.includes("Math.round(v.price*100)"));
});
test("UI has per-second banner, responsive popup, all-products labels and original prices",()=>{
 const promo=read("src/components/black-friday-experience.tsx");
 const css=read("src/styles/black-friday.css");
 assert.ok(promo.includes("setInterval(tick,1000)"));
 assert.ok(promo.includes("sessionStorage.setItem(SHOWN_KEY"));
 assert.ok(promo.includes('role="dialog"'));
 assert.ok(promo.includes("localStorage.getItem"));
 assert.ok(promo.includes("setOpen(false)"));
 assert.ok(promo.includes("window.location.reload()"));
 assert.ok(css.includes("max-width:550px"));
 for(const file of ["src/components/product-detail.tsx","src/components/shade-grid.tsx","src/components/product-search.tsx","src/components/cart-page.tsx"]){
  assert.ok(read(file).includes("original_price"),file);
 }
 assert.ok(read("app/kollektionen/page.tsx").includes("BlackFridayBadge"));
});
