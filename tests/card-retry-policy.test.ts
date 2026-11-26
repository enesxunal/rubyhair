import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {canAbandonCardOrder} from "../src/lib/card-retry-policy";
const base=()=>({id:"PAYPAL123",intent:"CAPTURE",status:"CREATED",payment_source:{card:{}},purchase_units:[{custom_id:"order-1",amount:{currency_code:"EUR",value:"144.99"}}]});
const check=(raw:unknown)=>canAbandonCardOrder(raw,"order-1","PAYPAL123",14499);
test("only verified unpaid card order can release the checkout lock",()=>{
 assert.equal(check(base()),true);
 for(const status of ["APPROVED","COMPLETED","UNKNOWN","PENDING"]){assert.equal(check({...base(),status}),false)}
 assert.equal(check({...base(),id:"other"}),false);
 assert.equal(check({...base(),payment_source:{paypal:{}}}),false);
 assert.equal(check({...base(),payment_source:{card:{authentication_result:{liability_shift:"POSSIBLE"}}}}),false);
 for(const payments of [{captures:[{status:"PENDING"}]},{authorizations:[{status:"CREATED"}]},{captures:null}])assert.equal(check({...base(),purchase_units:[{...base().purchase_units[0],payments}]}),false);
 assert.equal(check({...base(),purchase_units:[{...base().purchase_units[0],amount:{currency_code:"EUR",value:"1.00"}}]}),false);
});
test("card submission uses SDK validity before reserving, recovery remains fail closed",()=>{
 const component=readFileSync("src/components/paypal-card-fields-checkout.tsx","utf8"),route=readFileSync("app/api/payments/paypal/card-status/route.ts","utf8"),finalize=readFileSync("src/lib/customer-order-finalize.ts","utf8");
 assert.ok(component.includes('phase==="ready"&&cardValid'));
 assert.ok(component.includes('session.on("validitychange",update)'));
 assert.ok(component.includes('status.retryAllowed&&explicitlyFailed'));
 assert.ok(route.includes('customer_card_capture_attempted_review'));
 assert.ok(route.includes('isolationLevel:Prisma.TransactionIsolationLevel.Serializable'));
 assert.ok(route.includes('canAbandonCardOrder(remote'));
 assert.ok(finalize.includes('customer_card_checkout_reserved'));
 assert.ok(finalize.includes('allowCapture=false'));
});
