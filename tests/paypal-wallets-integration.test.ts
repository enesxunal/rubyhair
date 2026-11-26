import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,statSync} from "node:fs";
import {PaypalClient} from "../src/lib/paypal-provider-core";
import {checkoutInput} from "../src/lib/customer-checkout-schema";

const shipping={fullName:"Test Kundin",street:"Teststrasse 1",postalCode:"45130",city:"Essen",country:"DE" as const};
const requests:{method:string;url:string;body:string}[]=[];
const mockFetch=(async(url:RequestInfo|URL,init?:RequestInit)=>{
 const method=init?.method||"GET",body=typeof init?.body==="string"?init.body:"";
 requests.push({method,url:String(url),body});
 if(String(url).endsWith("/v1/oauth2/token"))return new Response(JSON.stringify({access_token:"example-token-12345678"}),{status:200});
 if(String(url).endsWith("/v2/checkout/orders")&&method==="POST")
  return new Response(JSON.stringify({id:"WALLET_ORDER_00001"}),{status:201});
 return new Response("{}",{status:404});
}) as typeof fetch;
const credentials={clientId:"mock-client",clientSecret:"mock-secret",webhookId:"WH-MOCK"};
const base={key:"faf86c93-a6c2-4b13-b57e-34c7274a7c0a",provider:"paypal",
 lines:[{id:886,quantity:1}],gifts:[],shipping:{firstName:"Test",lastName:"Kundin",street:"Teststrasse 1",
 postalCode:"45130",city:"Essen",country:"DE"},email:"test@example.com",consent:true};

