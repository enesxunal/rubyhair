import test from "node:test";
import assert from "node:assert/strict";
import {buildMerchantFeed} from "../src/lib/merchant-feed";
import {blackFridayCatalog} from "../src/lib/black-friday";
import type {Product,Variation} from "../src/lib/catalog";
const v={id:883,color:"6",color_label:"Braun & Gold",length:"55-60-cm",length_label:"55–60 cm",price:165,available:true,purchasable:true,image:"/assets/a.webp",stock_quantity:3} satisfies Variation;
const p={slug:"tape-in-extensions",name:"Tape-in Extensions",intro:"Echthaar & Pflege",pack:"10 Tape-ins",material:"Echthaar",currency:"EUR",variations:[v,{...v,id:886},{...v,id:884,stock_quantity:0},{...v,id:885,image:"https://other.example/image.jpg"},{...v,id:887,purchasable:false}]} as Product;
test("feed uses current sale price, exact variant URL, stable SKU and real available products",()=>{
 const feed=buildMerchantFeed(blackFridayCatalog([p],new Date("2026-11-28T00:00:00Z")),"https://rubyhair.de",499);
 assert.equal((feed.match(/<item>/g)||[]).length,1);
 assert.ok(feed.includes("<g:id>RH-883</g:id>"));
 assert.ok(feed.includes("140.25 EUR")&&feed.includes("4.99 EUR"));
 assert.ok(feed.includes("farbe=6&amp;laenge=55-60-cm"));
 assert.ok(feed.includes("Braun &amp; Gold")&&feed.includes("Echthaar &amp; Pflege"));
 assert.ok(!feed.includes("gtin")&&!feed.includes("mpn")&&!feed.includes("sale_price"));
});
test("expired campaign uses regular current price; invalid and internal products are never published",()=>{
 const feed=buildMerchantFeed(blackFridayCatalog([p,{...p,slug:"internal-test"}],new Date("2026-12-02T00:00:00Z")),"https://rubyhair.de",499);
 assert.ok(feed.includes("165.00 EUR"));
 assert.equal((feed.match(/<item>/g)||[]).length,1);
});
