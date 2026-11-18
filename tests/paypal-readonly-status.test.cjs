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
