const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const page=fs.readFileSync('app/admin/zahlungen/page.tsx','utf8');
test('Read-only merchant ID comparison stays behind admin auth and never reveals secret',()=>{
 assert.ok(page.indexOf('if(!await isAdmin())redirect') < page.indexOf('loadPaymentValue("klarna","live","merchantId")'));
 assert.match(page,/portalMerchantId="K6701613"/);
 assert.match(page,/storedMerchantId\.trim\(\)\.toUpperCase\(\)===portalMerchantId/);
 assert.match(page,/data-merchant-match=\{merchantIdMatch\}/);
 assert.match(page,/merchantIdMatch==="match"/);
 assert.match(page,/merchantIdMatch==="mismatch"/);
 assert.match(page,/merchantIdMatch:"match"\|"mismatch"\|"unavailable"/);
 assert.doesNotMatch(page,/\{storedMerchantId\}/);
 assert.doesNotMatch(page,/console\.log\(storedMerchantId/);
 assert.doesNotMatch(page,/console\.error\(.*storedMerchantId/);
 assert.ok(!page.includes('createPaymentSession'));
});
