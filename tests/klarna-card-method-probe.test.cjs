const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const provider=fs.readFileSync('src/lib/klarna-provider-core.ts','utf8');
const action=fs.readFileSync('app/admin/klarna-kart-actions.ts','utf8');
const page=fs.readFileSync('app/admin/klarna-kart-durum/page.tsx','utf8');
test('Klarna probe is admin-gated and only creates a temporary, no-customer session',()=>{
 assert.ok(action.indexOf('if(!await isAdmin())')<action.indexOf('const [username,password,merchantId]'));
 assert.match(provider,/async createCardMethodProbeSession\(/);
 const part=provider.split('async createCardMethodProbeSession(){')[1].split('async createPaymentSession(')[0];
 assert.match(part,/"POST","\/payments\/v1\/sessions"/);
 assert.match(part,/order_amount:10000,order_tax_amount:1597/);
 assert.match(part,/type:"physical"/);
 assert.ok(!/billing_address|shipping_address|email|customer|payment_url|capture|hpp/.test(part));
 assert.ok(!/createCustomerCheckout|createCustomerHostedPage|captureCustomerOrder|createHostedPage/.test(action));
 assert.match(action,/check.categories.includes\("pay_by_card"\)/);
 assert.match(action,/"pay_now_only"/);
 assert.match(page,/Pay Now vorhanden – Kartenzahlung NICHT nachgewiesen/);
 assert.match(page,/Keine Bestellung/gi);
});
