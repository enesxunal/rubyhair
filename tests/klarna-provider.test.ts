import {test} from "node:test";
import assert from "node:assert/strict";
import {KlarnaClient,KlarnaProviderError,requireExactOneEuroCapture,requireKlarnaRedirect} from "../src/lib/klarna-provider-core";

const kp="11111111-1111-4111-8111-111111111111";
const hpp="22222222-2222-4222-8222-222222222222";
const om="33333333-3333-4333-8333-333333333333";
const captured="44444444-4444-4444-8444-444444444444";
function mockClient(){
 const calls:{path:string;method:string;body:any;idempotency:string|null}[]=[];
 const send=(async (url:string|URL|Request,init?:RequestInit)=>{
  const u=new URL(String(url));
  const body=init?.body?JSON.parse(String(init.body)):null;
  calls.push({path:u.pathname,method:init?.method||"GET",body,idempotency:new Headers(init?.headers).get("Klarna-Idempotency-Key")});
  let result:any={};
  if(u.pathname==="/payments/v1/sessions")result={session_id:kp,payment_method_categories:[{identifier:"pay_now",name:"Jetzt bezahlen"}]};
  if(u.pathname==="/hpp/v1/sessions"&&init?.method==="POST")result={session_id:hpp,redirect_url:"https://pay.klarna.com/eu/hpp/payments/example"};
  if(u.pathname==="/hpp/v1/sessions/"+hpp)result={session_id:hpp,status:"COMPLETED",order_id:om};
  if(u.pathname==="/ordermanagement/v1/orders/"+om)result={order_id:om,order_amount:100,purchase_currency:"EUR"};
  if(u.pathname==="/ordermanagement/v1/orders/"+om+"/captures"&&init?.method==="GET")result={captures:[{capture_id:captured,captured_amount:100}]};
  if(u.pathname==="/ordermanagement/v1/orders/"+om+"/captures"&&init?.method==="POST")result={capture_id:captured};
  return new Response(JSON.stringify(result),{status:200,headers:{"Content-Type":"application/json"}});
 }) as typeof fetch;
 return {api:new KlarnaClient("test-user","test-secret","https://api.klarna.com",send),calls};
}
test("Klarna QA is strictly 1 euro and hosted page only redirects to Klarna",async()=>{
 const {api,calls}=mockClient();
 const session=await api.createPaymentSession("10");
 assert.equal(session.session_id,kp);
 assert.equal(calls[0].body.order_amount,100);
 assert.equal(calls[0].body.purchase_currency,"EUR");
 assert.equal(calls[0].body.order_tax_amount,16);
 assert.equal(calls[0].body.order_lines[0].total_amount,100);
 const h=await api.createHostedPage(kp,"https://rubyhair.de/qa/klarna/return?ref=11111111-1111-4111-8111-111111111111");
 assert.equal(h.session_id,hpp);
 assert.equal(calls[1].body.options.place_order_mode,"PLACE_ORDER");
 assert.equal(calls[1].body.options.payment_method_category,"pay_now");
 assert.ok(calls[1].body.merchant_urls.success.includes("{{order_id}}"));
 assert.ok(!JSON.stringify(calls.slice(0,2)).includes("captured_amount"));
 assert.equal((await api.readHostedPage(hpp)).status,"COMPLETED");
});
test("capture requires separate explicit method call and idempotency key",async()=>{
 const {api,calls}=mockClient();
 await api.captureOneEuro(om,om);
 const capture=calls[0];
 assert.equal(capture.method,"POST");
 assert.equal(capture.body.captured_amount,100);
 assert.equal(capture.idempotency,om);
 assert.equal(requireExactOneEuroCapture({captures:[{capture_id:captured,captured_amount:100}]}),captured);
 assert.throws(()=>requireExactOneEuroCapture({captures:[{capture_id:captured,captured_amount:200}]}),KlarnaProviderError);
 assert.throws(()=>requireExactOneEuroCapture({captures:[{capture_id:captured,captured_amount:100},{capture_id:om,captured_amount:100}]}),KlarnaProviderError);
});
test("rejects forged Klarna redirect destinations",()=>{
 assert.equal(requireKlarnaRedirect("https://pay.klarna.com/eu/hpp/payments/example"),"https://pay.klarna.com/eu/hpp/payments/example");
 for(const url of ["http://pay.klarna.com/eu","https://evil.example/pay","https://pay.klarna.com.evil.example/"])assert.throws(()=>requireKlarnaRedirect(url),KlarnaProviderError);
});