test("Both wallets use server-priced physical checkout; gifts and Klarna rejected",()=>{
 for(const method of ["apple_pay","google_pay"]){
  assert.equal(checkoutInput.safeParse({...base,paymentExperience:method}).success,true);
  assert.equal(checkoutInput.safeParse({...base,paymentExperience:method,provider:"klarna"}).success,false);
  assert.equal(checkoutInput.safeParse({...base,paymentExperience:method,giftCode:"RH-12345-45679"}).success,false);
 }
});
test("Wallet order has exact amount, inventory identity, shipping, idempotency; no browser card data",async()=>{
 requests.length=0;
 const client=new PaypalClient("sandbox",credentials,mockFetch);
 const order=await client.createWalletOrder({orderId:"ORDER_00001",invoiceId:"RH-00001",
  requestId:"UNIQUE_WALLET_REQ_00001",totalCents:14499,shippingCents:499,shipping,
  returnUrl:"https://rubyhair.de/kasse/paypal/return",cancelUrl:"https://rubyhair.de/kasse/paypal/return?cancel=1"});
 assert.equal(order.id,"WALLET_ORDER_00001");
 const body=JSON.parse(requests.at(-1)!.body);
 assert.equal(body.intent,"CAPTURE");
 assert.equal(body.purchase_units[0].custom_id,"ORDER_00001");
 assert.equal(body.purchase_units[0].amount.currency_code,"EUR");
 assert.equal(body.purchase_units[0].amount.value,"144.99");
 assert.equal(body.purchase_units[0].amount.breakdown.shipping.value,"4.99");
 assert.ok(!("payment_source" in body),"Wallet tokens must be attached by PayPal SDK only");
 assert.ok(!requests.some(r=>r.url.endsWith("/capture")));
});
test("Wallet token and capture are guarded by separate env flags and origin checks",()=>{
 const read=(path:string)=>readFileSync(path,"utf8");
 const token=read("app/api/payments/paypal/wallet-token/route.ts"),
  capture=read("app/api/payments/paypal/wallet-capture/route.ts"),
  proxy=read("proxy.ts"),checkout=read("src/lib/customer-checkout.ts");
 assert.match(token,/RUBY_PAYPAL_APPLE_PAY_ENABLED/);
 assert.match(token,/RUBY_PAYPAL_GOOGLE_PAY_ENABLED/);
 assert.match(token,/tokenRequestAllowed\(req.headers,req.nextUrl.hostname\)/);
 assert.match(token,/publicRequestAllowed/);
 assert.match(capture,/verifyWalletCheckoutSignature/);
 assert.match(capture,/ORIGIN_NOT_ALLOWED/);
 assert.match(capture,/WALLET_SOURCE_MISMATCH/);
 assert.match(capture,/finalizePayPalCheckout/);
 assert.match(proxy,/publicGetApis=new Set\(\[[^\]]*"\/api\/payments\/paypal\/wallet-token"/);
 assert.match(proxy,/publicPostApis=new Set\(\[[^\]]*"\/api\/payments\/paypal\/wallet-capture"/);
 assert.match(checkout,/createWalletOrder/);
 assert.match(checkout,/WALLET_NOT_ENABLED/);
});
test("Checkout wallet SDK uses merchant + device eligibility and v6 sessions",()=>{
 const source=readFileSync("src/components/paypal-wallet-checkout.tsx","utf8");
 assert.match(source,/createGooglePayOneTimePaymentSession/);
 assert.match(source,/createApplePayOneTimePaymentSession/);
 assert.match(source,/isEligible\("googlepay"\)/);
 assert.match(source,/isEligible\("applepay"\)/);
 assert.match(source,/canMakePayments\(\)/);
 assert.match(source,/validateMerchant/);
 assert.match(source,/loadPaymentData/);
 assert.match(source,/confirmOrder/);
 assert.match(source,/wallet-capture/);
 assert.match(source,/PAYMENT_AUTHORIZATION/);
 assert.ok(!source.includes("clientSecret"));
 const page=readFileSync("app/kasse/page.tsx","utf8");
 assert.match(page,/RUBY_PAYPAL_APPLE_PAY_ENABLED/);
 assert.match(page,/RUBY_PAYPAL_GOOGLE_PAY_ENABLED/);
});
test("Wallet return is signed and checks paid order instead of double-capturing",()=>{
 const ret=readFileSync("app/kasse/paypal/return/page.tsx","utf8");
 assert.match(ret,/verifyWalletCheckoutSignature/);
 assert.match(ret,/walletValid/);
 assert.match(ret,/paymentReference===p.token/);
 assert.match(ret,/payment_confirmed/);
 assert.match(ret,/walletValid\?await/);
});
test("Apple domain association is official file, binary served without redirect",()=>{
 const filename="public/.well-known/apple-developer-merchantid-domain-association";
 assert.ok(statSync(filename).size>8000);
 const config=readFileSync("next.config.ts","utf8");
 const proxy=readFileSync("proxy.ts","utf8");
 assert.match(config,/application\/octet-stream/);
 assert.match(config,/apple-developer-merchantid-domain-association/);
 assert.match(proxy,/apple-developer-merchantid-domain-association/);
});

test("Card-first checkout keeps wallet actions independent and guarded",()=>{
 const checkout=readFileSync("src/components/checkout-preview.tsx","utf8");
 assert.doesNotMatch(checkout,/activePaymentMethod|checkout-payment-method/);
 assert.match(checkout,/cardAvailable&&<>/);
 assert.match(checkout,/regularCheckout=checkoutMode!=="disabled"&&!liveTest&&!oneEuroCart/);
 assert.match(checkout,/\(applePayEnabled\|\|googlePayEnabled\)&&checkoutMode!=="klarna_public"&&lines.length>0&&!gifts.length&&!appliedGift&&remainingCents>0/);
 assert.match(checkout,/<PayPalWalletCheckout accepted=\{paymentConsent\} claimPayment=\{claimPayment\}/);
 for(const name of ["customer-payment-submit","paypal-card-fields-checkout","paypal-wallet-checkout"]){
  const source=readFileSync(`src/components/${name}.tsx`,"utf8");assert.match(source,/if\(!claimPayment\(\)\)/);
 }
});
