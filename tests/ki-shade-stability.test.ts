import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(p:string)=>readFileSync(p,"utf8");

test("AI colors follow Ruby Hair color numbers, including letter-suffix shades",()=>{
 const lab=read("src/components/hair-tryon-lab.tsx");
 const page=read("app/haar-anprobe/page.tsx");
 assert.match(lab,/SHADE_ORDER=\["1","1b","2","2b","4","6","7","8","9a","10","60"/);
 assert.match(lab,/sort\(\(a,b\)=>shadeRank\(a.code\)-shadeRank\(b.code\)/);
 assert.match(lab,/useState\(true\)/);
 assert.match(lab,/Farbnummer/);
 assert.match(lab,/v.code.toUpperCase/);
 assert.match(page,/code:v.color/);
 assert.match(page,/key:p.slug/);
});

test("catalog marketing pages use short-lived shared read cache without changing checkout stock source",()=>{
 const catalog=read("src/lib/catalog-server.ts");
 const admin=read("app/admin/actions.ts");
 const checkout=read("src/lib/customer-checkout.ts");
 const storefrontError=read("app/error.tsx");
 assert.match(catalog,/unstable_cache/);
 assert.match(catalog,/revalidate:60/);
 assert.match(catalog,/rubyhair-live-catalog/);
 assert.match(admin,/updateTag\("rubyhair-live-catalog"\)/);
 assert.match(checkout,/stockQuantity!==null/);
 assert.match(storefrontError,/Seite erneut laden/);
});
