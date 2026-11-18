import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PaypalClient} from "../src/lib/paypal-provider-core";
import {KlarnaClient} from "../src/lib/klarna-provider-core";
const read=(p:string)=>readFileSync(p,"utf8");

test("PayPal refund preflight uses only OAuth and captured-payment GET",async()=>{
 const calls:{method:string;url:string}[]=[];
 const fetchMock=(async(url:string|URL,init?:RequestInit)=>{
  const method=init?.method||"GET";calls.push({method,url:String(url)});
  if(String(url).endsWith('/v1/oauth2/token'))return new Response(JSON.stringify({access_token:'sandbox-mock-access-token'}),{status:200});
  if(String(url).endsWith('/v2/payments/captures/6AB12345CD6789012'))return new Response(JSON.stringify({id:'6AB12345CD6789012',status:'COMPLETED',amount:{currency_code:'EUR',value:'829.99'}}),{status:200});
  throw Error("Unexpected provider endpoint");
 }) as typeof fetch;
 const api=new PaypalClient('sandbox',{clientId:'mock-client',clientSecret:'mock-secret',webhookId:'mock-hook'},fetchMock);
 const value=await api.getCapture('6AB12345CD6789012') as any;
 assert.equal(value.status,'COMPLETED');
 assert.deepEqual(calls.map(v=>v.method),['POST','GET']);
 assert.ok(calls.every(v=>!v.url.includes('/refund')));
});

test("Klarna refund preflight issues only order GET",async()=>{
 const calls:{method:string;url:string}[]=[];
 const mock=(async(url:string|URL,init?:RequestInit)=>{
  calls.push({method:init?.method||'GET',url:String(url)});
  return new Response(JSON.stringify({order_id:'deadbeef-dead-4aaa-9bbb-deadbeefdead',order_amount:82999,purchase_currency:'EUR',captured_amount:82999,refunded_amount:0,status:'CAPTURED'}),{status:200});
 }) as typeof fetch;
 const api=new KlarnaClient('sandbox-user','sandbox-pass','https://api.playground.klarna.com',mock);
 const value=await api.readOrder('deadbeef-dead-4aaa-9bbb-deadbeefdead');
 assert.equal(value.refunded_amount,0);
 assert.deepEqual(calls.map(v=>v.method),['GET']);
 assert.ok(calls.every(v=>!v.url.includes('/refund')));
});

test("read-only refund management has admin protection and no money-changing methods",()=>{
 const logic=read('src/lib/refund-readonly-audit.ts');
 const page=read('app/admin/erstattungen/page.tsx');
 assert.match(logic,/getCapture\(ev.providerEventId\)/);
 assert.match(logic,/readOrder\(match\[1\]\)/);
 assert.match(logic,/PAYPAL_CAPTURE_TOTAL_MISMATCH/);
 assert.match(logic,/KLARNA_ORDER_TOTAL_MISMATCH/);
 assert.doesNotMatch(logic,/refundCapture|createRefund|captureOrder|refundCustomer|\.api\.refund/);
 assert.match(page,/if\(!await isAdmin\(\)\)/);
 assert.match(page,/keine Erstattung aus/);
});

test("CSP enforces embedding and unsafe-object restrictions, payment-friendly policy stays report-only",()=>{
 const config=read('next.config.ts');
 assert.match(config,/Content-Security-Policy", value: "object-src 'none'; base-uri 'self'; frame-ancestors 'none'/);
 assert.match(config,/Content-Security-Policy-Report-Only/);
});

test("shop header/footer use one navigation model and route CSS stays out of root bundle",()=>{
 const nav=read('src/lib/store-navigation.ts');
 const home=read('src/components/home-frontend.tsx');
 const shell=read('src/components/site-shell.tsx');
 const root=read('app/layout.tsx');
 assert.match(nav,/storefrontNav/);
 assert.match(nav,/storefrontInfoLinks/);
 assert.match(nav,/Vertrag widerrufen/);
 assert.match(home,/storefrontNav,storefrontShopLinks,storefrontInfoLinks/);
 assert.match(shell,/storefrontNav,storefrontShopLinks,storefrontInfoLinks/);
 assert.doesNotMatch(root,/admin\.css|admin-v2\.css|tryon\.css|instagram-home\.css|influencer-stories\.css/);
 assert.match(read('app/admin/layout.tsx'),/admin-v2\.css/);
 assert.match(read('app/haar-anprobe/page.tsx'),/tryon\.css/);
 assert.match(read('app/page.tsx'),/instagram-home\.css/);
});
