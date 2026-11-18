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
