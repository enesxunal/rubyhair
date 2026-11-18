import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=(p:string)=>readFileSync(p,"utf8");

test("Klarna-only public checkout does not enable public PayPal",()=>{
 const api=source("app/api/checkout/route.ts");
 const page=source("app/kasse/page.tsx");
 const ui=source("src/components/checkout-preview.tsx");
 assert.match(api,/mode==="klarna_public"&&input\.data\.provider!=="klarna"/);
 assert.match(api,/PAYMENT_METHOD_DISABLED/);
 assert.match(api,/RUBY_MANUAL_DHL_FULFILLMENT_ENABLED/);
 assert.match(page,/mode==="klarna_public"/);
 assert.match(ui,/checkoutMode!=="klarna_public"/);
 assert.match(ui,/checkoutMode==="klarna_public"\?"klarna"/);
});

test("Klarna cannot be captured before confirmed real DHL handover",()=>{
 const action=source("app/admin/klarna-manual-actions.ts");
 const core=source("src/lib/customer-automation.ts");
 assert.match(action,/await isAdmin\(\)/);
 assert.match(action,/parcelHandedOver/);
 assert.match(action,/captureAuthorizedKlarna\(id\)/);
 assert.match(action,/status:"manual_shipped"/);
 assert.match(action,/CAPTURE_NOT_RECONCILED/);
 assert.match(core,/readCaptures\(orderIdAtKlarna\)/);
 assert.match(core,/checked\.captured_amount!==order\.totalCents/);
});

test("Klarna callbacks and missing browser returns reconcile safely",()=>{
 const returning=source("app/kasse/klarna/return/page.tsx");
 const shipping=source("src/lib/customer-automation.ts");
 const checkout=source("src/lib/customer-checkout.ts");
 assert.match(returning,/confirmKlarnaCheckout/);
 assert.match(shipping,/confirmKlarnaCheckout\(order\.id,sessionId,hpp\.order_id\)/);
 assert.match(checkout,/klarnaSessionCreated/);
 assert.match(checkout,/KLARNA_PROVIDER_REJECTED/);
});
