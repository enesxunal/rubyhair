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

import {singleFlight} from "../src/lib/single-flight";
test("concurrent catalog reads share one pending operation and retry cleanly after failure",async()=>{
 let calls=0;
 let fail=false;
 const read=singleFlight(async()=>{calls++;await Promise.resolve();if(fail)throw Error("read failed");return calls;});
 assert.deepEqual(await Promise.all([read(),read(),read()]),[1,1,1]);
 assert.equal(calls,1);
 fail=true;
 const results=await Promise.allSettled([read(),read()]);
 assert.ok(results.every(r=>r.status==="rejected"));
 assert.equal(calls,2);
 fail=false;
 assert.equal(await read(),3);
});
test("search shows a local loading or retry state without treating database errors as empty stock",()=>{
 const page=read("app/suche/page.tsx");
 const component=read("src/components/search-catalog.tsx");
 assert.ok(!page.includes("getStoreCatalog"));
 assert.ok(page.includes("<SearchCatalog"));
 assert.match(component,/data.source!=="postgresql"/);
 assert.match(component,/role="alert"/);
 assert.match(component,/role="status"/);
 assert.ok(component.includes("Erneut laden"));
});
