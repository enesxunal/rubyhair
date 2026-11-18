import {test} from "node:test";
import assert from "node:assert/strict";
import {createCustomerInvoicePdf} from "../src/lib/customer-invoice";
import {KlarnaClient} from "../src/lib/klarna-provider-core";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";

const info={invoiceNumber:"RH-2026-0000008",orderNumber:"8",issuedAt:new Date("2026-11-18T13:00:00Z"),customerName:"Test Kundin",
 customerEmail:"test@example.com",billingStreet:"Beispielstrasse 11",billingPostalCode:"45130",billingCity:"Essen",
 paymentMethod:"paypal" as const,paymentReference:"TEST_PAYPAL_REFERENCE_1234",
 lines:[{description:"Tape-in Extensions Farbe 4 45-50 cm",quantity:1,unitCents:14000,totalCents:14000}],
 subtotalCents:14000,shippingCents:499,totalCents:14499,taxCents:Math.round(14499*19/119)};

test("real customer invoice is a valid PDF with strict VAT, line and shipping reconciliation",()=>{
 const pdf=createCustomerInvoicePdf(info);
 assert.ok(pdf.subarray(0,8).toString().startsWith("%PDF-1.4"));
 assert.ok(pdf.toString("latin1").includes("startxref"));
 assert.ok(pdf.length>1200);
 assert.throws(()=>createCustomerInvoicePdf({...info,totalCents:14500}),/INVALID_CUSTOMER_INVOICE_TOTAL/);
 assert.throws(()=>createCustomerInvoicePdf({...info,lines:[{...info.lines[0],totalCents:9999}]}),/INVALID_CUSTOMER_INVOICE_TOTAL/);
});

test("multi-page invoice generation supports 30 order lines without losing invoice items",()=>{
 const rows=Array.from({length:30},(_,i)=>({description:`Product ${i+1}`,quantity:1,unitCents:1000,totalCents:1000}));
 const gross=30000+499;
 const pdf=createCustomerInvoicePdf({...info,lines:rows,subtotalCents:30000,totalCents:gross,taxCents:Math.round(gross*19/119)});
 assert.ok(pdf.length>3000);
 assert.match(pdf.toString("latin1"),/\/Count 2/);
});

test("Klarna ordinary physical order excludes immediate auto capture",async()=>{
 const requests:{url:string;payload:any}[]=[];
 const mock=(async(url:string|URL,init?:RequestInit)=>{
  const json=JSON.parse(String(init?.body||"{}"));requests.push({url:String(url),payload:json});
  if(String(url).includes("/payments/v1/sessions"))return new Response(JSON.stringify({session_id:"d41927d7-f4bd-42b4-b12b-23629e6197fa"}),{status:200});
  return new Response(JSON.stringify({session_id:"e1ab6b9e-8a7a-4c48-946b-917f70122593",redirect_url:"https://pay.klarna.com/session/abc"}),{status:200});
 }) as typeof fetch;
 const client=new KlarnaClient("example","fake","https://api.playground.klarna.com",mock);
 const order={totalCents:14499,taxCents:Math.round(14499*19/119),shippingCents:499,orderNumber:BigInt(8)};
 const lines=[{quantity:1,unitPriceCents:14000,lineTotalCents:14000,variant:{legacyId:886,colorLabel:"Farbe 4",lengthLabel:"45-50 cm",product:{name:"Tape-in Extensions"}}}];
 const session=await client.createCustomerPaymentSession(order,lines);
 assert.ok(session.session_id);
 assert.equal(requests[0].payload.order_amount,14499);
 assert.equal(requests[0].payload.order_lines[0].type,"physical");
 assert.equal(requests[0].payload.order_lines[1].type,"shipping_fee");
 assert.equal(requests[0].payload.order_lines.reduce((s:number,l:any)=>s+l.total_tax_amount,0),order.taxCents);
 const hpp=await client.createCustomerHostedPage(session.session_id,"https://rubyhair.de/kasse/klarna/return?orderId=00000000-0000-4000-9000-000000000008&state="+"a".repeat(64));
 assert.match(hpp.redirect_url,/pay.klarna.com/);
 assert.equal(requests[1].payload.options.place_order_mode,"PLACE_ORDER");
 assert.doesNotMatch(JSON.stringify(requests[1].payload),/CAPTURE_ORDER/);
});

test("public checkout remains explicitly disabled until payment, SMTP and DHL readiness",()=>{
 const checkout=readFileSync(resolve("app/api/checkout/route.ts"),"utf8");
 const core=readFileSync(resolve("src/lib/customer-checkout.ts"),"utf8");
 const shipping=readFileSync(resolve("src/lib/customer-automation.ts"),"utf8");
 assert.match(checkout,/mode==="disabled"/);
 assert.match(checkout,/FULFILLMENT_NOT_READY/);
 assert.match(core,/RUBY_PUBLIC_CHECKOUT_MODE/);
 assert.match(core,/stockQuantity!==null/);
 assert.match(core,/stockReserved:v.stockQuantity!==null/);
 assert.match(shipping,/if\(!line.stockReserved\)continue/);
 assert.match(shipping,/DHL_CREDENTIALS_INCOMPLETE/);
 const schema=readFileSync(resolve("prisma/schema.prisma"),"utf8");
 assert.match(schema,/model OrderNotification/);
 assert.match(schema,/model ShippingJob/);
 assert.match(schema,/stockReserved\s+Boolean/);
});
