const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
test('admin-only PayPal reconciliation page reads provider without causing a second capture',()=>{
 const p=fs.readFileSync(path.join(__dirname,'../app/admin/paypal-durum/page.tsx'),'utf8');
 const checkout=fs.readFileSync(path.join(__dirname,'../src/components/live-variant-test-section.tsx'),'utf8');
 assert.match(p,/if\(!await isAdmin\(\)\)redirect\("\/admin\/login"\)/);
 assert.match(p,/api\.getOrder\(order\.paymentReference\)/);
 assert.match(p,/requireCompletedCapture\(data,order\.id,100,order\.paymentReference\)/);
 assert.match(p,/keine neue Bestellung, keine Abbuchung/);
 assert.doesNotMatch(p,/\.captureOrder\(|\.createOneEuroQaOrder\(|db\.\$transaction\(/);
 assert.match(checkout,/href="\/admin\/paypal-durum"/);
});
test('already verified PayPal capture reconciles without additional provider payment request',()=>{
 const lib=fs.readFileSync(path.join(__dirname,'../src/lib/live-variant-qa.ts'),'utf8');
 const action=fs.readFileSync(path.join(__dirname,'../app/live-variant-test-actions.ts'),'utf8');
 const screen=fs.readFileSync(path.join(__dirname,'../app/admin/paypal-durum/page.tsx'),'utf8');
 const start=lib.indexOf('export async function reconcileCapturedVariantTest()');
 const stop=lib.indexOf('export async function cancelVariantTest',start);
 assert.ok(start>0&&stop>start);
 const reconciliation=lib.slice(start,stop);
 assert.match(reconciliation,/api\.getOrder\(order\.paymentReference\)/);
 assert.match(reconciliation,/requireCompletedCapture\(raw,order\.id,100,order\.paymentReference\)/);
 assert.match(reconciliation,/providerEventId:captured\.captureId/);
 assert.match(reconciliation,/priceCents:VARIANT_TEST_ORIGINAL_CENTS,stockQuantity:null/);
 assert.match(reconciliation,/return tx\.invoice\.create\(/);
 assert.doesNotMatch(reconciliation,/api\.captureOrder\(|api\.createOneEuroQaOrder\(/);
 assert.match(action,/if\(!await isAdmin\(\)\)redirect/);
 assert.match(action,/reconcileCapturedVariantTest\(\)/);
 assert.match(screen,/audit\?\.verified&&order\?\.status==="pending_payment"/);
});

test('manual capture verifies canonical PayPal GET order rather than trusting the immediate POST capture response',()=>{
 const core=fs.readFileSync(path.join(__dirname,'../src/lib/live-variant-qa.ts'),'utf8');
 const a=core.slice(core.indexOf('export async function captureVariantTest('),core.indexOf('export async function reconcileCapturedVariantTest('));
 assert.match(a,/await api\.captureOrder\(paypalOrderId/);
 assert.match(a,/raw=await api\.getOrder\(paypalOrderId\)/);
 assert.match(a,/requireCompletedCapture\(raw,order\.id,100,paypalOrderId\)/);
 assert.ok(a.indexOf('await api.captureOrder')<a.indexOf('raw=await api.getOrder'));
});
