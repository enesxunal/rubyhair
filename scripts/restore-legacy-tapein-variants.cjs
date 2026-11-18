#!/usr/bin/env node
'use strict';
/** Restore only the nine verified WooCommerce Tape-in zero-stock records.
 * Offline validation is the default. Database writes require --apply plus
 * an explicit confirmation and DATABASE_URL on the day of the batch release.
 * Never sets stock above zero, enables selling, or changes existing products. */
const fs=require('node:fs');
const path=require('node:path');
const manifest=require('./legacy-tapein-restoration-20261118.json');
const catalog=require('../src/data/products.json');
const oldPriceUpdate=require('./price-change-20261117.json');
const expected=['884','885','891','896','897','898','1319','1321','1701'];
if(manifest.revision!=='rubyhair-woo-20261117-restored-tapein-unavailable'||manifest.slug!=='tape-in-extensions'||manifest.sourceProductId!==882||manifest.priceAdjustmentCents!==500||manifest.variants.length!==9)throw Error('ARCHIVED_VARIANT_MANIFEST_INVALID');
if(oldPriceUpdate.deltaCents!==500)throw Error('CURRENT_PRICE_ADJUSTMENT_UNVERIFIED');
const product=catalog.products[manifest.slug];
if(!product||product.id!==882||product.variations.length!==36)throw Error('STAGED_CATALOG_INCOMPLETE');
const items=[];
for(const m of manifest.variants){
 const v=product.variations.find(x=>x.id===m.legacyId);
 if(!v||v.color!==m.color||v.length!==m.length||Math.round(v.price*100)!==m.legacyPriceCents+500||v.available!==false||v.purchasable!==false||v.stock_quantity!==0||v.image!==m.image)throw Error('STAGED_ARCHIVED_VARIANT_MISMATCH_'+m.legacyId);
 if(!fs.existsSync(path.join(__dirname,'../public',m.image)))throw Error('ARCHIVED_IMAGE_MISSING_'+m.legacyId);
 if(!m.sku||!Number.isSafeInteger(m.legacyId))throw Error('ARCHIVED_REFERENCE_MISSING');
 items.push({legacyId:m.legacyId,colorCode:v.color,colorLabel:v.color_label,lengthCode:v.length,lengthLabel:v.length_label,priceCents:Math.round(v.price*100),image:v.image,active:false,stockQuantity:0});
}
if(items.map(x=>String(x.legacyId)).sort().join(',')!==expected.sort().join(',')||new Set(items.map(x=>x.colorCode+'|'+x.lengthCode)).size!==9)throw Error('ARCHIVED_VARIANTS_UNSAFE');
console.log('OFFLINE_ARCHIVE_VERIFIED count=9, stock=0, active=false, photos=9/9, pricing=historical+500c');
const apply=process.argv.includes('--apply');
if(apply&&process.env.RUBY_ARCHIVED_TAPEIN_CONFIRM!=='RESTORE_VERIFIED_WOOCOMMERCE_ZERO_STOCK')throw Error('EXPLICIT_PRODUCTION_RESTORE_CONFIRMATION_REQUIRED');
if(!process.env.DATABASE_URL){if(apply)throw Error('DATABASE_URL_REQUIRED_FOR_IMPORT');console.log('NO_DATABASE_URL: no database accessed, no changes');process.exit(0)}
const {PrismaClient,Prisma}=require('@prisma/client');
const db=new PrismaClient({datasources:{db:{url:process.env.DATABASE_URL_POOLED||process.env.DATABASE_URL}}});
async function run(){
 const target=await db.product.findUnique({where:{slug:manifest.slug},include:{variants:true}});
 if(!target||target.legacyId!==882||!target.active)throw Error('TARGET_PRODUCT_MISMATCH');
 const known=new Map(target.variants.map(v=>[v.legacyId,v]));
 const oldIds=new Set(oldPriceUpdate.variants.filter(v=>v.slug===manifest.slug).map(v=>v.legacyId));
 if(oldIds.size!==27||oldIds.size!==target.variants.filter(v=>oldIds.has(v.legacyId)).length)throw Error('ORIGINAL_VARIANTS_MISSING');
 const restored=items.filter(x=>known.has(x.legacyId));
 for(const item of items){
  const v=known.get(item.legacyId);
  if(!v)continue;
  if(v.productId!==target.id||v.colorCode!==item.colorCode||v.lengthCode!==item.lengthCode||v.priceCents!==item.priceCents||v.active!==false||v.stockQuantity!==0||v.image!==item.image)throw Error('ARCHIVED_VARIANT_CONFLICT_'+item.legacyId);
 }
 if(restored.length===9){console.log('ALREADY_RESTORED nine out-of-stock records; no changes');return;}
 if(restored.length!==0||target.variants.length!==27)throw Error('PARTIAL_OR_UNEXPECTED_VARIANTS_REFUSE_TO_WRITE');
 const combinations=new Set(target.variants.map(v=>v.colorCode+'|'+v.lengthCode));
 if(items.some(v=>combinations.has(v.colorCode+'|'+v.lengthCode)))throw Error('COLOR_LENGTH_ALREADY_EXISTS');
 console.log('PRECHECK_OK current=27, expected=36, archived=9 stock=0 and inactive');
 if(!apply){console.log('DRY_RUN_ONLY no DB writes; use --apply with separate explicit confirmation at batch release');return;}
 await db.$transaction(async tx=>{
  const current=await tx.variant.findMany({where:{productId:target.id},select:{legacyId:true,colorCode:true,lengthCode:true}});
  if(current.length!==27||current.some(v=>!oldIds.has(v.legacyId)))throw Error('CONCURRENT_VARIANT_CHANGE_ABORT');
  const inserted=await tx.variant.createMany({data:items.map(x=>({...x,productId:target.id}))});
  if(inserted.count!==9)throw Error('RESTORE_COUNT_MISMATCH');
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:10000,timeout:30000});
 const rows=await db.variant.findMany({where:{productId:target.id},select:{legacyId:true,active:true,stockQuantity:true}});
 if(rows.length!==36||items.some(x=>!rows.some(y=>y.legacyId===x.legacyId&&y.active===false&&y.stockQuantity===0)))throw Error('POST_IMPORT_CHECK_FAILED');
 console.log('IMPORT_PASS: 9 restored, all non-purchasable, no existing variant modified');
}
run().catch(err=>{console.error('RESTORE_CHECK_FAILED',err.code||err.message);process.exitCode=1}).finally(()=>db.$disconnect());
