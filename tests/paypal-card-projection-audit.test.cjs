const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
test('PayPal audit must merge canonical status/captures with expanded funding source',()=>{
 const source=readFileSync('src/lib/paypal-provider-core.ts','utf8');
 const at=source.indexOf('async getOrderWithPaymentSource('),end=source.indexOf('  /**',at+40);
 const method=source.slice(at,end>at?end:at+1100);
 assert.match(method,/this\.api\("GET",path\)/);
 assert.match(method,/this\.api\("GET",path\+"\?fields=payment_source"\)/);
 assert.match(method,/\.\.\.full,payment_source:/);
 assert.match(method,/PAYPAL_ORDER_PROJECTION_MISMATCH/);
 assert.doesNotMatch(method,/"POST"|captureOrder\(/);
});
test('Incident audit and card capture use the same verified full-order reader',()=>{
 for(const f of ['app/admin/paypal-kundenstatus/page.tsx','app/api/payments/paypal/card-capture/route.ts']){
  assert.match(readFileSync(f,'utf8'),/getOrderWithPaymentSource\(/);
 }
 const audit=readFileSync('app/admin/paypal-kundenstatus/page.tsx','utf8');
 assert.match(audit,/if\(!await isAdmin\(\)\)redirect/);
 assert.doesNotMatch(audit,/\.captureOrder\(|\.createCardOrder\(|\.refund/);
});
