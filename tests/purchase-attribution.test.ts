import {test} from "node:test";
import assert from "node:assert/strict";
import {purchaseTouch,touchSchema,updatedTouch,touchLabel} from "../src/lib/purchase-attribution-policy";
const url="https://rubyhair.de/";
test("known paid Meta sources are distinct; paid cannot be inferred merely from referrer",()=>{
 assert.equal(purchaseTouch(url+"?utm_source=instagram&utm_medium=paid_social&utm_content=instagram_post","","mobile")?.source,"meta_post");
 assert.equal(purchaseTouch(url+"?utm_source=meta&utm_medium=cpc&utm_content=elaine_reels_15s","","mobile")?.source,"meta_reels");
 assert.equal(purchaseTouch(url,"https://l.instagram.com/","mobile")?.source,"instagram");
 assert.equal(purchaseTouch(url,"https://www.google.de/","desktop")?.source,"google");
 assert.equal(purchaseTouch(url,"https://paypal.com/","desktop"),null);
 assert.equal(purchaseTouch(url,"https://www.rubyhair.de/produkt/test","desktop"),null);
});
test("direct or stripped referrer is unknown and does not overwrite last known source",()=>{
 const a=purchaseTouch(url+"?utm_source=meta&utm_medium=paid","","mobile")!;
 const b=purchaseTouch(url,"","mobile")!;
 assert.equal(b.source,"direct_unknown");assert.equal(updatedTouch(a,b).source,"meta_paid");assert.equal(touchLabel(null),"Unbekannt / keine Zuordnung");
});
test("only known categories and bounded numeric Meta IDs; no URL, click ID or personal fields",()=>{
 const a=purchaseTouch(url+"?utm_source=meta&utm_medium=cpc&utm_content=private@example.com&utm_id=123456789012345&fbclid=secret&ad_id=private@example.com","","mobile")!;
 const cleaned=JSON.parse(JSON.stringify(a));assert.ok(touchSchema.safeParse(cleaned).success);assert.equal(cleaned.campaignId,"123456789012345");assert.ok(!JSON.stringify(cleaned).includes("secret"));assert.ok(!JSON.stringify(cleaned).includes("@"));
 assert.equal(touchSchema.safeParse({...cleaned,referrer:"https://example.com/private"}).success,false);
 assert.equal(touchSchema.safeParse({source:"google",device:"mobile",campaignId:"123456789012345"}).success,false);
});
