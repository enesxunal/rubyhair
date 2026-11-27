const {Pool}=require('pg');
const {PrismaPg}=require('@prisma/adapter-pg');
const {PrismaClient}=require('@prisma/client');
const fs=require('node:fs');const assert=require('node:assert/strict');const {setTimeout:sleep}=require('node:timers/promises');
const root=process.argv[2];if(!root||!root.includes('ruby-fluid-lab.'))throw Error('Synthetic lab only');
const config={host:'localhost',port:55437,user:'labuser',password:'synthetic-lab-only',database:'lab',ssl:{ca:fs.readFileSync(root+'/ca.crt'),pfx:fs.readFileSync(root+'/client.p12'),passphrase:'synthetic-p12',servername:'localhost',rejectUnauthorized:true,minVersion:'TLSv1.2'},max:2,min:0,idleTimeoutMillis:5000,connectionTimeoutMillis:10000,maxLifetimeSeconds:180};
async function main(){
 const pool=new Pool(config);pool.on('error',()=>{});const prisma=new PrismaClient({adapter:new PrismaPg(pool)});
 try{
 const info=await pool.query('SELECT current_user AS u,(SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS ssl');assert.deepEqual(info.rows[0],{u:'labuser',ssl:true});console.log('PASS mutual TLS and SCRAM');
 const tasks=Array.from({length:24},(_,i)=>prisma.$queryRaw`SELECT ${i}::int AS n`);const got=await Promise.all(tasks);assert.equal(got.length,24);assert.equal(got[23][0].n,23);assert.ok(pool.totalCount<=2);console.log('PASS 24 concurrent Prisma queries within max 2');
 const t=await prisma.$transaction(async tx=>{await tx.$executeRaw`INSERT INTO lab_samples (id,amount) VALUES (1,100)`;return tx.$queryRaw`SELECT amount FROM lab_samples WHERE id=1`},{isolationLevel:'Serializable'});assert.equal(t[0].amount,100);console.log('PASS serializable interactive transaction');
 await assert.rejects(prisma.$transaction(async tx=>{await tx.$executeRaw`UPDATE lab_samples SET amount=200 WHERE id=1`;throw Error('synthetic rollback')}));assert.equal((await prisma.$queryRaw`SELECT amount FROM lab_samples WHERE id=1`)[0].amount,100);console.log('PASS transaction rollback');
 await sleep(5600);assert.equal(pool.totalCount,0);assert.equal((await prisma.$queryRaw`SELECT amount FROM lab_samples WHERE id=1`)[0].amount,100);console.log('PASS pool idle eviction and reconnection');
 const other=new Pool({...config,ssl:{ca:config.ssl.ca,rejectUnauthorized:true,servername:'localhost'}});try{await assert.rejects(other.query('SELECT 1'));console.log('PASS missing certificate rejected')}finally{await other.end()}
 const bad=new Pool({...config,password:'invalid-fixture'});try{await assert.rejects(bad.query('SELECT 1'));console.log('PASS wrong password rejected')}finally{await bad.end()}
 const wrong=new Pool({...config,ssl:{...config.ssl,checkServerIdentity:(_host,cert)=>require('node:tls').checkServerIdentity('wrong.invalid',cert)}});try{await assert.rejects(wrong.query('SELECT 1'));console.log('PASS mismatched server name rejected')}finally{await wrong.end()}
 }finally{await prisma.$disconnect();if(!pool.ended)await pool.end()}
}
main().catch(e=>{console.error('LAB FAILED',e.name,e.code||'',String(e.message).slice(0,220));process.exitCode=1});
