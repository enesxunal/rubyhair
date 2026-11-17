#!/usr/bin/env node
'use strict';
/** Non-transactional API smoke tests: no orders, charges, admin writes or stock changes. */
const base=process.argv[2]||'http://127.0.0.1:8765';
const input=new URL(base);
if(!['http:','https:'].includes(input.protocol)||input.username||input.password||input.search||input.hash||input.pathname!=='/')throw Error('INVALID_BASE_URL');
if(input.protocol==='http:'&&!['localhost','127.0.0.1','[::1]'].includes(input.hostname))throw Error('HTTPS_REQUIRED');
const results=[];
const check=(name,ok,detail)=>{results.push({name,status:ok?'PASS':'FAIL',detail});};
async function api(name,route,init,expectedCode){
  try{
    const resp=await fetch(new URL(route,input).toString(),{...init,redirect:'error',signal:AbortSignal.timeout(13000),headers:{'Content-Type':'application/json',...init?.headers}});
    const body=await resp.json().catch(()=>({}));
    check(name,resp.status===expectedCode,`HTTP ${resp.status}, expected ${expectedCode}`);
    return {status:resp.status,data:body};
  }catch(e){check(name,false,`Network / invalid API response: ${e.name||'unknown'}`);return {status:0,data:{}};}
}
async function run(){
  const home=await fetch(input,{signal:AbortSignal.timeout(13000)}).catch(()=>null);
  check('homepage',home?.status===200,`HTTP ${home?.status||0}`);
  const catalog=await api('catalog_endpoint','/api/catalog',{},200);
  const products=catalog.data.products||[];
  const variants=products.flatMap(p=>(p.variations||[]).map(v=>({...v,product:p.slug})));
  check('database_catalog',catalog.data.source==='postgresql'&&products.length===2&&variants.length===38,
    `${catalog.data.source||'unknown'} / products ${products.length} / variants ${variants.length}`);
  check('updated_prices',variants.find(v=>v.id===1782)?.price===140&&variants.find(v=>v.id===1786)?.price===150,
    `1782=${variants.find(v=>v.id===1782)?.price||'?'} EUR; 1786=${variants.find(v=>v.id===1786)?.price||'?'} EUR`);
  const stockUnknown=variants.filter(v=>v.stock_quantity===null).length;
  check('stock_snapshot_read',variants.every(v=>v.stock_quantity===null||(Number.isSafeInteger(v.stock_quantity)&&v.stock_quantity>=0)),`Unverified stock ${stockUnknown}/38; blocks go-live`);
  const quote=await api('quote_endpoint','/api/cart/quote',{method:'POST',body:JSON.stringify({lines:[{id:1782,quantity:1},{id:1786,quantity:1}]})},200);
  check('quote_amount',quote.data.subtotalCents===29000&&quote.data.currency==='EUR'&&quote.data.source==='postgresql',
    `subtotal cents ${quote.data.subtotalCents||'?'}; source ${quote.data.source||'unknown'}`);
  check('quote_requires_stock_review',quote.data.checkoutEnabled===false&&quote.data.needsReview===true&&quote.data.lines?.every(x=>x.status==='unverified-stock'),
    `checkoutEnabled=${quote.data.checkoutEnabled}; needsReview=${quote.data.needsReview}`);
  const invalid=await api('invalid_quote_rejected','/api/cart/quote',{method:'POST',body:JSON.stringify({lines:[{id:1782,quantity:0}]})},400);
  check('validation_error_code',invalid.data.error==='INVALID_CART',`error=${invalid.data.error||'unknown'}`);
  const checkout=await api('checkout_denied','/api/checkout',{method:'POST',body:'{}'},503);
  check('checkout_fail_closed',checkout.data.error==='CHECKOUT_NOT_CONFIGURED',`error=${checkout.data.error||'unknown'}`);
  const tryon=await api('tryon_config_read','/api/tryon/generate',{},200);
  check('tryon_consent_required',tryon.data.requiresConsent===true,`requiresConsent=${tryon.data.requiresConsent}`);
  const failures=results.filter(x=>x.status==='FAIL');
  // A functional smoke pass is not a release authorization. Explicitly
  // distinguish safe API behavior from merchant readiness.
  const releaseBlocks=[];
  if(stockUnknown>0)releaseBlocks.push('PHYSICAL_STOCK_UNVERIFIED');
  if(checkout.data.error==='CHECKOUT_NOT_CONFIGURED')releaseBlocks.push('CHECKOUT_DISABLED');
  console.log(JSON.stringify({target:input.origin,mode:'read-only + fail-closed POST',smoke:failures.length?'FAIL':'PASS',release:releaseBlocks.length?'NO_GO':'REQUIRES_PROVIDER_E2E_SIGNOFF',releaseBlocks,tests:results.length,passed:results.length-failures.length,failed:failures.length,checks:results},null,2));
  if(failures.length)process.exitCode=1;
}
run().catch(e=>{console.error('SMOKE_FATAL',e.name);process.exitCode=2;});
