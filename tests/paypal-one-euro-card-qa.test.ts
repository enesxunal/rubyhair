import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PaypalClient} from "../src/lib/paypal-provider-core";
import {assessOneEuroCardCapture} from "../src/lib/qa-card-capture-policy";

const requests:{url:string;method:string;body:string;idempotency?:string}[]=[];
const transport=(async(url:RequestInfo|URL,init?:RequestInit)=>{
 const method=init?.method||"GET";
 const headers=new Headers(init?.headers);
 requests.push({url:String(url),method,body:String(init?.body||""),idempotency:headers.get("PayPal-Request-Id")||undefined});
 if(String(url).endsWith("/v1/oauth2/token"))return new Response(JSON.stringify({access_token:"test-access-token"}),{status:200});
 if(String(url).endsWith("/v2/checkout/orders"))return new Response(JSON.stringify({id:"PAYPAL_QA_12345"}),{status:201});
 return new Response("{}",{status:404});
}) as typeof fetch;

test("1 EUR QA card order is fixed, no shipping, has SCA and is never captured on create",async()=>{
 requests.length=0;
 const client=new PaypalClient("sandbox",{clientId:"test-client",clientSecret:"test-secret",webhookId:"WH-TEST"},transport);
 const order=await client.createOneEuroQaCardOrder({orderId:"df921310-858f-4720-af79-22ad24402875",invoiceId:"RH-QA-2026-0000005",requestId:"QA-CARD-CREATE-df921310-858f-4720-af79-22ad24402875",returnUrl:"https://rubyhair.de/admin/paypal-kart-test",cancelUrl:"https://rubyhair.de/admin/paypal-kart-test"});
 assert.equal(order.id,"PAYPAL_QA_12345");
 assert.equal(requests.length,2);
 const body=JSON.parse(requests[1].body);
 assert.equal(body.intent,"CAPTURE");
 assert.equal(body.purchase_units.length,1);
 assert.equal(body.purchase_units[0].amount.value,"1.00");
 assert.equal(body.purchase_units[0].amount.currency_code,"EUR");
 assert.equal(body.purchase_units[0].custom_id,"df921310-858f-4720-af79-22ad24402875");
 assert.equal(body.payment_source.card.attributes.verification.method,"SCA_ALWAYS");
 assert.equal(body.payment_source.card.experience_context.shipping_preference,"NO_SHIPPING");
 assert.equal(requests.some(r=>r.url.endsWith("/capture")),false);
});
test("one 1 EUR card QA is admin-only, one-time, idempotent and separate from real checkout",()=>{
 const helper=readFileSync("src/lib/qa-card-one-euro.ts","utf8");
 for(const name of ["qa-card-qa"]){assert.ok(!helper.includes(name))}
 assert.match(helper,/testOnly:true/);
 assert.match(helper,/stockQuantity:1/);
 assert.match(helper,/TEST_ALREADY_EXISTS/);
 assert.match(helper,/totalCents:100/);
 assert.match(helper,/shippingCents:0/);
 assert.match(helper,/confirmOneEuroQaPayment/);
 assert.match(readFileSync("src/lib/qa-card-capture-policy.ts","utf8"),/CARD_3DS_REQUIRES_REVIEW/);
 assert.match(helper,/order.paymentReference!==paypalOrderId/);
 assert.ok(!helper.includes("finalizePayPalCheckout"));
 const routes=["token","start","capture","status"];
 for(const name of routes){
  const route=readFileSync(`app/api/admin/paypal-card-qa/${name}/route.ts`,"utf8");
  assert.match(route,/qaAuthorized/);
  assert.match(route,/qaHeaders/);
  assert.ok(!route.includes("clientSecret"));
 }
 const auth=readFileSync("src/lib/qa-card-http.ts","utf8");
 assert.match(auth,/isAdmin/);
 assert.match(auth,/ORIGIN_NOT_ALLOWED/);
 assert.match(auth,/REQUEST_TOO_LARGE/);
 const page=readFileSync("app/admin/paypal-kart-test/page.tsx","utf8");
 assert.match(page,/redirect\("\/admin\/login"\)/);
 assert.match(page,/lastCardQaOrder/);
});
test("QA secure card iframe fields, read-only status and single-action capture",()=>{
 const ui=readFileSync("app/admin/paypal-kart-test/card-qa-form.tsx","utf8");
 assert.match(ui,/createCardFieldsOneTimePaymentSession/);
 assert.match(ui,/isEligible\("advanced_cards"\)/);
 assert.match(ui,/advanced_cards/);
 assert.match(ui,/submitted.current=true/);
 assert.match(ui,/result.state!=="succeeded"/);
 assert.match(ui,/wallet-capture|paypal-card-qa\/capture/);
 assert.match(ui,/setInterval\(\(\)=>void refresh\(\),8000\)/);
 assert.ok(!ui.includes("cardNumber"));
 assert.ok(!ui.includes("cardCvv"));
});


