#!/usr/bin/env node
"use strict";
/**
 * One-time inventory reconciliation from the authenticated legacy WooCommerce
 * inventory snapshot (17 Nov 2026). NEVER imports products or prices.
 * Existing real customer orders on the new shop are deducted from snapshot
 * quantities before publishing. No order, payment, invoice or QA data is modified.
 *
 * Dry run: node --env-file=.vercel/rubyhair-db-migration.env scripts/sync-legacy-inventory-20261118.cjs
 * Apply:   node --env-file=... scripts/sync-legacy-inventory-20261118.cjs --apply
 */
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {PrismaClient,Prisma}=require("@prisma/client");
const source=path.join(os.homedir(),".config/desnod/rubyhair/inventory/legacy-variations-20261117.json");
const backupDir=path.join(os.homedir(),".config/desnod/rubyhair/inventory");
const apply=process.argv.includes("--apply");
const old=JSON.parse(fs.readFileSync(source,"utf8"));
if(!Array.isArray(old)||old.length!==53)throw Error("LEGACY_SNAPSHOT_ROW_COUNT_UNEXPECTED");
const snapshot=new Map();
for(const entry of old){
 if(!Array.isArray(entry)||entry.length!==7)throw Error("LEGACY_FORMAT_INVALID");
 const [id,parent,visibility,stock,price,managed,status]=entry;
 const numeric=Number(stock);
 if(!Number.isSafeInteger(numeric)||numeric<0||managed!=="yes"||
    visibility!=="publish"||status!==(numeric===0?"outofstock":"instock"))
   throw Error("LEGACY_STOCK_NOT_RELIABLE:"+String(id));
 if(snapshot.has(Number(id)))throw Error("LEGACY_DUPLICATE");
 snapshot.set(Number(id),numeric);
}
const db=new PrismaClient({datasources:{db:{url:process.env.DATABASE_URL}}});
const snapshotStart=new Date("2026-11-17T00:00:00Z");
async function examine(tx){
 const rows=await tx.variant.findMany({select:{
  id:true,legacyId:true,priceCents:true,stockQuantity:true,active:true,productId:true,
  updatedAt:true,product:{select:{slug:true}}
 }});
 const orders=await tx.order.findMany({
  where:{testOnly:false,createdAt:{gte:snapshotStart},status:{notIn:["cancelled","refunded","failed","payment_failed","draft","test_cancelled","test_expired"]}},
  select:{status:true,lines:{select:{quantity:true,variant:{select:{legacyId:true}}}}}
 });
 const committed=new Map();
 for(const order of orders)for(const line of order.lines){
  const id=line.variant.legacyId;
  if(id==null)throw Error("LIVE_ORDER_VARIANT_WITHOUT_LEGACY_ID");
  committed.set(id,(committed.get(id)||0)+line.quantity);
 }
 const matched=rows.filter(v=>v.legacyId!==null&&snapshot.has(v.legacyId));
 const other=rows.filter(v=>v.legacyId===null||!snapshot.has(v.legacyId));
 if(matched.length!==47||other.length!==2)throw Error("NEW_VARIANT_COUNTS_CHANGED");
 const conflicts=[];
 const plan=matched.map(v=>{
  const legacy=snapshot.get(v.legacyId);
  const reservation=committed.get(v.legacyId)||0;
  if(reservation>legacy)conflicts.push(v.legacyId);
  const next=Math.max(0,legacy-reservation);
  return {id:v.id,legacyId:v.legacyId,slug:v.product.slug,now:v.stockQuantity,oldSnapshot:legacy,customerOrdersAfterSnapshot:reservation,next,active:v.active,updatedAt:v.updatedAt};
 });
 if(conflicts.length)throw Error("LEGACY_STOCK_BELOW_NEW_ORDERS:"+conflicts.join(","));
 for(const key of committed.keys())if(!snapshot.has(key))throw Error("LIVE_CUSTOMER_ORDER_UNRECONCILED");
 return {plan,orders:orders.length,unmatched:other.length};
}
(async()=>{
 const review=await examine(db);
 const modified=review.plan.filter(v=>v.now!==v.next);
 const stats={
  legacySnapshotDate:"2026-11-17",sourceCount:old.length,newMatched:review.plan.length,
  qaSkipped:review.unmatched,realOrdersDeducted:review.orders,changed:modified.length,
  soldOut:review.plan.filter(v=>v.next===0).length,available:review.plan.filter(v=>v.next>0&&v.active).length,
  authorizationProtected:review.plan.filter(v=>v.customerOrdersAfterSnapshot>0).map(v=>({legacyId:v.legacyId,deducted:v.customerOrdersAfterSnapshot,finalAvailable:v.next})),
  zeroToDisable:review.plan.filter(v=>v.next===0&&v.now!==0).map(v=>v.legacyId)
 };
 console.log("STOCK_RECONCILIATION="+JSON.stringify({...stats,mode:apply?"apply":"dry-run"}));
 if(!apply)return;
 if(!process.env.DATABASE_URL)throw Error("DATABASE_URL_MISSING");
 // Backup before any DB modification. Contains no customer names or email.
 fs.mkdirSync(backupDir,{recursive:true,mode:0o700});
 const backupPath=path.join(backupDir,"rubyhair-pre-stock-sync-20261118.json");
 if(fs.existsSync(backupPath))throw Error("BACKUP_ALREADY_EXISTS_DO_NOT_OVERWRITE");
 fs.writeFileSync(backupPath,JSON.stringify({
  createdAt:new Date().toISOString(),from:"WooCommerce inventory 2026-11-17",
  baseline:review.plan.map(({id,legacyId,now,oldSnapshot,next,active,updatedAt})=>
   ({id,legacyId,stockQuantity:now,oldSnapshot,target:next,active,updatedAt:updatedAt.toISOString()}))
 },null,2)+"\n",{mode:0o600,flag:"wx"});
 fs.chmodSync(backupPath,0o600);
 console.log("BACKUP_WRITTEN="+backupPath);
 let writes=0;
 await db.$transaction(async tx=>{
  const current=await examine(tx);
  if(current.plan.length!==review.plan.length||
     current.plan.some((v,i)=>v.id!==review.plan[i].id||v.now!==review.plan[i].now||
      v.updatedAt.getTime()!==review.plan[i].updatedAt.getTime()||v.next!==review.plan[i].next))
   throw Error("INVENTORY_CHANGED_DURING_PREFLIGHT");
  for(const row of current.plan){
   if(row.now===row.next)continue;
   const done=await tx.variant.updateMany({
    where:{id:row.id,stockQuantity:row.now,updatedAt:row.updatedAt,active:row.active},
    data:{stockQuantity:row.next}
   });
   if(done.count!==1)throw Error("CONCURRENT_VARIANT_CHANGE");
   writes++;
  }
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:60000,maxWait:15000});
 console.log("STOCK_SYNC_APPLIED="+writes);
 const final=await examine(db);
 if(final.plan.some(v=>v.now!==v.next))throw Error("POST_SYNC_RECONCILIATION_FAILED");
 console.log("STOCK_SYNC_VERIFIED="+final.plan.length);
})().catch(e=>{console.error("STOCK_SYNC_FAILED",e.code||e.message);process.exitCode=1}).finally(()=>db.$disconnect());
