import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {verifiedCaptureReplay,paymentReplayOutcome} from "../src/lib/payment-replay-policy";
const read=(p:string)=>readFileSync(p,"utf8");

test("replayed verified capture may not re-invoice a shipped, delivered or refunded order",()=>{
 for(const status of ["payment_confirmed","preparing","shipped","delivered","refunded"])
  assert.equal(verifiedCaptureReplay(status,true,true),true,status);
 for(const status of ["draft","pending_payment","payment_authorized","cancelled","test_reserved"])
  assert.equal(verifiedCaptureReplay(status,true,true),false,status);
 for(const status of ["shipped","delivered","refunded"]){
  assert.equal(verifiedCaptureReplay(status,false,true),false);
  assert.equal(verifiedCaptureReplay(status,true,false),false);
 }
 assert.equal(paymentReplayOutcome("refunded"),"refunded");
 assert.equal(paymentReplayOutcome("shipped"),"paid");
});

test("PayPal return and signed webhook replay require recorded provider capture",()=>{
 const finalize=read("src/lib/customer-order-finalize.ts");
 const webhook=read("app/api/payments/paypal/webhook/route.ts");
 assert.match(finalize,/verifiedCaptureReplay\(order.status/);
 assert.match(finalize,/provider:"paypal",eventType:"PAYMENT.CAPTURE.COMPLETED"/);
 assert.match(finalize,/PAYPAL_CAPTURE_REPLAY_INCONSISTENT/);
 assert.match(finalize,/PAYPAL_CAPTURE_NOT_YET_VERIFIED/);
 assert.match(webhook,/verifyWebhook\(req.headers,evt\)/);
 assert.match(webhook,/finalizePayPalCheckout\(order.id,false\)/);
 assert.match(webhook,/RUBY_PAYPAL_REFUND_PROVIDER_RECONCILIATION_REQUIRED/);
 assert.doesNotMatch(webhook,/captureOrder\(|refundCapture\(/);
});
