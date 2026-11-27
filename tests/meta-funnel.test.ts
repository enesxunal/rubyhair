import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {metaFunnelSchema,metaFunnelData,quoteMatchesFunnel,META_FUNNEL_CHOICE} from "../src/lib/meta-funnel-policy";
import {trackRubyMetaFunnel} from "../src/lib/meta-pixel";
const id="6f73b55b-a6c3-465e-af15-5c6e7c18fbdd";
const items=[{id:869,quantity:2,unitCents:12750}];
const input={event:"AddToCart" as const,eventId:id,source:"/produkt/keratin-bondings" as const,items,couponCode:"BLACKFRIDAY" as const};
test("only known non-purchase funnel events, valid ID, known paths, and strict non-PII data",()=>{
 assert.ok(metaFunnelSchema.safeParse(input).success);
 for(const invalid of [{...input,event:"Purchase"},{...input,eventId:"email@example.com"},{...input,email:"email@example.com"},{...input,source:"/kasse?email=example"},{...input,items:[...items,...items]},{...input,items:[{...items[0],quantity:100}]},{...input,items:[{...items[0],unitCents:100}]},{...input,couponCode:"PRIVATE"},{...input,event:"ViewContent"},{...input,event:"InitiateCheckout"}])assert.equal(metaFunnelSchema.safeParse(invalid).success,false);
});
test("server verified discounted unit prices, quantity, stock and real catalog; browser/server same value",()=>{
 const quote={source:"postgresql",needsReview:false,couponError:false,lines:[{...items[0],status:"available"}]};
 assert.ok(quoteMatchesFunnel(input,quote));
 assert.equal(metaFunnelData(items).value,255);
 assert.deepEqual(metaFunnelData(items).content_ids,["869"]);
 assert.equal(metaFunnelData(items).currency,"EUR");
 assert.equal(quoteMatchesFunnel(input,{...quote,source:"imported-preview"}),false);
 assert.equal(quoteMatchesFunnel(input,{...quote,couponError:true}),false);
 assert.equal(quoteMatchesFunnel(input,{...quote,lines:[{...quote.lines[0],unitCents:15000}]}),false);
 assert.equal(quoteMatchesFunnel(input,{...quote,needsReview:true,lines:[{...quote.lines[0],status:"out-of-stock"}]}),false);
});
test("browser and server use identical event ID and verified input shape only on expanded consent",()=>{
 const globals=globalThis as unknown as Record<string,unknown>,keys=["window","localStorage","location","document","fetch"];
 const saved=Object.fromEntries(keys.map(k=>[k,globals[k]]));
 const old=process.env.NEXT_PUBLIC_RUBY_META_CAPI_ENABLED;
 const seen:unknown[][]=[],requests:{url:string;data:Record<string,unknown>}[]=[];
 const choices=new Map<string,string>();
 try{
  process.env.NEXT_PUBLIC_RUBY_META_CAPI_ENABLED="APPROVED";
  globals.window={fbq:(...a:unknown[])=>seen.push(a)};
  globals.localStorage={getItem:(k:string)=>choices.get(k)||null};
  globals.location={pathname:"/produkt/keratin-bondings/"};
  globals.document={cookie:"_fbp=fb.1.1760000000000.12345"};
  globals.fetch=(url:string,opts:{body:string})=>{requests.push({url,data:JSON.parse(opts.body)});return Promise.resolve({ok:true})};
  assert.equal(trackRubyMetaFunnel("AddToCart",items),false);
  assert.equal(seen.length,0);assert.equal(requests.length,0);
  choices.set("ruby_marketing_choice","allow");choices.set("ruby_meta_capi_choice","allow");
  assert.equal(trackRubyMetaFunnel("AddToCart",items),true);
  assert.deepEqual(seen.pop(),["track","AddToCart"]);assert.equal(requests.length,0);
  choices.set(META_FUNNEL_CHOICE,"allow");
  assert.equal(trackRubyMetaFunnel("AddToCart",items,"BLACKFRIDAY"),true);
  assert.equal(requests.length,1);assert.equal(requests[0].url,"/api/meta/funnel");
  assert.equal((seen[0][3] as {eventID:string}).eventID,requests[0].data.eventId);
  assert.deepEqual(seen[0][2],metaFunnelData(items));
  assert.equal(metaFunnelSchema.safeParse(requests[0].data).success,true);
  choices.set("ruby_marketing_choice","deny");
  assert.equal(trackRubyMetaFunnel("AddToCart",items),false);assert.equal(requests.length,1);
 }finally{
  for(const k of keys){if(saved[k]===undefined)delete globals[k];else globals[k]=saved[k]}
  if(old===undefined)delete process.env.NEXT_PUBLIC_RUBY_META_CAPI_ENABLED;else process.env.NEXT_PUBLIC_RUBY_META_CAPI_ENABLED=old;
 }
});
test("server checks scoped HttpOnly consent, active ledger, price and rate limit before dispatch; no purchase endpoint or buyer data",()=>{
 const route=readFileSync("app/api/meta/funnel/route.ts","utf8");
 const consent=readFileSync("app/api/meta/consent/route.ts","utf8");
 assert.ok(route.includes('req.cookies.get(META_FUNNEL_COOKIE)?.value!==id'));
 assert.equal(route.match(/await metaConsentActive\(id\)/g)?.length,2);
 assert.ok(route.includes("publicRequestAllowed")&&route.includes("quoteMatchesFunnel")&&route.includes("input.eventId"));
 assert.ok(!route.includes("email:")&&!route.includes("orderId:")&&!route.includes("test_event_code"));
 assert.ok(consent.includes("httpOnly:true")&&consent.includes("input.funnel===true")&&consent.includes('META_FUNNEL_COOKIE,""'));
});

test("production proxy permits only POST for the consent-gated funnel endpoint",()=>{
 const proxy=readFileSync("proxy.ts","utf8");
 assert.ok(proxy.split("const publicPostApis=")[1].split("\n")[0].includes('"/api/meta/funnel"'));
 assert.ok(!proxy.split("const publicGetApis=")[1].split("\n")[0].includes('"/api/meta/funnel"'));
});
test("verified Klarna capture counts, authorization alone does not; admin delivery has no secrets",()=>{
 const purchase=readFileSync("src/lib/meta-conversions.ts","utf8"),journey=readFileSync("src/lib/admin-journey.ts","utf8");
 assert.ok(purchase.includes("KLARNA.CAPTURE.COMPLETED"));
 assert.ok(journey.includes("KLARNA.CAPTURE.COMPLETED")&&journey.includes("FROM invoices")&&journey.includes("payment_confirmed"));
 const report=readFileSync("src/lib/admin-meta-delivery.ts","utf8");
 assert.ok(report.includes('groupBy({by:["status"]')&&report.includes("Boolean(process.env.RUBY_META_CAPI_TOKEN)"));
 assert.ok(readFileSync("app/admin/analytics/page.tsx","utf8").includes("<AdminMetaDeliveryPanel/>"));
});
