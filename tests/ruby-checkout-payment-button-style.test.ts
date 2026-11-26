import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('legacy placeholder styles no longer override live checkout and Google Pay SDK buttons',()=>{
 const css=readFileSync('src/styles/shop.css','utf8');
 const checkout=readFileSync('src/components/checkout-preview.tsx','utf8');
 const wallet=readFileSync('src/components/paypal-wallet-checkout.tsx','utf8');
 assert.doesNotMatch(css,/\.rh-checkout-payment-preview button\s*\{/);
 assert.match(css,/\.rh-payment-action-area button\.rh-payment-primary-link\s*\{/);
 assert.match(css,/button\.rh-payment-primary-link:disabled/);
 assert.match(css,/\.rh-wallet-button-host/);
 assert.match(checkout,/\(applePayEnabled\|\|googlePayEnabled\)&&checkoutMode!=="klarna_public"/);
 assert.match(wallet,/buttonSizeMode:"fill"/);
 assert.match(wallet,/googleHost\} className="rh-wallet-button-host"/);
});

test('payment submit explains missing cart readiness rather than silently disabling card buttons',()=>{
 const card=readFileSync('src/components/paypal-card-fields-checkout.tsx','utf8');
 const normal=readFileSync('src/components/customer-payment-submit.tsx','utf8');
 for(const code of [card,normal]){
  assert.match(code,/address&&!cartReady/);
  assert.match(code,/rh-checkout-unavailable-note/);
  assert.match(code,/disabled=\{!ready\}/);
 }
});
