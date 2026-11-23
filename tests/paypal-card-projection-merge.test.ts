import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PaypalClient} from '../src/lib/paypal-provider-core';

test('canonical PayPal order status and capture data survive funding-source expansion',async()=>{
 const orderId='2NJ07742J7464740D';const called:string[]=[];
 const transport=(async (raw:RequestInfo|URL,options?:RequestInit)=>{
  const url=String(raw);called.push((options?.method||'GET')+' '+url);
  if(url.endsWith('/v1/oauth2/token'))return new Response(JSON.stringify({access_token:'example-token-for-test'}),{status:200});
  if(url.endsWith('?fields=payment_source'))return new Response(JSON.stringify({id:orderId,payment_source:{card:{authentication_result:{liability_shift:'POSSIBLE'}}}}),{status:200});
  if(url.endsWith('/'+orderId))return new Response(JSON.stringify({id:orderId,status:'APPROVED',purchase_units:[{custom_id:'merchant-order-uuid',amount:{currency_code:'EUR',value:'833.74'}}]}),{status:200});
  return new Response('{}',{status:404});
 }) as typeof fetch;
 const api=new PaypalClient('sandbox',{clientId:'example-client',clientSecret:'example-secret',webhookId:'WH-mock'},transport);
 const result=await api.getOrderWithPaymentSource(orderId) as {id:string;status:string;purchase_units:{amount:{value:string}}[];payment_source:{card:{authentication_result:{liability_shift:string}}}};
 assert.equal(result.status,'APPROVED');
 assert.equal(result.purchase_units[0].amount.value,'833.74');
 assert.equal(result.payment_source.card.authentication_result.liability_shift,'POSSIBLE');
 assert.ok(called.some(x=>x.endsWith('/'+orderId)));
 assert.ok(called.some(x=>x.endsWith('?fields=payment_source')));
 assert.ok(!called.some(x=>x.includes('/capture')||x.includes('/refund')));
});
