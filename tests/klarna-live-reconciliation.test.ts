import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(x:string)=>readFileSync(x,"utf8");

test("Merchant can read live Klarna capture with the existing encrypted server-side credentials",()=>{
 const api=read("src/lib/klarna-live-reconciliation.ts");
 const provider=read("src/lib/customer-checkout.ts");
 assert.match(api,/providerForCheckout\("klarna"\)/);
 assert.match(provider,/loadPaymentValues\("klarna","live",\["username","password","merchantId"\]\)/);
 assert.match(api,/gateway\.api\.readOrder\(match\[1\]\)/);
 assert.match(api,/gateway\.api\.readCaptures\(match\[1\]\)/);
 assert.match(api,/remote\.order_amount===order\.totalCents/);
 assert.match(api,/remote\.purchase_currency==="EUR"/);
 assert.match(api,/captures\.length===1&&captures\[0\]\.captured_amount===order\.totalCents/);
 assert.doesNotMatch(api,/captureCustomerOrder\(/);
});
test("Reconcile only existing proven capture; no new Klarna charge",()=>{
 const api=read("src/lib/klarna-live-reconciliation.ts");
 const action=read("app/admin/klarna-durum/actions.ts");
 const page=read("app/admin/klarna-durum/page.tsx");
 assert.match(api,/audit\.status!=="captured_verified"/);
 assert.match(api,/finishCapturedCustomerOrder\(internalId,"klarna",audit\.captureId,match\[1\]\)/);
 assert.match(action,/if\(!await isAdmin\(\)\)/);
 assert.match(action,/confirmNoNewCharge/);
 assert.match(page,/if\(!await isAdmin\(\)\)/);
 assert.match(page,/status==="captured_verified"/);
 assert.doesNotMatch(action,/captureCustomerOrder\(|captureAuthorizedKlarna\(/);
});
