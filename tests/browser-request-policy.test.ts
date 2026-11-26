import {test} from "node:test";
import assert from "node:assert/strict";
import {tokenRequestAllowed} from "../src/lib/browser-request-policy";
test("Payment SDK token accepts modern and legacy canonical same-origin requests only",()=>{
 const allow=(h:Record<string,string>,host="rubyhair.de")=>tokenRequestAllowed(new Headers(h),host);
 assert.equal(allow({"sec-fetch-site":"same-origin"}),true);
 assert.equal(allow({referer:"https://rubyhair.de/kasse"}),true);
 assert.equal(allow({origin:"https://rubyhair.de"}),true);
 assert.equal(allow({"sec-fetch-site":"cross-site",referer:"https://rubyhair.de/kasse"}),false);
 assert.equal(allow({referer:"https://evil.example/kasse"}),false);
 assert.equal(allow({origin:"https://evil.example","sec-fetch-site":"same-origin"}),false);
 assert.equal(allow({}),false);
 assert.equal(allow({referer:"https://rubyhair.de/kasse"},"evil.example"),false);
 assert.equal(allow({"sec-fetch-site":"same-origin",referer:"https://www.rubyhair.de/kasse"},"www.rubyhair.de"),true);
});

import {readFileSync} from "node:fs";
test("Payment SDKs do not start until the real cart price is available",()=>{
 const card=readFileSync("src/components/paypal-card-fields-checkout.tsx","utf8");
 const wallet=readFileSync("src/components/paypal-wallet-checkout.tsx","utf8");
 for(const src of [card,wallet]){assert.ok(src.indexOf("if(!cartReady")<src.search(/fetch\("\/api\/payments\/paypal\/(card|wallet)-token"/));assert.match(src,/controller\.abort\(\)/);assert.match(src,/\[cartReady,totalCents,/)}
});
