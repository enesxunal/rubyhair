import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(path:string)=>readFileSync(path,"utf8");

test("production release needs explicit approval, canonical URL and production deploy",()=>{
 for(const file of ["proxy.ts","src/lib/seo.ts"]){
  const source=read(file);
  assert.match(source,/VERCEL_ENV==="production" &&/);
  assert.match(source,/RUBY_SHOP_PUBLIC==="APPROVED_PRODUCTION" &&/);
  assert.match(source,/RUBY_CANONICAL_SITE_URL==="https:\/\/rubyhair.de"/);
  assert.doesNotMatch(source,/VERCEL_ENV==="production" \|\|/);
 }
 const checkout=read("src/lib/customer-checkout.ts");
 assert.match(checkout,/RUBY_PUBLIC_CHECKOUT_MODE/);
 assert.match(checkout,/"payments_public"/);
});

test("AI try-on floating CTA never interrupts buying or legal disclosures",()=>{
 const component=read("src/components/hair-tryon-floating-link.tsx");
 for(const route of ["/kasse","/warenkorb","/rechtliches/","/widerruf","/produkt/"])
  assert.ok(component.includes(`pathname.startsWith("${route}")`),route);
 const detail=read("src/components/product-detail.tsx");
 assert.doesNotMatch(detail,/vor dem Verkaufsstart bestätigt/);
});

test("storefront self-hosts both font families and has security headers",()=>{
 const layout=read("app/layout.tsx");
 assert.match(layout,/@fontsource\/dm-sans\/400.css/);
 assert.match(layout,/@fontsource\/playfair-display\/400.css/);
 assert.doesNotMatch(layout,/fonts\.googleapis\.com|fonts\.gstatic\.com/);
 const config=read("next.config.ts");
 assert.match(config,/Permissions-Policy/);
 assert.match(config,/Content-Security-Policy-Report-Only/);
 assert.match(config,/X-Frame-Options/);
});

test("AI image spend is protected by atomic, anonymous, cross-instance limits",()=>{
 const limit=read("src/lib/tryon-quota.ts");
 const api=read("app/api/tryon/generate/route.ts");
 const schema=read("prisma/schema.prisma");
 const migration=read("prisma/migrations/20261118210000_tryon_quota/migration.sql");
 for(const fragment of ["createHmac","pg_advisory_xact_lock","perIpMinute:2","perIpDay:5","globalDay:35","parallel:2","finishedAt:null","expiresAt:{gt:now}"])
  assert.ok(limit.includes(fragment),fragment);
 assert.match(api,/await reserveTryonQuota\(request\)/);
 assert.match(api,/finally\{/);
 assert.match(api,/await finishTryonQuota\(tryonQuotaId\)/);
 assert.match(api,/status:429/);
 assert.match(api,/Retry-After/);
 assert.match(api,/NODE_ENV!=="production"&&process.env.RUBY_TRYON_TEST_BYPASS==="LOCAL_TEST_ONLY"/);
 assert.ok(api.indexOf("reserveTryonQuota(request)")<api.indexOf("checkPhotoSuitability("));
 assert.ok(api.indexOf("reserveTryonQuota(request)")<api.indexOf("/v1/images/edits"));
 assert.match(schema,/model TryonQuotaAttempt/);
 assert.match(migration,/CREATE TABLE "tryon_quota_attempts"/);
 assert.doesNotMatch(schema,/model TryonQuotaAttempt \{[^}]*photo/);
});
