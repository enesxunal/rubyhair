const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const page=fs.readFileSync('app/admin/zahlungen/page.tsx','utf8');
test('Read-only merchant ID comparison stays behind admin auth and never reveals secret',()=>{
 assert.ok(page.indexOf('if(!await isAdmin())redirect') < page.indexOf('loadPaymentValue("klarna","live","merchantId")'));
 assert.match(page,/portalMerchantIds=\["K6701613","K6712909"\]/);
 assert.match(page,/storedMerchantId\.trim\(\)\.toUpperCase\(\)/);
 assert.match(page,/K6701613:normalized===portalMerchantIds\[0\]/);
 assert.match(page,/K6712909:normalized===portalMerchantIds\[1\]/);
 assert.match(page,/data-merchant-id=\{id\}/);
 assert.match(page,/data-merchant-match=\{result\}/);
 assert.match(page,/result==="match"/);
 assert.match(page,/result==="mismatch"/);
 assert.match(page,/type MatchResult="match"\|"mismatch"\|"unavailable"/);
 assert.doesNotMatch(page,/\{storedMerchantId\}/);
 assert.doesNotMatch(page,/console\.log\(storedMerchantId/);
 assert.doesNotMatch(page,/console\.error\(.*storedMerchantId/);
 assert.ok(!page.includes('createPaymentSession'));
});
