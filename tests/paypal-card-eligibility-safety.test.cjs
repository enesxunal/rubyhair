const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const page=fs.readFileSync('app/admin/paypal-durum/page.tsx','utf8');
const check=fs.readFileSync('src/components/paypal-card-eligibility-check.tsx','utf8');
test('PayPal card eligibility probe is admin-only and non-transactional',()=>{
 assert.ok(page.indexOf('if(!await isAdmin())redirect')<page.indexOf('loadPaymentValue("paypal","live","clientId")'));
 assert.match(page,/<PayPalCardEligibilityCheck clientId={livePublicClientId}\/>/);
 assert.match(check,/findEligibleMethods/);
 assert.match(check,/advanced_cards/);
 assert.match(check,/countryCode:"DE"/);
 assert.match(check,/currencyCode:"EUR"/);
 assert.match(check,/"https:\/\/www\.paypal\.com\/web-sdk\/v6\/core"/);
 for(const forbidden of ['createOrder(', 'captureOrder(', 'submit(', 'createCardFieldsOneTimePaymentSession(', 'clientSecret', 'webhookId'])
  assert.ok(!check.includes(forbidden),`Probe must not call ${forbidden}`);
 assert.match(check,/state==="unavailable"/);
});
