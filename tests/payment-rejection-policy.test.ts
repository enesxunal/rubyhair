import {test} from "node:test";
import assert from "node:assert/strict";
import {retrySafeCheckoutRejection} from "../src/lib/checkout-rejection-policy";
import {readFileSync} from "node:fs";
test("Only provably pre-order or rolled-back failures release payment lock",()=>{
 for(const code of ["INVALID_CHECKOUT","COUPON_INVALID_OR_EXPIRED","STOCK_CHANGED","KLARNA_PROVIDER_REJECTED"])assert.equal(retrySafeCheckoutRejection(code),true);
 for(const code of ["PROVIDER_ORDER_REQUIRES_REVIEW","CHECKOUT_ALREADY_STARTED","CHECKOUT_IDEMPOTENCY_CONFLICT","CHECKOUT_TEMPORARILY_UNAVAILABLE","CAPTURE_NOT_VERIFIED","PAYPAL_NETWORK_UNAVAILABLE","PAYPAL_NOT_CONFIGURED","KLARNA_NOT_CONFIGURED","UNKNOWN"])assert.equal(retrySafeCheckoutRejection(code),false);
 for(const name of ["customer-payment-submit","paypal-card-fields-checkout","paypal-wallet-checkout"]){const src=readFileSync(`src/components/${name}.tsx`,"utf8");assert.match(src,/retrySafe===true/);assert.match(src,/releasePayment\(\)/)}
});
