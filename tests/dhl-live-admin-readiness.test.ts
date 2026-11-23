import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(p:string)=>readFileSync(p,"utf8");

test("DHL auth check is protected and does not create any label",()=>{
 const api=read("src/lib/dhl-api.ts");
 const action=read("app/admin/dhl/actions.ts");
 const page=read("app/admin/dhl/page.tsx");
 assert.match(api,/checkDhlAuthFromAdmin/);
 assert.match(api,/buildDhlTokenRequest/);
 assert.match(api,/"credentials_missing"/);
 assert.match(action,/if\(!await isAdmin\(\)\)/);
 assert.match(action,/checkDhlAuthFromAdmin\("live"\)/);
 assert.doesNotMatch(action,/createDhlShipmentLabel\(/);
 assert.match(page,/credentialsComplete/);
 assert.match(page,/disabled={!readiness.credentialsComplete}/);
 assert.match(page,/14-stellige Abrechnungsnummer/);
});

test("DHL live bookings are gated on explicit sender approval and weight",()=>{
 const label=read("src/lib/dhl-labels.ts");
 const worker=read("src/lib/customer-automation.ts");
 const checkout=read("app/api/checkout/route.ts");
 assert.match(label,/RUBY_DHL_SENDER_APPROVED/);
 assert.match(label,/RUBY_DHL_LIVE_LABELS_ENABLED/);
 assert.match(worker,/RUBY_DHL_SENDER_APPROVED/);
 assert.match(checkout,/RUBY_DHL_SENDER_APPROVED/);
 assert.match(label,/\[0-9\]\{10\}01\[A-Za-z0-9\]\{2\}/);
});

test("Manual handover requires a real DHL parcel and synchronizes tracking and shipping mail",()=>{
 const action=read("app/admin/actions.ts");
 const view=read("app/admin/bestellungen/page.tsx");
 assert.match(action,/handedOver:formData.get\("parcelHandedOver"\)==="on"/);
 assert.match(action,/manual_shipped/);
 assert.match(action,/deliverQueuedOrderEmails\(5\)/);
 assert.match(view,/Ich bestätige die tatsächliche Übergabe an DHL/);
 assert.match(view,/href="\/admin\/dhl"/);
});

test("DHL label creation never charges Klarna before physical handover",()=>{
 const worker=read("src/lib/customer-automation.ts");
 const finalize=worker.split("export async function finalizePreparedShippingJobs(")[1].split("// Recover Klarna-authorized orders")[0];
 assert.ok(!finalize.includes("captureAuthorizedKlarna("));
 assert.match(finalize,/status:"awaiting_handover"/);
 assert.match(finalize,/payment_authorized/);
 const manual=read("app/admin/klarna-manual-actions.ts");
 assert.match(manual,/parcelHandedOver/);
 assert.match(manual,/captureAuthorizedKlarna\(id\)/);
 assert.match(manual,/before.shippingJob\?\.trackingNumber!==tracking/);
 const orderUi=read("app/admin/bestellungen/page.tsx");
 assert.match(orderUi,/readOnly=\{\["label_created","awaiting_handover"\]/);
});

test("DHL fulfillment defaults to 500g but never purchases old orders or books without explicit sender approval",()=>{
 const label=read("src/lib/dhl-labels.ts");
 const worker=read("src/lib/customer-automation.ts");
 const dhlAction=read("app/admin/dhl/actions.ts");
 assert.match(label,/uom:"kg",value:input.weightG\/1000/);
 assert.match(label,/splitGermanStreetAddress\(input.recipient.street\)/);
 assert.match(label,/addressHouse/);
 assert.match(label,/url="https:\/\/api-eu\.dhl\.com\/parcel\/de\/shipping\/v2\/orders\?validate=true"/);
 assert.match(label,/RUBY_DHL_SENDER_APPROVED/);
 assert.match(worker,/RUBY_DHL_AUTOMATION_START_AT/);
 assert.match(worker,/order.createdAt.getTime\(\)<Date.parse\(startAt\)/);
 assert.match(worker,/status:"waiting_credentials",trackingNumber:null/);
 assert.match(dhlAction,/validateDhlLiveTemplateOnly\(\)/);
 assert.doesNotMatch(dhlAction,/createDhlShipmentLabel\(/);
});
