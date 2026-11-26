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
