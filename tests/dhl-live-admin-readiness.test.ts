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
 assert.match(page,/Abrechnungsnummer/);
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

test("DHL fulfillment validates a 500g template but never purchases old orders or books without explicit sender approval",()=>{
 const label=read("src/lib/dhl-labels.ts");
 const worker=read("src/lib/customer-automation.ts");
 const dhlAction=read("app/admin/dhl/actions.ts");
 assert.match(label,/uom:"kg",value:input.weightG\/1000/);
 assert.match(label,/splitGermanStreetAddress\(input.recipient.street\)/);
 assert.match(label,/addressHouse/);
 assert.match(label,/url="https:\/\/api-eu\.dhl\.com\/parcel\/de\/shipping\/v2\/orders\?validate=true"/);
 assert.match(label,/RUBY_DHL_SENDER_APPROVED/);
 assert.match(worker,/RUBY_DHL_AUTOMATION_START_AT/);
 assert.match(worker,/const validation=await validateDhlLiveTemplateOnly\(\)/);
 assert.match(worker,/if\(validation!=="valid"\)return/);
 assert.match(worker,/order.createdAt.getTime\(\)<Date.parse\(startAt\)/);
 assert.match(worker,/status:"waiting_credentials",trackingNumber:null/);
 assert.match(dhlAction,/validateDhlLiveTemplateOnly\(\)/);
 assert.doesNotMatch(dhlAction,/createDhlShipmentLabel\(/);
});

test("DHL sandbox manual test can never create a live shipment or touch a real order",()=>{
 const sandbox=read("src/lib/dhl-sandbox-label.ts");
 const route=read("app/api/admin/dhl-test-label/route.ts");
 const page=read("app/admin/dhl/page.tsx");
 assert.match(sandbox,/https:\/\/api-sandbox\.dhl\.com\/parcel\/de/);
 assert.match(sandbox,/33333333330101/);
 assert.match(sandbox,/SandboxPasswort2023!/);
 assert.match(sandbox,/validate=true/);
 assert.match(sandbox,/uom:"kg",value:0\.5/);
 assert.doesNotMatch(sandbox,/https:\/\/api-eu\.dhl\.com/);
 assert.doesNotMatch(sandbox,/createDhlShipmentLabel/);
 assert.doesNotMatch(route,/order\.(?:update|create|delete)/);
 assert.match(route,/await isAdmin\(\)/);
 assert.match(route,/CROSS_SITE_DENIED/);
 assert.match(page,/Test-PDF erstellen/);
});


test("DHL dashboard has one visible main action and groups diagnostic tests safely",()=>{
 const page=read("app/admin/dhl/page.tsx");
 const route=read("app/api/admin/dhl-test-label/route.ts");
 const labels=read("src/lib/dhl-labels.ts");
 assert.match(page,/rh-dhl-primary-btn/);
 assert.equal((page.match(/className="rh-dhl-primary-btn"/g)||[]).length,1);
 assert.match(page,/<details className="rh-admin-panel-card rh-dhl-advanced">/);
 assert.match(page,/Erweiterte Tests und technische Details/);
 assert.match(page,/DHL-Versand prüfen/);
 assert.match(page,/Noch nicht bestätigt/);
 assert.match(page,/DHL erlaubt derzeit keinen Zugriff auf die Versand-API/);
 assert.match(route,/Response.redirect\(new URL\("\/admin\/dhl\?sandbox="/);
 assert.match(labels,/dry.status===401\|\|dry.status===403\?"unauthorized"/);
 assert.match(route,/CROSS_SITE_DENIED/);
});


test("Manual DHL purchase and cancellation require admin approval and isolate ambiguous outcomes",()=>{
 const action=read("app/admin/dhl-order-actions.ts");
 const view=read("app/admin/bestellungen/page.tsx");
 const labels=read("src/lib/dhl-labels.ts");
 assert.equal((action.match(/if\(!await isAdmin\(\)\)/g)||[]).length,2);
 assert.equal((action.match(/form.get\("confirmed"\)!=="on"/g)||[]).length,2);
 assert.match(action,/PAYMENT\.CAPTURE\.COMPLETED/);
 assert.match(action,/status:"submitting"/);
 assert.match(action,/status:"canceling"/);
 assert.match(action,/status:"needs_review"/);
 assert.match(action,/status:"canceled",trackingNumber:null,labelPdf:null/);
 assert.match(labels,/method:"DELETE"/);
 assert.match(labels,/body.items\[0\].shipmentNo!==tracking/);
 assert.match(view,/Versandetikett erstellen/);
 assert.match(view,/Versandetikett stornieren/);
 assert.doesNotMatch(action,/captureAuthorizedKlarna|deliverQueuedOrderEmails/);
});

test("DHL actual weights use 25g per item plus confirmed packaging",async()=>{
 const {productWeightG,packageWeightG,packageTareG,measuredPackageWeightG}=await import("../src/lib/dhl-weight");
 assert.equal(productWeightG([{quantity:6}]),150);
 assert.equal(packageWeightG([{quantity:2},{quantity:4}],100),250);
 assert.equal(packageTareG(""),null);
 assert.equal(packageTareG("0"),null);
 assert.equal(packageTareG("100"),100);
 assert.equal(measuredPackageWeightG([{quantity:6}],"230"),230);
 assert.throws(()=>measuredPackageWeightG([{quantity:6}],"150"));
 assert.throws(()=>packageWeightG([{quantity:1260}],1));
 assert.throws(()=>productWeightG([{quantity:0}]));
});
