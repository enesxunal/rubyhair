import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildDhlTokenRequest,dhlMissingFields,dhlRequiredFields,dhlAuthUrls} from "../src/lib/dhl-auth-contract";

const example = {clientId:"test-key",clientSecret:"test-secret",username:"test-gkp-user",password:"test-gkp-pass",accountNumber:"1234567890",billingNumber:"12345678900101"};

test("DHL credentials must all be configured before attempting OAuth",()=>{
 assert.equal(dhlRequiredFields.length,6);
 assert.deepEqual(dhlMissingFields({}),[...dhlRequiredFields]);
 assert.deepEqual(dhlMissingFields(example),[]);
 assert.throws(()=>buildDhlTokenRequest("live",{...example,clientSecret:""}),/DHL_CREDENTIALS_INCOMPLETE/);
});

test("DHL OAuth request uses official environment-specific endpoints",()=>{
 assert.match(dhlAuthUrls.sandbox,/^https:\/\/api-sandbox\.dhl\.com\//);
 assert.match(dhlAuthUrls.live,/^https:\/\/api-eu\.dhl\.com\//);
 for(const environment of ["live","sandbox"] as const){
  const request=buildDhlTokenRequest(environment,example);
  assert.equal(request.init.method,"POST");
  assert.equal(request.init.cache,"no-store");
  const body=new URLSearchParams(request.init.body);
  assert.equal(body.get("grant_type"),"password");
  assert.equal(body.get("client_id"),example.clientId);
  assert.equal(body.get("client_secret"),example.clientSecret);
  assert.equal(body.get("username"),example.username);
  assert.equal(body.get("password"),example.password);
 }
});

test("DHL server integration cannot auto-enable live shipping or expose credentials",()=>{
 const adapter=readFileSync("src/lib/dhl-api.ts","utf8");
 const fields=readFileSync("src/lib/payment-settings-spec.ts","utf8");
 const checkout=readFileSync("app/api/checkout/route.ts","utf8");
 assert.ok(adapter.includes('import "server-only"'));
 assert.ok(adapter.includes('RUBY_DHL_AUTH_PROBE_ENABLED'));
 assert.ok(adapter.includes('RUBY_DHL_LIVE_AUTH_PROBE_ENABLED'));
 assert.ok(adapter.includes('liveEnabled:false'));
 assert.ok(adapter.includes('loadPaymentValues("dhl"'));
 assert.ok(fields.includes('label:"DHL Paket / Versand"'));
 assert.ok(checkout.includes("CHECKOUT_NOT_CONFIGURED"));
});
