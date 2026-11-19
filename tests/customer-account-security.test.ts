import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {customerToken,hashCustomerToken,normalizeCustomerEmail,validCustomerEmail,validCustomerToken,customerRateKey,safeCustomerInvoiceName,safeCustomerTrackingUrl,CUSTOMER_SESSION_AGE_SEC,LOGIN_TOKEN_AGE_MS} from "../src/lib/customer-account-rules";
const read=(p:string)=>readFileSync(p,"utf8");
test("secure account tokens have strong entropy, hashed-only storage and short expiry",()=>{
 const token=customerToken(),second=customerToken();
 assert.equal(token.length,64);
 assert.ok(validCustomerToken(token));
 assert.notEqual(token,second);
 assert.notEqual(hashCustomerToken(token),token);
 assert.equal(hashCustomerToken(token),hashCustomerToken(token));
 assert.equal(validCustomerToken("https://x.com"),false);
 assert.equal(validCustomerToken("0".repeat(32)),false);
 assert.equal(LOGIN_TOKEN_AGE_MS,900000);
 assert.equal(CUSTOMER_SESSION_AGE_SEC,2592000);
});
test("e-mail identity is normalized and rate keys are HMAC scoped",()=>{
 assert.equal(normalizeCustomerEmail("  KUNDE@EXAMPLE.COM  "),"kunde@example.com");
 assert.ok(validCustomerEmail("kunde@example.com"));
 assert.equal(validCustomerEmail("bad@x\r\nBcc:xx@evil.com"),false);
 assert.notEqual(customerRateKey("email","foo@example.com","x".repeat(32)),customerRateKey("ip","foo@example.com","x".repeat(32)));
});
test("invoice filenames, DHL tracking URLs and view scope prevent unsafe links and IDOR",()=>{
 assert.equal(safeCustomerInvoiceName("RH-2026-0000005"),"RH-2026-0000005");
 assert.equal(safeCustomerInvoiceName("evil\r\nContent-Length: 99"),"Ruby-Hair-Rechnung");
 assert.equal(safeCustomerTrackingUrl("DHL","00340434123456789012"),"https://www.dhl.de/de/privatkunden/dhl-sendungsverfolgung.html?piececode=00340434123456789012");
 assert.equal(safeCustomerTrackingUrl("DHL","javascript:alert(1)"),null);
 const invoice=read("app/api/konto/rechnung/[id]/route.ts");
 assert.ok(invoice.includes('customerEmail:{equals:account.email,mode:"insensitive"}'));
 assert.ok(invoice.includes('testOnly:false'));
 assert.ok(invoice.includes('"Cache-Control":"private, no-store, max-age=0"'));
 const account=read("app/konto/page.tsx");
 assert.ok(account.includes('getCustomerAccount()'));
 assert.ok(account.includes('testOnly:false'));
});
test("account never auto-creates a profile in guest checkout and sessions remain httpOnly",()=>{
 const checkout=read("src/lib/customer-checkout.ts");
 const auth=read("src/lib/customer-account.ts");
 assert.ok(!checkout.includes('customerAccount.upsert'));
 assert.ok(!checkout.includes('customerSession.create'));
 assert.ok(auth.includes('httpOnly:true'));
 assert.ok(auth.includes('sameSite:"lax"'));
 assert.ok(auth.includes('customerLoginToken.updateMany'));
 assert.ok(auth.includes('usedAt:null,expiresAt:{gt:now}'));
 assert.ok(auth.includes('customerSession.create'));
 assert.ok(auth.includes('origin===expected'));
 const proxy=read("proxy.ts");
 assert.ok(proxy.includes('"/api/konto/verify"'));
 assert.ok(proxy.includes('"/api/konto/login"'));
 assert.ok(proxy.includes('"/api/konto/logout"'));
 assert.ok(proxy.includes('api\\/konto\\/rechnung'));
});
test("migration only adds new customer tables and preserves orders and payments",()=>{
 const sql=read("prisma/migrations/20261119113000_customer_account_magic_link/migration.sql");
 for(const name of ["customer_accounts","customer_login_tokens","customer_sessions","customer_auth_rate_limits"])assert.ok(sql.includes('CREATE TABLE "'+name+'"'));
 assert.ok(!/DROP TABLE|ALTER TABLE "orders"|ALTER TABLE "payment_events"|ALTER TABLE "invoices"|UPDATE "orders"|DELETE FROM/i.test(sql));
 assert.ok(sql.includes('ON DELETE CASCADE'));
 const page=read("src/components/customer-login-panel.tsx");
 assert.ok(page.includes('new URLSearchParams(window.location.hash'));
 assert.ok(page.includes('window.history.replaceState'));
 assert.ok(page.includes('Konto erstellen & anmelden'));
 const verify=read("app/api/konto/verify/route.ts");
 assert.ok(verify.includes('sameOriginCustomerRequest()'));
 const cron=read("app/api/internal/customer-account-cleanup/route.ts");
 assert.ok(cron.includes('Bearer ${secret}'));
});

test("temporary PostgreSQL pool outages are retried once without resending mail",async()=>{
 const {retryCustomerDb}=await import("../src/lib/customer-account-rules");
 let attempts=0;
 const result=await retryCustomerDb(async()=>{
  attempts++;
  if(attempts===1)throw Object.assign(new Error("transient connection wait"),{code:"P2024"});
  return "OK";
 },1);
 assert.equal(result,"OK");
 assert.equal(attempts,2);
 let permanentAttempts=0;
 await assert.rejects(()=>retryCustomerDb(async()=>{permanentAttempts++;throw Object.assign(new Error("invalid auth"),{code:"P2002"})},1));
 assert.equal(permanentAttempts,1);
 const source=read("src/lib/customer-account-mail.ts");
 assert.ok(source.includes('retryCustomerDb(()=>loadStoreMailSettings())'));
 assert.ok(!source.includes('retryCustomerDb(()=>smtp.sendMail'));
 const route=read("app/api/konto/login/route.ts");
 assert.ok(route.includes('customer_login_unavailable'));
 assert.ok(!route.includes('console.warn(error)'));
});
