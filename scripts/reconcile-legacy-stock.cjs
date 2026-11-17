#!/usr/bin/env node
'use strict';
/** Read-only WooCommerce -> new shop inventory review. Do not import quantities automatically. */
const fs=require('node:fs');
const path=require('node:path');
const home=require('node:os').homedir();
const privateDir=path.join(home,'.config/desnod/rubyhair/inventory');
const source=path.join(privateDir,'legacy-variations-20261117.json');
const output=path.join(privateDir,'merchant-stock-review-20261117.csv');
const args=process.argv.slice(2),idx=args.indexOf('--env-file');
if(idx>=0){
 const envFile=args[idx+1];if(!envFile||!fs.existsSync(envFile))throw Error('ENV_MISSING');
 for(const line of fs.readFileSync(envFile,'utf8').split(/\r?\n/)){
  const m=line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);if(!m)continue;
  let v=m[2].trim();if((v[0]==='"'&&v.at(-1)==='"')||(v[0]==="'"&&v.at(-1)==="'"))v=v.slice(1,-1);
  process.env[m[1]]=v;
 }
}
const old=JSON.parse(fs.readFileSync(source,'utf8'));
if(!Array.isArray(old)||old.length<10||old.some(r=>!Array.isArray(r)||r.length!==7))throw Error('SOURCE_INVALID');
const prev=new Map(old.map(r=>[Number(r[0]),{
 id:Number(r[0]),parent:Number(r[1]),status:r[2],stock:r[3],price:r[4],managed:r[5],availability:r[6]
}]));
if(prev.size!==old.length)throw Error('DUPLICATE_LEGACY_IDS');
const esc=(v)=>'"'+String(v??'').replace(/"/g,'""')+'"';
async function main(){
 const {PrismaClient}=require('@prisma/client');
 const db=new PrismaClient({datasources:{db:{url:process.env.DATABASE_URL}}});
 try{
  const rows=await db.variant.findMany({select:{legacyId:true,priceCents:true,stockQuantity:true,active:true,colorCode:true,lengthCode:true,product:{select:{name:true,slug:true}}},orderBy:[{productId:'asc'},{legacyId:'asc'}]});
  const audit=rows.map(v=>{
   const a=prev.get(v.legacyId??-1);
   const qty=a?.stock?.match(/^(0|[1-9][0-9]*)$/)?Number(a.stock):null;
   const price=a?.price&&/^\d+(\.\d{1,2})?$/.test(a.price)?Math.round(Number(a.price)*100):null;
   const checks=[];
   if(!a)checks.push('NO_LEGACY_VARIATION');
   if(a&&a.status!=='publish')checks.push('LEGACY_NOT_PUBLISHED');
   if(a&&a.managed!=='yes')checks.push('STOCK_NOT_MANAGED');
   if(qty===null)checks.push('LEGACY_QUANTITY_UNVERIFIED');
   if(price===null)checks.push('LEGACY_PRICE_UNVERIFIED');
   if(price!==null&&price!==v.priceCents)checks.push('PRICE_DIFF');
   if(qty===0&&a?.availability==='instock')checks.push('LEGACY_STATUS_CONFLICT');
   return {legacyId:v.legacyId,product:v.product.name,slug:v.product.slug,color:v.colorCode,length:v.lengthCode,newPriceCents:v.priceCents,oldPriceCents:price,oldQty:qty,oldState:a?.availability??'',oldManaged:a?.managed??'',newQty:v.stockQuantity,active:v.active,issues:checks.join('|')};
  });
  const extra=old.filter(r=>!rows.some(v=>v.legacyId===Number(r[0]))).length;
  const headers=['legacyId','product','slug','color','length','newPriceCents','oldPriceCents','oldQty','oldState','oldManaged','newQty','active','issues','merchantConfirmed'];
  const lines=[headers.map(esc).join(',')];
  for(const row of audit)lines.push([...headers.slice(0,-1).map(k=>esc(row[k])),esc('NO')].join(','));
  fs.writeFileSync(output,lines.join('\n')+'\n',{mode:0o600});fs.chmodSync(output,0o600);
  console.log(JSON.stringify({legacyRows:old.length,newVariants:audit.length,matched:audit.filter(x=>x.oldQty!==null).length,priceMismatches:audit.filter(x=>x.issues.includes('PRICE_DIFF')).length,missingLegacy:audit.filter(x=>x.issues.includes('NO_LEGACY_VARIATION')).length,oldVariationsNotInNew:extra,zeroQty:audit.filter(x=>x.oldQty===0).length,newStockUnverified:audit.filter(x=>x.newQty===null).length,needsMerchantApproval:audit.length,reviewFile:output},null,2));
 }finally{await db.$disconnect()}
}
main().catch(e=>{console.error('READ_ONLY_RECONCILIATION_FAILED',e.code||e.message);process.exitCode=1;});
