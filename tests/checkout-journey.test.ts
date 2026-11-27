import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {journeySchema,journeyIdleMs,journeyRetentionMs} from "../src/lib/journey-policy";
const r=(p:string)=>readFileSync(p,"utf8");
const session="11111111-1111-4111-8111-111111111111",id="22222222-2222-4222-8222-222222222222";
test("only bounded allowlisted event data accepted",()=>{
 assert.equal(journeySchema.safeParse({session,id,event:"add_to_cart",device:"mobile"}).success,true);
 assert.equal(journeySchema.safeParse({session,id,event:"payment_attempt",method:"klarna"}).success,true);
 assert.equal(journeySchema.safeParse({session,id,event:"error",method:"card",stage:"authorization",code:"CARD_AUTH_CANCELLED"}).success,true);
 for(const payload of [{event:"paid"},{event:"payment_attempt"},{event:"error",code:"arbitrary"},{event:"add_to_cart",email:"x@example.com"},{event:"add_to_cart",orderId:id},{event:"add_to_cart",path:"/private"}])assert.equal(journeySchema.safeParse({session,id,...payload}).success,false);
 assert.equal(journeyIdleMs,30*60000);assert.equal(journeyRetentionMs,7*86400000);
});
test("new journey requires separate consent and never trusts a browser purchase",()=>{
 assert.match(r("src/lib/journey-server.ts"),/ruby_journey/);
 assert.match(r("src/lib/journey-server.ts"),/ruby_analytics/);
 assert.match(r("src/lib/journey-client.ts"),/sessionStorage/);
 assert.match(r("src/components/analytics-consent.tsx"),/draftJourney&&draftStatistics/);
 assert.match(r("app/api/analytics/journey/route.ts"),/if\(!journeyAllowed\(req\)\)/);
 assert.match(r("src/lib/admin-journey.ts"),/PAYMENT.CAPTURE.COMPLETED/);
 assert.match(r("app/api/internal/customer-jobs/route.ts"),/cleanupJourneys/);
});
test("payment routes attach only consented journey and remain asynchronous",()=>{
 for(const file of ["customer-payment-submit","paypal-card-fields-checkout","paypal-wallet-checkout"])assert.match(r("src/components/"+file+".tsx"),/\.\.\.journeyHeaders\(\)/);
 assert.match(r("app/api/checkout/route.ts"),/after\(\(\)=>recordJourneyCheckout/);
});