test("one-EUR admin card capture allows CREATED only with card source, exact amount and SDK liability shift",()=>{
 const orderId="f972c25b-8aba-4598-8ce6-5c591dc85a76",paypalOrderId="9LP59976LK416793E";
 const remote={id:paypalOrderId,status:"CREATED",purchase_units:[{custom_id:orderId,amount:{currency_code:"EUR",value:"1.00"}}],
  payment_source:{card:{authentication_result:{liability_shift:"POSSIBLE"}}}};
 assert.deepEqual(assessOneEuroCardCapture(remote,orderId,paypalOrderId,"POSSIBLE"),{ok:true,providerStatus:"CREATED"});
 assert.deepEqual(assessOneEuroCardCapture({...remote,status:"APPROVED"},orderId,paypalOrderId,"POSSIBLE"),{ok:true,providerStatus:"APPROVED"});
 assert.equal(assessOneEuroCardCapture(remote,orderId,paypalOrderId,"NO").ok,false);
 assert.equal(assessOneEuroCardCapture({...remote,purchase_units:[{custom_id:orderId,amount:{currency_code:"EUR",value:"10.00"}}]},orderId,paypalOrderId,"POSSIBLE").ok,false);
 assert.equal(assessOneEuroCardCapture({...remote,payment_source:{}},orderId,paypalOrderId,"POSSIBLE").ok,false);
 assert.equal(assessOneEuroCardCapture({...remote,purchase_units:[{custom_id:orderId,amount:{currency_code:"EUR",value:"1.00"},payments:{captures:[{status:"COMPLETED"}]}}]},orderId,paypalOrderId,"POSSIBLE").ok,false);
 assert.equal(assessOneEuroCardCapture({...remote,status:"COMPLETED"},orderId,paypalOrderId,"POSSIBLE").ok,false);
});

test("previous 1-EUR order is reusable without opening a second order or automatic capture",()=>{
 const ui=readFileSync("app/admin/paypal-kart-test/card-qa-form.tsx","utf8");
 const code=readFileSync("src/lib/qa-card-one-euro.ts","utf8");
 const page=readFileSync("app/admin/paypal-kart-test/page.tsx","utf8");
 assert.match(ui,/if\(existingOrderId&&existingPaypalOrderId\)/);
 assert.match(ui,/if\(!safeExisting\)/);
 assert.match(ui,/result\.data\?\.liabilityShift!=="POSSIBLE"/);
 assert.match(ui,/sdkLiabilityShift:result\.data\.liabilityShift/);
 assert.match(page,/existingPaypalOrderId=\{existing\?\.paymentReference/);
 assert.match(code,/const canRetry=false/);
 assert.match(code,/assessOneEuroCardCapture/);
 assert.match(code,/admin_card_capture_attempted_review/);
 assert.match(code,/Prisma.TransactionIsolationLevel.Serializable/);
 assert.match(code,/getOrderWithPaymentSource/);
 assert.match(code,/captureStatus/);
 assert.match(ui,/safeExisting=false/);
 assert.match(ui,/Capture bereits versucht/);
});


test("PayPal capture rejection log is sanitized; never store card details",()=>{
 const provider=readFileSync("src/lib/paypal-provider-core.ts","utf8");
 assert.match(provider,/RUBY_PAYPAL_CAPTURE_REJECTED/);
 assert.match(provider,/debugId/);
 assert.match(provider,/issue/);
 assert.ok(!provider.includes("console.warn(\"RUBY_PAYPAL_CAPTURE_REJECTED\",{detail}"));
 const ui=readFileSync("app/admin/paypal-kart-test/card-qa-form.tsx","utf8");
 assert.match(ui,/PayPal Zahlung:/);
 assert.match(ui,/PayPal Bestellbetrag:/);
 assert.match(ui,/PayPal 3DS:/);
});

test("captured QA reconciliation uses only provider GET, verified receipt and DB transaction",()=>{
 const source=readFileSync("src/lib/qa-card-one-euro.ts","utf8");
 const part=source.split("export async function reconcileCardQaCapturedOrder(orderId:string){")[1]?.split("export async function cardQaStatus(orderId:string){")[0];
 assert.ok(part);
 assert.match(part,/api\.getOrderWithPaymentSource/);
 assert.match(part,/paypal\.status!=="COMPLETED"/);
 assert.match(part,/api\.requireCompletedCapture\(paypal,order\.id,100,order\.paymentReference\)/);
 assert.match(part,/card\.authentication_result/);
 assert.match(part,/payment_confirmed/);
 assert.match(part,/tx\.invoice\.create/);
 assert.match(part,/tx\.paymentEvent\.create/);
 assert.match(part,/alreadyReconciled:true/);
 assert.doesNotMatch(part,/api\.captureOrder|confirmOneEuroQaPayment|createOneEuroQaCardOrder|refund/);
 const route=readFileSync("app/api/admin/paypal-card-qa/reconcile/route.ts","utf8");
 assert.match(route,/qaAuthorized\(req,true\)/);
 assert.match(route,/qaRequestJson/);
 assert.match(route,/reconcileCardQaCapturedOrder/);
 assert.doesNotMatch(route,/captureOrder|refund|createOrder/);
});
