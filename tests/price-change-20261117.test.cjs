const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const catalog=require('../src/data/products.json');
const manifest=require('../scripts/price-change-20261117.json');

test('Ruby Hair 2026-11-17 pricing raises every imported variant exactly once by 5 EUR',()=>{
  assert.equal(manifest.revision,'rubyhair-20261117-plus-5-eur');
  assert.equal(manifest.deltaCents,500);
  assert.equal(manifest.currency,'EUR');
  assert.equal(manifest.variants.length,38);
  const lookup=new Map();
  for(const p of manifest.variants){
    assert.ok(Number.isSafeInteger(p.legacyId));
    assert.ok(Number.isSafeInteger(p.beforeCents));
    assert.equal(p.afterCents,p.beforeCents+500);
    assert.equal(lookup.has(p.legacyId),false);
    lookup.set(p.legacyId,p);
  }
  const variants=Object.entries(catalog.products).flatMap(([slug,p])=>{
    const prices=p.variations.map(v=>v.price);
    assert.equal(p.min_price,Math.min(...prices));
    assert.equal(p.max_price,Math.max(...prices));
    return p.variations.map(v=>({slug,...v}));
  });
  assert.equal(variants.length,47);
  const originals=variants.filter(v=>lookup.has(v.id));
  const archived=variants.filter(v=>!lookup.has(v.id));
  assert.equal(originals.length,38);
  assert.equal(archived.length,9);
  assert.ok(archived.every(v=>v.available===false&&v.purchasable===false&&v.stock_quantity===0));
  for(const v of originals){
    const m=lookup.get(v.id);
    assert.ok(m,`Missing manifest entry for ${v.id}`);
    assert.equal(m.slug,v.slug);
    assert.equal(Math.round(v.price*100),m.afterCents);
  }
});

test('price change is explicitly bounded to new storefront and guarded by old DB values',()=>{
  const script=fs.readFileSync(path.join(__dirname,'../scripts/apply-price-change-20261117.cjs'),'utf8');
  assert.ok(script.includes('MIXED_PRICING_STATE_REFUSE_TO_APPLY'));
  assert.ok(script.includes('CONCURRENT_PRICE_CHANGE'));
  assert.ok(script.includes('ROLLBACK_SNAPSHOT_WRITTEN'));
  assert.ok(script.includes('ALREADY_APPLIED'));
  assert.ok(script.includes("priceCents:expected.beforeCents"));
  assert.ok(script.includes('stock and active status unchanged'));
});
