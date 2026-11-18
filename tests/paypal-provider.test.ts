import {test} from "node:test";
import assert from "node:assert/strict";
import {PaypalClient,PaypalError,centsToEuro,euroToCents} from "../src/lib/paypal-provider-core";
const credentials={clientId:"mock-client",clientSecret:"mock-secret",webhookId:"WH-EXAMPLE-123"};
const shipping={fullName:"Demo Kunde",street:"Teststrasse 1",postalCode:"45130",city:"Essen",country:"DE" as const};
const response=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json"}});
const fakeFetch=(requests:{path:string;method:string;body:unknown;requestId:string|null}[],payload?:unknown,approve="https://www.sandbox.paypal.com/checkoutnow?token=TEST"):typeof fetch=>
 (async(url:RequestInfo|URL,init?:RequestInit)=>{
   const path=new URL(String(url)).pathname;
   const method=init?.method||"GET";
   requests.push({path,method,body:init?.body&&typeof init.body==="string"?init.body:null,requestId:new Headers(init?.headers).get("PayPal-Request-Id")});
   if(path==="/v1/oauth2/token")return response(200,{access_token:"example-token-123456",expires_in:3600});
   if(path==="/v2/checkout/orders"&&method==="POST")return response(201,{id:"PAYPAL_ORDER_1234",links:[{rel:"approve",href:approve}]});
   if(path.startsWith("/v2/checkout/orders/")&&path.endsWith("/capture"))return response(201,payload||{id:"PAYPAL_ORDER_1234",status:"COMPLETED",purchase_units:[{custom_id:"ORDER_1234",payments:{captures:[{id:"CAPTURE_1234",status:"COMPLETED",amount:{currency_code:"EUR",value:"19.99"}}]}}]});
   if(path.endsWith("/verify-webhook-signature"))return response(200,payload||{verification_status:"SUCCESS"});
   return response(404,{});
 }) as typeof fetch;

