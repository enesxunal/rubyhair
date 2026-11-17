#!/usr/bin/env node
'use strict';
/* Guarded, idempotent one-time +5 EUR price update for new Ruby Hair DB.
   Never touches WooCommerce, orders, stock, or provider credentials. */
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {PrismaClient,Prisma}=require('@prisma/client');
const manifest=require('./price-change-20261117.json');
const source=require('../src/data/products.json');
const apply=process.argv.includes('--apply');
const envPath=process.env.RUBY_PRICE_ENV_FILE||'.vercel/rubyhair-admin-diagnostics.env';
if(!fs.existsSync(envPath))throw Error('ENV_FILE_NOT_FOUND');
for(const line of fs.readFileSync(envPath,'utf8').split(/\r?\n/)){
  if(!line.startsWith('DATABASE_URL='))continue;
  let val=line.slice('DATABASE_URL='.length).trim();
  if((val[0]==='"'&&val.at(-1)==='"')||(val[0]==="'"&&val.at(-1)==="'"))val=val.slice(1,-1);
  process.env.DATABASE_URL=val;
}
if(!process.env.DATABASE_URL?.startsWith('postgres'))throw Error('DATABASE_URL_NOT_SET');
if(manifest.revision!=='rubyhair-20261117-plus-5-eur'||manifest.deltaCents!==500||manifest.variants.length!==38)throw Error('MANIFEST_INVALID');
const byId=new Map();
for(const r of manifest.variants){
  if(!Number.isSafeInteger(r.legacyId)||byId.has(r.legacyId)||r.afterCents!==r.beforeCents+500)throw Error('MANIFEST_DUPLICATE_OR_INVALID');
  const product=source.products[r.slug];
  const current=product?.variations.find(v=>v.id===r.legacyId);
  if(!current||Math.round(current.price*100)!==r.afterCents)throw Error('CATALOG_NOT_AT_TARGET_PRICE');
  byId.set(r.legacyId,r);
}
const backupDir=path.join(os.homedir(),'.config','desnod','rubyhair','backups');
fs.mkdirSync(backupDir,{recursive:true,mode:0o700});
fs.chmodSync(backupDir,0o700);
const backupPath=path.join(backupDir,'rubyhair-new-db-prices-before-plus-5-20261117.json');
const db=new PrismaClient({datasources:{db:{url:process.env.DATABASE_URL}}});
async function main(){
  const data=await db.variant.findMany({select:{id:true,legacyId:true,priceCents:true,active:true,stockQuantity:true,product:{select:{slug:true}}}});
  if(data.length!==byId.size)throw Error('PRODUCTION_VARIANT_COUNT_MISMATCH');
  let oldCount=0,newCount=0;
  for(const variant of data){
    const expected=byId.get(variant.legacyId);
    if(!expected||expected.slug!==variant.product.slug)throw Error('PRODUCTION_VARIANT_ID_MISMATCH');
    if(variant.priceCents===expected.beforeCents)oldCount++;
    else if(variant.priceCents===expected.afterCents)newCount++;
    else throw Error('PRODUCTION_PRICE_OUTSIDE_EXPECTED_STATE');
  }
  if(newCount===data.length){
    console.log('ALREADY_APPLIED 38/38; no writes');return;
  }
  if(oldCount!==data.length)throw Error('MIXED_PRICING_STATE_REFUSE_TO_APPLY');
  console.log('PRECHECK_OK old=38 new=0; all prices exact and stock will remain unchanged');
  if(!apply){console.log('DRY_RUN_ONLY use --apply for atomic update');return;}
  if(process.env.RUBY_PRICE_CONFIRM!=='RUBY_HAIR_20261117_PLUS_5_EUR')throw Error('PRICE_CONFIRMATION_REQUIRED');
  const backup={createdAt:new Date().toISOString(),revision:manifest.revision,source:'new Ruby Hair DB before update',before:data.map(({id,legacyId,priceCents,stockQuantity,active})=>({id,legacyId,priceCents,stockQuantity,active}))};
  if(fs.existsSync(backupPath))throw Error('ROLLBACK_SNAPSHOT_ALREADY_EXISTS');
  fs.writeFileSync(backupPath,JSON.stringify(backup,null,2)+'\n',{flag:'wx',mode:0o600});
  fs.chmodSync(backupPath,0o600);
  const digest=crypto.createHash('sha256').update(fs.readFileSync(backupPath)).digest('hex');
  console.log('ROLLBACK_SNAPSHOT_WRITTEN sha256='+digest);
  await db.$transaction(async tx=>{
    const current=await tx.variant.findMany({select:{id:true,legacyId:true,priceCents:true}});
    if(current.length!==byId.size||current.some(v=>v.priceCents!==byId.get(v.legacyId)?.beforeCents))throw Error('CONCURRENT_PRICE_CHANGE');
    for(const v of current){
      const expected=byId.get(v.legacyId);
      const result=await tx.variant.updateMany({where:{id:v.id,legacyId:v.legacyId,priceCents:expected.beforeCents},data:{priceCents:expected.afterCents}});
      if(result.count!==1)throw Error('CONCURRENT_WRITE_ABORTED');
    }
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:30000,maxWait:10000});
  const verified=await db.variant.findMany({select:{legacyId:true,priceCents:true,stockQuantity:true,active:true}});
  if(verified.length!==data.length||verified.some(v=>v.priceCents!==byId.get(v.legacyId)?.afterCents||v.stockQuantity!==data.find(x=>x.legacyId===v.legacyId)?.stockQuantity||v.active!==data.find(x=>x.legacyId===v.legacyId)?.active))throw Error('POST_UPDATE_VERIFICATION_FAILED');
  console.log('PRICE_UPDATE_PASS 38/38 +500 cents, stock and active status unchanged');
}
main().catch(e=>{console.error('PRICE_UPDATE_FAILED',e.code||e.message);process.exitCode=1}).finally(()=>db.$disconnect());
