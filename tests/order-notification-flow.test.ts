import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {renderOrderMail} from "../src/lib/order-mail-templates";

const read=(p:string)=>readFileSync(p,"utf8");

test("Klarna creates idempotent buyer + admin notifications on verified authorization",()=>{
 const finalize=read("src/lib/customer-order-finalize.ts");
 const worker=read("src/lib/customer-automation.ts");
 assert.match(finalize,/stage:"received".*stage:"received_admin"/);
 assert.match(finalize,/skipDuplicates:true/);
 assert.match(worker,/queueAuthorizedKlarnaNotifications/);
 assert.match(worker,/status:"payment_authorized"/);
 assert.match(worker,/testOnly:false/);
 assert.match(worker,/notifications:\{none:\{stage:"received"\}\}/);
 assert.match(worker,/received_admin/);
 assert.match(worker,/skipDuplicates:true/);
});

test("store notification is sent to both info mailbox and owner's existing Gmail",()=>{
 const config=read("src/lib/store-mail-settings.ts");
 const worker=read("src/lib/customer-automation.ts");
 const sender=read("src/lib/store-mail-transport.ts");
 assert.match(config,/from:"info@rubyhair.de"/);
 assert.match(config,/notify:"nazmibulganlar@gmail.com"/);
 assert.match(config,/adminOrderNotificationRecipients/);
 assert.match(config,/new Set\(values.filter\(validMailAddress\)/);
 assert.match(worker,/adminOrderNotificationRecipients\(store.recipient\)/);
 assert.match(sender,/to:recipients/);
 assert.match(sender,/recipients.some\(x=>!accepted.has\(x\)\)/);
 assert.match(sender,/SMTP_NOT_CONFIGURED/);
});

test("customer confirmation uses the real buyer email, never a fixed test address",()=>{
 const worker=read("src/lib/customer-automation.ts");
 assert.match(worker,/adminCopy\?adminOrderNotificationRecipients\(store.recipient\):order.customerEmail/);
 assert.match(worker,/!order.customerEmail/);
 assert.match(worker,/isReceived&&!\["payment_authorized"/);
 assert.match(worker,/!isReceived&&item.stage!=="failed"&&item.stage!=="cancelled"&&!order.invoice/);
 assert.match(worker,/status:"queued"/);
 assert.match(worker,/orderNotification.updateMany/);
});

test("new Klarna customer email is an authorization notice not a captured payment claim",()=>{
 const data={orderNumber:"RH-5",customerName:"Test Kundin",customerEmail:"buyer@example.com",totalCents:14499,
   items:[{name:"Tape-in Farbe 4",quantity:2,totalCents:14000}]};
 const customer=renderOrderMail("received",data);
 const admin=renderOrderMail("received_admin",data);
 const paid=renderOrderMail("paid_admin",data);
 assert.match(customer.html,/RubyHair-WebHeader-Logo-Hell/);
 assert.match(customer.text,/autorisiert/);
 assert.doesNotMatch(customer.text,/Zahlung bestätigt\./);
 assert.doesNotMatch(customer.html,/buyer@example\.com/);
 assert.match(customer.text,/2 × Tape-in Farbe 4/);
 assert.match(admin.subject,/Klarna-Bestellung/);
 assert.match(admin.text,/Kunden-E-Mail: buyer@example\.com/);
 assert.match(admin.text,/nicht eingezogen/);
 assert.match(paid.subject,/bezahlte Bestellung/);
 assert.match(paid.text,/Zahlung/);
});

test("store admin panel has a protected multi-recipient SMTP test with no payment",()=>{
 const admin=read("app/admin/mail-actions.ts");
 const page=read("app/admin/benachrichtigungen/page.tsx");
 assert.match(admin,/sendStoreAdminMailTestAction/);
 assert.match(admin,/if\(!await isAdmin\(\)\)redirect/);
 assert.match(admin,/sendStoreAdminSmtpTest\(\)/);
 assert.match(page,/Test an alle Shop-Empfänger senden/);
 assert.match(page,/adminOrderNotificationRecipients\(config.recipient\)/);
});
