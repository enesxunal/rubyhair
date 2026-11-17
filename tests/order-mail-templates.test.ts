import {test} from "node:test";
import assert from "node:assert/strict";
import {renderOrderMail,orderMailStages} from "../src/lib/order-mail-templates";

test("Ruby Hair order communications have eight distinct German stages",()=>{
 assert.equal(orderMailStages.length,8);
 assert.equal(new Set(orderMailStages).size,8);
 for(const stage of orderMailStages){
   const msg=renderOrderMail(stage,{orderNumber:"RH-2026-1001",customerName:"Test Kundin",totalCents:14999});
   assert.ok(msg.subject.includes("RH-2026-1001"));
   assert.ok(msg.text.includes("149,99"));
   assert.ok(msg.html.includes("RUBY HAIR EXTENSIONS"));
   assert.ok(msg.html.includes("RubyHair-WebHeader-Logo-Hell-818376d91.png"));
   assert.ok(msg.html.includes("info@rubyhair.de"));
   assert.ok(msg.html.includes("<table"));
   assert.ok(msg.html.includes("<meta name=\"viewport\""));
   assert.ok(msg.html.includes("table-layout:fixed"));
   assert.ok(msg.html.includes("overflow-wrap:anywhere"));
   assert.ok(msg.html.includes("Test Kundin"));
   assert.ok(!msg.subject.includes("undefined"));
 }
});
test("email templates escape malicious customer-supplied information",()=>{
 const template=renderOrderMail("shipped",{orderNumber:'RH-<script>alert(1)</script>',customerName:'<img src=x onerror=alert(1)>',trackingNumber:'<svg onload=alert(1)>',carrier:'DHL\r\nBcc:evil@domain.tld',totalCents:25000});
 assert.ok(!template.html.includes('<script>'));
 assert.ok(!template.html.includes('<img src=x onerror'));
 assert.ok(!template.html.includes('<svg onload'));
 assert.ok(template.html.includes('&lt;script&gt;'));
 assert.ok(template.html.includes('&lt;img'));
 assert.ok(!template.subject.includes('\r'));
 assert.ok(!template.subject.includes('\n'));
 assert.ok(template.html.includes('Sendungsnummer'));
 assert.ok(template.text.includes('Bcc:evil@domain.tld'));
});
test("email order subjects cannot be empty or use header injection",()=>{
 assert.throws(()=>renderOrderMail("received",{orderNumber:"\n\r"}),/ORDER_NUMBER_REQUIRED/);
 const out=renderOrderMail("paid",{orderNumber:"100\r\nBcc:fraud@evil.test"});
 assert.ok(!out.subject.includes('\n'));
 assert.ok(!out.subject.includes('\r'));
 assert.equal(out.subject.includes('100'),true);
});
test("failed and cancelled orders do not promise confirmed refunds",()=>{
 const cancelled=renderOrderMail("cancelled",{orderNumber:"1234"});
 const failed=renderOrderMail("failed",{orderNumber:"1234"});
 assert.ok(cancelled.text.includes("Erstattung separat"));
 assert.ok(failed.text.includes("nicht bestätigt"));
 assert.ok(!failed.text.includes("Zahlung bestätigt."));
});
