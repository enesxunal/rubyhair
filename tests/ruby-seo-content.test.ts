import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {guides} from "../src/lib/hair-guide-articles";
const read=(f:string)=>readFileSync(f,"utf8");
test("distinct original German SEO guides have correct canonicals and sitemap entries",()=>{
 assert.equal(guides.length,3);
 assert.equal(new Set(guides.map(g=>g.slug)).size,guides.length);
 for(const g of guides){
  assert.ok(g.title.length>35);
  assert.ok(g.description.length>70);
  assert.ok(g.sections.length>=4);
  assert.ok(g.sections.flatMap(s=>s.paragraphs).join(" ").length>750);
 }
 const articles=read("app/ratgeber/[slug]/page.tsx");
 assert.ok(articles.includes('alternates:{canonical:`/ratgeber/${article.slug}/`}'));
 assert.ok(articles.includes('"@type":"Article"'));
 const sitemap=read("app/sitemap.ts");
 assert.ok(sitemap.includes('...guides.map(g=>`/ratgeber/${g.slug}/`)'));
 assert.ok(sitemap.includes('/produkt/keratin-bondings/'));
 assert.ok(!sitemap.includes('?laenge='));
});
test("live active product markup uses actual availability and not fabricated ratings",()=>{
 const page=read("app/produkt/[slug]/page.tsx");
 assert.ok(page.includes('"@type":"ProductGroup"'));
 assert.ok(page.includes('"@type":"Offer"'));
 assert.ok(page.includes('buyableVariant(v)?'));
 assert.ok(!page.includes('product?.slug==="keratin-bondings"?{robots'));
 assert.ok(!page.includes('"aggregateRating"'));
 const collection=read("app/kollektionen/[slug]/page.tsx");
 assert.ok(collection.includes('alternates:{canonical:`/kollektionen/${product?.slug||""}/`}'));
});
