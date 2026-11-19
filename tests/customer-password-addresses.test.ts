import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {hashCustomerPassword,verifyCustomerPassword} from "../src/lib/customer-password";
import {parseCustomerNames,parseCustomerAddress,validNewPassword} from "../src/lib/customer-profile-validation";
import {renderCustomerRegistrationMail} from "../src/lib/customer-account-mail-template";
const read=(p:string)=>readFileSync(p,"utf8");
test("passwords use salted scrypt, reject invalid and never store plaintext",async()=>{
 const password="RubyHairUnique123!";
 assert.ok(validNewPassword(password));
 assert.equal(validNewPassword("1234"),false);
 assert.equal(validNewPassword("onlylettersabcdef"),false);
 assert.equal(validNewPassword("only1234"),false);
 const hash1=await hashCustomerPassword(password),hash2=await hashCustomerPassword(password);
 assert.notEqual(hash1,hash2);
 assert.ok(hash1.startsWith("scrypt$16384$"));
 assert.ok(!hash1.includes(password));
 assert.equal(await verifyCustomerPassword(password,hash1),true);
 assert.equal(await verifyCustomerPassword("wrongpass123",hash1),false);
 assert.equal(await verifyCustomerPassword("wrongpass123",null),false);
 assert.equal(await verifyCustomerPassword("wrongpass123","bad"),false);
});
test("customer names and German delivery addresses are server-validated",()=>{
 assert.deepEqual(parseCustomerNames({firstName:"  Anna ",lastName:" Muster  "}),{firstName:"Anna",lastName:"Muster"});
 assert.equal(parseCustomerNames({firstName:"<script>",lastName:"Test"}),null);
 const good={label:"Zuhause",firstName:"Anna",lastName:"Muster",street:"Musterstraße 20",postalCode:"50667",city:"Köln",country:"DE"};
 assert.deepEqual(parseCustomerAddress(good),good);
 assert.equal(parseCustomerAddress({...good,country:"XX"}),null);
 assert.equal(parseCustomerAddress({...good,postalCode:"1234"}),null);
 assert.equal(parseCustomerAddress({...good,street:"<script>"}),null);
});
test("account mail matches Ruby Hair order style and branded logo",()=>{
 const link="https://rubyhair.de/konto/anmelden/#token="+"a".repeat(64);
 const mail=renderCustomerRegistrationMail(link);
 assert.ok(mail.subject.startsWith("Ruby Hair |"));
 assert.ok(mail.html.includes('RubyHair-WebHeader-Logo-Hell-818376d91.png'));
 assert.ok(mail.html.includes('background:#282028'));
 assert.ok(mail.html.includes('background:#f7f4f5'));
 assert.ok(mail.html.includes('RUBY HAIR · BEAUTY IN EVERY DETAIL'));
 assert.ok(mail.html.includes('Vorname')||mail.html.includes('Namen'));
 assert.ok(mail.html.includes(link));
 assert.ok(!mail.html.includes('Ein Passwort brauchst du nicht'));
 assert.throws(()=>renderCustomerRegistrationMail('https://evil.test/?token=x'));
 const order=read('src/lib/order-mail-templates.ts');
 assert.ok(order.includes('RubyHair-WebHeader-Logo-Hell-818376d91.png'));
});
test("registration requires first name last name and password from verified email token",()=>{
 const client=read('src/components/customer-login-panel.tsx');
 for(const name of ['given-name','family-name','new-password','Konto erstellen & anmelden','Passwort wiederholen'])assert.ok(client.includes(name),name);
 assert.ok(client.includes('window.history.replaceState'));
 const route=read('app/api/konto/verify/route.ts');
 assert.ok(route.includes('parseCustomerNames(body)'));
 assert.ok(route.includes('validNewPassword(body?.password)'));
 assert.ok(route.includes('finishCustomerLogin(body.token,body)'));
 const auth=read('src/lib/customer-account.ts');
 assert.ok(auth.includes('hashCustomerPassword(pw)'));
 assert.ok(auth.includes('tx.customerSession.updateMany'));
 assert.ok(auth.includes('usedAt:null,expiresAt:{gt:now}'));
 assert.ok(auth.includes('httpOnly:true'));
});
test("profile address APIs scope writes by authenticated customer and support create edit delete default",()=>{
 const route=read('app/api/konto/adressen/route.ts');
 for(const s of ['accountId:account.id','sameOriginCustomerRequest()','getCustomerAccount()','parseCustomerAddress(body)','method','customerAddress.updateMany','customerAddress.deleteMany']){
  if(s==='method')continue;
  assert.ok(route.includes(s),s);
 }
 assert.ok(route.includes('count>=5'));
 assert.ok(route.includes('isDefault:true'));
 assert.ok(route.includes('"Cache-Control":"private, no-store"'));
 const proxy=read("proxy.ts");
 assert.ok(proxy.includes('request.method==="PUT"&&path==="/api/konto/profile"'));
 assert.ok(proxy.includes('request.method==="PATCH"||request.method==="DELETE"'));
 const profile=read('src/components/customer-account-settings.tsx');
 for(const s of ['Adresse hinzufügen','Adresse speichern','Bearbeiten','Löschen','Als Standard-Lieferadresse verwenden'])assert.ok(profile.includes(s));
 const account=read('app/konto/page.tsx');
 assert.ok(account.includes('testOnly:false'));
 assert.ok(account.includes('CustomerAccountSettings'));
 const checkout=read('src/components/checkout-address-preview.tsx');
 assert.ok(checkout.includes('Gespeicherte Adresse verwenden'));
 assert.ok(checkout.includes('onValidated?.(null)'));
});
test("second customer migration adds only optional profile fields and saved address table",()=>{
 const sql=read('prisma/migrations/20261119160000_customer_password_profile_addresses/migration.sql');
 assert.ok(sql.includes('ALTER TABLE "customer_accounts"'));
 assert.ok(sql.includes('CREATE TABLE "customer_addresses"'));
 assert.ok(sql.includes('ON DELETE CASCADE'));
 assert.ok(!/ALTER TABLE "orders"|ALTER TABLE "invoices"|ALTER TABLE "payment_events"|DROP TABLE|DELETE FROM "orders"|UPDATE "orders"/.test(sql));
});