import {cancelIdempotencyKey,cancellationLocalReason,remoteCancellationState} from "../src/lib/order-cancellation-policy";
import {readFileSync} from "node:fs";
test("merchant cancellation requires a verified uncaptured Klarna order and uses its own stable idempotency key",async()=>{
 const key=cancelIdempotencyKey(om);
 assert.match(key,/^[0-9a-f-]{36}$/);
 assert.equal(key,cancelIdempotencyKey(om));assert.notEqual(key,om);
 const {api,calls}=mockClient();await api.cancelUncapturedOrder(om,key);
 assert.deepEqual(calls[0],{path:"/ordermanagement/v1/orders/"+om+"/cancel",method:"POST",body:null,idempotency:key});
 const valid={order_id:om,order_amount:48099,purchase_currency:"EUR",status:"AUTHORIZED",captured_amount:0,refunded_amount:0};
 assert.equal(remoteCancellationState(valid,om,48099,[]),"authorized");
 assert.equal(remoteCancellationState({...valid,status:"CANCELLED"},om,48099,[]),"cancelled");
 for(const bad of [{...valid,captured_amount:1},{...valid,captured_amount:undefined},{...valid,status:"CAPTURED"},{...valid,order_amount:1},{...valid,order_id:hpp}])assert.equal(remoteCancellationState(bad,om,48099,[]),"review");
 assert.equal(remoteCancellationState(valid,om,48099,[{}]),"review");
 const row={testOnly:false,status:"payment_authorized",currency:"EUR",totalCents:48099,giftAppliedCents:0,trackingNumber:null,shippedAt:null,deliveredAt:null,paymentReference:"KLARNA-HPP:"+hpp,fulfillmentNote:"Klarna authorized: "+om,invoice:null,payments:[],giftPurchases:[],shippingJob:{status:"waiting_credentials",trackingNumber:null,hasLabel:false}};
 assert.equal(cancellationLocalReason(row),null);
 assert.equal(cancellationLocalReason({...row,testOnly:true}),"NOT_UNCAPTURED_KLARNA");
 assert.equal(cancellationLocalReason({...row,payments:[{}]}),"PAYMENT_OR_GIFT_REVIEW");
 assert.equal(cancellationLocalReason({...row,shippingJob:{...row.shippingJob,hasLabel:true}}),"SHIPPING_REVIEW");
 assert.equal(cancellationLocalReason({...row,shippingJob:{...row.shippingJob,status:"submitting"}}),"SHIPPING_REVIEW");
 assert.equal(cancellationLocalReason({...row,shippingJob:{...row.shippingJob,status:"order_cancel_review"}}),null);
});
test("private cancellation route has server authorization, explicit confirmation and verified provider before atomic stock release",()=>{
 const page=readFileSync("app/admin/stornierung/page.tsx","utf8"),action=readFileSync("app/admin/stornierung/actions.ts","utf8"),service=readFileSync("src/lib/admin-order-cancellation.ts","utf8");
 assert.ok(page.includes('if(!await isAdmin())redirect'));
 assert.ok(action.includes('if(!await isAdmin())redirect'));
 assert.ok(action.includes('data.get("confirm")!=="on"'));
 assert.ok(service.indexOf('if(state!=="cancelled")throw')<service.indexOf('await db.$transaction'));
 assert.ok(service.includes('if(!line.stockReserved)continue'));
 assert.ok(service.includes('TransactionIsolationLevel.Serializable'));
 assert.ok(!readFileSync("app/admin/admin-shell.tsx","utf8").includes("/admin/stornierung"));
});
