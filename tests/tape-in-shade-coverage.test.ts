import {test} from "node:test";
import assert from "node:assert/strict";
import {existsSync} from "node:fs";
import {join} from "node:path";
import {products} from "../src/lib/catalog";
import {collectionShadeCards,RUBY_TAPE_IN_SHADES} from "../src/lib/tape-in-shades";

const tape=products.find(p=>p.slug==="tape-in-extensions");
const keratin=products.find(p=>p.slug==="keratin-bondings");
if(!tape||!keratin)throw new Error("PRODUCT_FIXTURES_MISSING");

test("all 18 merchant-requested Tape-in colors are visible without inventing an extra purchasable variant",()=>{
 const cards=collectionShadeCards(tape);
 assert.equal(RUBY_TAPE_IN_SHADES.length,18);
 assert.deepEqual(cards.map(c=>c.color),RUBY_TAPE_IN_SHADES.map(c=>c.code));
 assert.equal(cards.length,18);
 assert.equal(cards.filter(c=>c.status==="listed").length,17);
 assert.deepEqual(cards.filter(c=>c.status==="not-listed").map(c=>c.color),["1b"]);
 const ref=cards.find(c=>c.color==="1b");
 assert.ok(ref?.referenceOnly);
 assert.ok(ref?.image.endsWith("/media/1b-600x600-ed411886a.jpg"));
 assert.equal(ref?.selectedVariants.length,0);
 assert.equal(ref?.available.length,0);
 for(const card of cards){
  assert.ok(existsSync(join(process.cwd(),"public",card.image.replace(/^\//,""))),card.image);
 }
});

test("45-50 cm displays 18 colors; missing six are non-sellable previews",()=>{
 const cards=collectionShadeCards(tape,"45-50-cm");
 assert.equal(cards.length,18);
 assert.equal(cards.filter(c=>c.status==="listed").length,12);
 assert.deepEqual(cards.filter(c=>c.status==="not-listed").map(c=>c.color),["1b","2","2b","9a","ruby","silver"]);
 for(const c of cards.filter(c=>c.status==="not-listed")){
  assert.equal(c.available.length,0);
  assert.equal(c.selectedVariants.length,0);
 }
});

test("55-60 cm displays 18 colors; missing three are non-sellable previews",()=>{
 const cards=collectionShadeCards(tape,"55-60-cm");
 assert.equal(cards.length,18);
 assert.equal(cards.filter(c=>c.status==="listed").length,15);
 assert.deepEqual(cards.filter(c=>c.status==="not-listed").map(c=>c.color),["1","1b","eve"]);
 for(const c of cards.filter(c=>c.status==="not-listed")){
  assert.equal(c.available.length,0);
  assert.equal(c.selectedVariants.length,0);
 }
});

test("Keratin keeps its existing 11 genuine shades; Tape-in cards never create a product variation",()=>{
 const keratinCards=collectionShadeCards(keratin);
 assert.equal(keratinCards.length,11);
 assert.ok(keratinCards.every(c=>c.status==="listed"));
 const tapeCards=collectionShadeCards(tape);
 const listedVariantIds=new Set(tape.variations.map(v=>v.id));
 assert.equal(tape.variations.length,27);
 assert.ok(tapeCards.flatMap(c=>c.available).every(v=>listedVariantIds.has(v.id)));
});
