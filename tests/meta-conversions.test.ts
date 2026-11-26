import test from "node:test";
import assert from "node:assert/strict";
import {conversionPayload,opaqueMetaId,allowedMetaCookie} from "../src/lib/meta-conversion-policy";
const now=new Date(),id="6f73b55b-a6c3-465e-af15-5c6e7c18fbdd";
const input={id,secret:"a".repeat(32),status:"payment_confirmed",testOnly:false,currency:"EUR",totalCents:14499,giftAppliedCents:2100,captureAt:now,contextCreated:new Date(now.getTime()-1000),fbp:"fb.1.1760000000000.12345",fbc:null,userAgent:"QA Browser",now};
test("cash value and event id match browser purchase, no order or buyer fields",()=>{
 const p=conversionPayload(input)!;assert.equal(p.custom_data.value,123.99);assert.equal(p.event_id,opaqueMetaId(input.secret,id));assert.equal(p.event_source_url,"https://rubyhair.de/kasse");assert.ok(!JSON.stringify(p).includes(id));
});
test("unpaid, refunded, test, old or fully gifted orders never sent",()=>{
 for(const patch of [{status:"pending_payment"},{status:"payment_authorized"},{status:"refunded"},{testOnly:true},{captureAt:null},{captureAt:new Date(now.getTime()-48*3600000)},{giftAppliedCents:14499},{fbp:"person@example.com"}])assert.equal(conversionPayload({...input,...patch}),null);
 assert.equal(allowedMetaCookie("secret token","fbc"),undefined);
});
