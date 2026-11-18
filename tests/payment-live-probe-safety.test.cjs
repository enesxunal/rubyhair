const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const p=require('node:path');const root=p.join(__dirname,'..');
test('provider connection test is admin-only and cannot take money',()=>{
 const source=fs.readFileSync(p.join(root,'src/lib/provider-connection-check.ts'),'utf8');
 const action=fs.readFileSync(p.join(root,'app/admin/payment-check-action.ts'),'utf8');
 assert.match(action,/if\(!await isAdmin\(\)\)/);
 assert.match(action,/provider!=="paypal"&&provider!=="klarna"/);
 assert.match(source,/client\.token\(\)/);
 assert.match(source,/method:"GET"/);
 assert.match(source,/https:\/\/api\.klarna\.com\/payments\/v1\/sessions\//);
 assert.match(source,/randomUUID\(\)/);
 assert.match(source,/cache:"no-store"/);
 assert.ok(!source.includes('captureOrder('));
 assert.ok(!source.includes('createOrder('));
 assert.ok(!source.includes('method:"POST"'));
});
