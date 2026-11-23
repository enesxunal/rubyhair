import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('card recovery is signed, provider-read-only and never charges twice',()=>{
 const route=readFileSync('app/api/payments/paypal/card-status/route.ts','utf8');
 const component=readFileSync('src/components/paypal-card-fields-checkout.tsx','utf8');
 assert.match(route,/verifyCheckoutSignature\(orderId,"paypal",cardState\)/);
 assert.match(route,/order\.testOnly/);
 assert.match(route,/order\.paymentReference!==paypalOrderId/);
 assert.match(route,/finalizePayPalCheckout\(orderId,false,paypalOrderId\)/);
 assert.doesNotMatch(route,/captureOrder\(|createOrder\(|refundOrder\(/);
 assert.match(route,/ORIGIN_NOT_ALLOWED/);
 assert.match(readFileSync('proxy.ts','utf8'),/"\/api\/payments\/paypal\/card-status"/);
 assert.match(component,/\/api\/payments\/paypal\/card-status/);
 assert.match(component,/attempt<3/);
 assert.match(component,/if\(res\.ok&&status\.paid\)/);
 assert.match(component,/setLocked\(true\)/);
});
