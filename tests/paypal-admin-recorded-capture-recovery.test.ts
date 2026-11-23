import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('admin-only reconciliation of already captured customer payment never captures again',()=>{
 const action=readFileSync('app/admin/paypal-kundenstatus/actions.ts','utf8');
 const page=readFileSync('app/admin/paypal-kundenstatus/page.tsx','utf8');
 assert.match(action,/"use server"/);
 assert.match(action,/if\(!await isAdmin\(\)\)redirect/);
 assert.match(action,/finalizePayPalCheckout\(order\.id,false,order\.paymentReference\)/);
 assert.doesNotMatch(action,/captureOrder\(|createOrder\(|refund/);
 assert.match(page,/if\(!await isAdmin\(\)\)redirect/);
 assert.match(page,/verified&&order\?\.status==="pending_payment"/);
 assert.match(page,/action=\{reconcileCapturedPayPalCustomerOrder\}/);
});
