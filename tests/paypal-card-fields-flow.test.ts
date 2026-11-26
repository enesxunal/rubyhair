import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PaypalClient} from "../src/lib/paypal-provider-core";
import {checkoutInput} from "../src/lib/customer-checkout-schema";

const creds={clientId:"test-client",clientSecret:"test-secret",webhookId:"WH-TEST-98765"};
const shipping={fullName:"Test Kunde",street:"Musterstrasse 12",postalCode:"45130",city:"Essen",country:"DE" as const};
const requests:{url:string;method:string;body:string}[]=[];
const mockFetch=(async(url:RequestInfo|URL,init?:RequestInit)=>{
 const method=init?.method||"GET",body=String(init?.body||"");
 requests.push({url:String(url),method,body});
 if(String(url).endsWith("/v1/oauth2/token"))return new Response(JSON.stringify({access_token:"test-token-0123456789"}),{status:200});
 if(String(url).endsWith("/v2/checkout/orders"))return new Response(JSON.stringify({id:"PAYPAL_ORDER_98765"}),{status:201});
 return new Response(JSON.stringify({}),{status:404});
}) as typeof fetch;

test("Card checkout creates uncaptured 3DS-SCA order with trusted server amount",async()=>{
 requests.length=0;
 const c=new PaypalClient("sandbox",creds,mockFetch);
 const result=await c.createCardOrder({orderId:"ORDER_98765",invoiceId:"RH-98765",requestId:"RH-REQ-98765",totalCents:14499,shippingCents:499,shipping,returnUrl:"https://rubyhair.de/kasse/paypal/return?test=1",cancelUrl:"https://rubyhair.de/kasse/paypal/return?cancel=1"});
 assert.equal(result.id,"PAYPAL_ORDER_98765");
 assert.equal(requests.length,2);
 const body=JSON.parse(requests[1].body);
 assert.equal(body.purchase_units[0].amount.value,"144.99");
 assert.equal(body.purchase_units[0].amount.breakdown.shipping.value,"4.99");
 assert.equal(body.purchase_units[0].custom_id,"ORDER_98765");
 assert.equal(body.payment_source.card.attributes.verification.method,"SCA_ALWAYS");
 assert.match(body.payment_source.card.experience_context.return_url,/^https:\/\/rubyhair\.de\//);
 assert.ok(!requests.some(r=>/\/capture/.test(r.url)));
 assert.ok(!body.payment_source.card.number);
});

test("Card browser token does not return merchant secret",async()=>{
 requests.length=0;
 const c=new PaypalClient("sandbox",creds,mockFetch);
 assert.equal(await c.browserClientToken(),"test-token-0123456789");
 assert.match(requests[0].body,/response_type=client_token/);
 assert.ok(!requests[0].body.includes(creds.clientSecret));
});

test("Card schema accepts physical checkout but rejects card gift purchases and Klarna",()=>{
 const base={key:"35c973f1-9ec8-4bee-9d3e-ea1cd6b954a5",provider:"paypal",paymentExperience:"card",lines:[{id:886,quantity:1}],gifts:[],shipping:{firstName:"Test",lastName:"Kunde",street:"Musterstrasse 1",postalCode:"45130",city:"Essen",country:"DE"},email:"test@example.com",consent:true};
 assert.equal(checkoutInput.safeParse(base).success,true);
 assert.equal(checkoutInput.safeParse({...base,provider:"klarna"}).success,false);
 assert.equal(checkoutInput.safeParse({...base,giftCode:"RH-EXAMPLE-CODE-12345"}).success,false);
});

test("Unsigned PayPal webhook requests fail before accessing merchant secrets",()=>{
 const route=readFileSync("app/api/payments/paypal/webhook/route.ts","utf8");
 assert.ok(route.indexOf("paypal-transmission-sig")>0);
 assert.ok(route.indexOf("paypal-transmission-sig")<route.indexOf('providerForCheckout("paypal")'));
 assert.match(route,/INVALID_SIGNATURE/);
});

test("Production proxy permits only GET token and POST capture with independent route guards",()=>{
 const proxy=readFileSync("proxy.ts","utf8");
 const token=readFileSync("app/api/payments/paypal/card-token/route.ts","utf8");
 const capture=readFileSync("app/api/payments/paypal/card-capture/route.ts","utf8");
 assert.match(proxy,/publicGetApis=new Set\(\[[^\]]*"\/api\/payments\/paypal\/card-token"/);
 assert.match(proxy,/publicPostApis=new Set\(\[[^\]]*"\/api\/payments\/paypal\/card-capture"/);
 assert.match(proxy,/path==="\/api\/payments\/paypal\/webhook"&&request.method==="POST"/);
 assert.match(token,/RUBY_PAYPAL_CARD_FIELDS_ENABLED/);
 assert.match(token,/site!=="same-origin"/);
 assert.match(token,/publicRequestAllowed/);
 assert.match(capture,/RUBY_PAYPAL_CARD_FIELDS_ENABLED/);
 assert.match(capture,/verifyCheckoutSignature/);
 assert.match(capture,/Origin_NOT_ALLOWED|ORIGIN_NOT_ALLOWED/);
});

test("Card checkout is feature flagged across all route and UI boundaries",()=>{
 const read=(p:string)=>readFileSync(p,"utf8");
 for(const p of ["src/lib/customer-checkout.ts","app/api/payments/paypal/card-token/route.ts","app/api/payments/paypal/card-capture/route.ts","app/kasse/page.tsx"])
  assert.match(read(p),/RUBY_PAYPAL_CARD_FIELDS_ENABLED/);
 const component=read("src/components/paypal-card-fields-checkout.tsx");
 assert.match(component,/createCardFieldsOneTimePaymentSession/);
 assert.match(component,/isEligible\("advanced_cards"\)/);
 assert.match(component,/liabilityShift!=="POSSIBLE"/);
 assert.ok(!component.includes("clientSecret"));
 const capture=read("app/api/payments/paypal/card-capture/route.ts");
 assert.match(capture,/verifyCheckoutSignature/);
 assert.match(capture,/payment_source/);
 assert.match(capture,/liability_shift!=="POSSIBLE"/);
 assert.match(capture,/finalizePayPalCheckout/);
});