test("currency conversion does not use floating-point discrepancies",()=>{
 assert.equal(centsToEuro(499),"4.99");
 assert.equal(centsToEuro(999999),"9999.99");
 assert.equal(euroToCents("19.99"),1999);
 for(const v of ["0.001","5.9","3.000","3.0abc","-1.00","NaN"])assert.throws(()=>euroToCents(v),PaypalError);
 assert.throws(()=>centsToEuro(-1),PaypalError);
});
test("PayPal order request uses exact server amount, shipping, and idempotency",async()=>{
 const requests:{path:string;method:string;body:unknown;requestId:string|null}[]=[];
 const client=new PaypalClient("sandbox",credentials,fakeFetch(requests));
 const order=await client.createOrder({orderId:"ORDER_1234",invoiceId:"RH-1234",totalCents:1999,shippingCents:499,requestId:"idempotency_12345678",shipping,returnUrl:"https://rubyhair.de/kasse?status=return",cancelUrl:"https://rubyhair.de/kasse?status=cancel"});
 assert.equal(order.id,"PAYPAL_ORDER_1234");
 assert.ok(order.approvalUrl.startsWith("https://www.sandbox.paypal.com/"));
 assert.equal(requests.length,2);
 const req=requests[1];
 assert.equal(req.path,"/v2/checkout/orders");
 assert.equal(req.requestId,"idempotency_12345678");
 const body=JSON.parse(req.body as string);
 assert.equal(body.purchase_units[0].amount.value,"19.99");
 assert.equal(body.purchase_units[0].amount.breakdown.item_total.value,"15.00");
 assert.equal(body.purchase_units[0].amount.breakdown.shipping.value,"4.99");
 assert.equal(body.purchase_units[0].custom_id,"ORDER_1234");
});
test("redirect host and environment are strictly constrained",async()=>{
 for(const host of ["https://evil.example/checkout","http://www.sandbox.paypal.com/checkoutnow","https://www.paypal.com/checkoutnow"]){
  const client=new PaypalClient("sandbox",credentials,fakeFetch([],undefined,host));
  await assert.rejects(()=>client.createOrder({orderId:"ORDER_1234",invoiceId:"RH-1234",totalCents:1000,shippingCents:0,requestId:"idempotency_12345678",shipping,returnUrl:"https://rubyhair.de/",cancelUrl:"https://rubyhair.de/"}),PaypalError);
 }
});
test("capture marks paid only for matching completed capture amount",async()=>{
 const client=new PaypalClient("sandbox",credentials,fakeFetch([]));
 const result=await client.captureOrder("PAYPAL_ORDER_1234","capture_12345678");
 assert.equal(client.requireCompletedCapture(result,"ORDER_1234",1999,"PAYPAL_ORDER_1234").captureId,"CAPTURE_1234");
 assert.throws(()=>client.requireCompletedCapture(result,"ORDER_1234",2000,"PAYPAL_ORDER_1234"),/PAYPAL_AMOUNT_MISMATCH/);
 assert.throws(()=>client.requireCompletedCapture(result,"OTHER_1234",1999,"PAYPAL_ORDER_1234"),/PAYPAL_ORDER_MISMATCH/);
 assert.throws(()=>client.requireCompletedCapture(result,"ORDER_1234",1999,"DIFFERENT"),/PAYPAL_CAPTURE_NOT_COMPLETED/);
});
test("unverified webhook and replayed timestamps are rejected before API request",async()=>{
 const requests:{path:string;method:string;body:unknown;requestId:string|null}[]=[];
 const client=new PaypalClient("sandbox",credentials,fakeFetch(requests));
 assert.equal(await client.verifyWebhook(new Headers(),{}),false);
 const headers=new Headers({"paypal-transmission-id":"any","paypal-transmission-time":"2015-01-01T00:00:00Z","paypal-cert-url":"https://api-m.sandbox.paypal.com/v1/notifications/certs/cert","paypal-auth-algo":"SHA256withRSA","paypal-transmission-sig":"signature"});
 assert.equal(await client.verifyWebhook(headers,{}),false);
 assert.equal(requests.length,0);
 headers.set("paypal-transmission-time",new Date().toISOString());
 assert.equal(await client.verifyWebhook(headers,{id:"EVENT_1234"}),true);
 assert.equal(requests[1].path,"/v1/notifications/verify-webhook-signature");
});
test("provider 401 cannot be mistaken for authorization",async()=>{
 const client=new PaypalClient("sandbox",credentials,(async()=>response(401,{})) as typeof fetch);
 await assert.rejects(()=>client.token(),/PAYPAL_AUTH_REJECTED/);
});

test("live internal 1-EUR purchase is non-shippable, uses exact amount and does not capture",async()=>{
 const requests:{path:string;method:string;body:unknown;requestId:string|null}[]=[];
 const client=new PaypalClient("sandbox",credentials,fakeFetch(requests));
 const created=await client.createOneEuroQaOrder({orderId:"1dd90721-195f-4598-88a9-5ec2b9acaf44",invoiceId:"RH-QA-2026-0000001",requestId:"QA-CREATE-1dd90721-195f-4598-88a9-5ec2b9acaf44",returnUrl:"https://rubyhair.de/qa/paypal/return",cancelUrl:"https://rubyhair.de/qa/paypal/return?cancel=1"});
 assert.equal(created.id,"PAYPAL_ORDER_1234");
 assert.equal(requests.length,2);
 const req=JSON.parse(requests[1].body as string);
 assert.equal(req.purchase_units[0].amount.value,"1.00");
 assert.equal(req.purchase_units[0].amount.currency_code,"EUR");
 assert.equal(req.purchase_units[0].custom_id,"1dd90721-195f-4598-88a9-5ec2b9acaf44");
 assert.equal(req.payment_source.paypal.experience_context.shipping_preference,"NO_SHIPPING");
 assert.ok(requests.every(r=>!r.path.includes("/capture")));
 assert.ok(!JSON.stringify(req).includes('shipping_address'));
});
