import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {trackVerifiedPurchaseOnce} from "../src/lib/verified-purchase-event";

type Signal={provider:string;args:unknown[]};
function harness(ga:boolean,meta:boolean){
 const seen:Signal[]=[],state=new Map<string,string>();
 const save=(globalThis as Record<string,unknown>);
 const previous={window:save.window,localStorage:save.localStorage,sessionStorage:save.sessionStorage};
 save.window={
  gtag:(...args:unknown[])=>seen.push({provider:"ga4",args}),
  fbq:(...args:unknown[])=>seen.push({provider:"meta",args})
 };
 save.localStorage={getItem:(key:string)=>key==="ruby_ga4_choice"&&ga||key==="ruby_marketing_choice"&&meta?"allow":"deny"};
 save.sessionStorage={getItem:(k:string)=>state.get(k)||null,setItem:(k:string,v:string)=>{state.set(k,v)}};
 return {seen,state,restore(){for(const k of Object.keys(previous) as (keyof typeof previous)[]){if(previous[k]===undefined)delete save[k];else save[k]=previous[k]}}};
}
const order="6f73b55b-a6c3-465e-af15-5c6e7c18fbdd";
const read=(name:string)=>readFileSync(name,"utf8");

test("paid browser signal is consent-only, once per verified order, never includes payment or buyer data",()=>{
 const h=harness(true,true);
 try{
  assert.equal(trackVerifiedPurchaseOnce(order),true);
  assert.equal(trackVerifiedPurchaseOnce(order),false);
  assert.deepEqual(h.seen,[{provider:"ga4",args:["event","purchase"]},{provider:"meta",args:["track","Purchase"]}]);
  assert.equal(h.state.size,1);
 }finally{h.restore()}
});
test("no purchase signal without consent or a valid verified return id",()=>{
 for(const [ga,meta] of [[false,false],[true,false],[false,true]] as const){
  const h=harness(ga,meta);
  try{
   assert.equal(trackVerifiedPurchaseOnce("customer@example.com"),false);
   assert.equal(trackVerifiedPurchaseOnce(order),ga||meta);
   assert.equal(h.seen.length,Number(ga)+Number(meta));
  }finally{h.restore()}
 }
});
test("confirmed payment gates browser purchase tracking, not cancelled/authorization-only responses",()=>{
 const success=read("src/components/checkout-success-clear.tsx");
 const paypal=read("app/kasse/paypal/return/page.tsx");
 const gift=read("app/geschenkgutschein/zahlung/page.tsx");
 const klarna=read("app/kasse/klarna/return/page.tsx");
 const giftOnly=read("app/kasse/gutschein/erfolg/page.tsx");
 assert.ok(success.includes("trackVerifiedPurchaseOnce(orderId)"));
 assert.ok(success.includes("sessionStorage.getItem(key)"));
 assert.ok(paypal.includes("valid&&paid&&<CheckoutSuccessClear"));
 assert.ok(gift.includes('link&&<VerifiedGiftPurchase purchaseId={p.id!}/>'));
 assert.ok(giftOnly.includes("paid&&<CheckoutSuccessClear"));
 assert.ok(!klarna.includes("VerifiedGiftPurchase")&&!klarna.includes("CheckoutSuccessClear")&&!klarna.includes("purchase"));
});

test("verified cash value is sent only with refreshed consent and an opaque event ID",()=>{
 const h=harness(false,true);const storage=globalThis.localStorage;
 const original=storage.getItem.bind(storage);
 storage.getItem=(key)=>key==="ruby_meta_purchase_consent"?"2026-11-26-v2":original(key);
 try{
  assert.equal(trackVerifiedPurchaseOnce(order,{value:123.99,currency:"EUR",eventId:"a".repeat(64)}),true);
  assert.deepEqual(h.seen,[{provider:"meta",args:["track","Purchase",{value:123.99,currency:"EUR"},{eventID:"a".repeat(64)}]}]);
 }finally{h.restore()}
});
test("old marketing consent does not authorize value or event identifier",()=>{
 const h=harness(false,true);
 try{
  assert.equal(trackVerifiedPurchaseOnce(order,{value:123.99,currency:"EUR",eventId:"a".repeat(64)}),true);
  assert.deepEqual(h.seen,[{provider:"meta",args:["track","Purchase"]}]);
 }finally{h.restore()}
});
