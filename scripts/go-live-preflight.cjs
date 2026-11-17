#!/usr/bin/env node
'use strict';
/** Ruby Hair preflight is READ ONLY. It never prints or copies credentials,
 * changes DNS, charges buyers, alters inventory, or modifies the database. */
const fs=require('node:fs');
const path=require('node:path');
const dns=require('node:dns').promises;
const {execFileSync}=require('node:child_process');

const argv=process.argv.slice(2);
const envFlag=argv.indexOf('--env-file');
if(envFlag>=0){
  const source=argv[envFlag+1];
  if(!source||source.startsWith('--')||!fs.existsSync(source)){
    console.error('ENV_FILE_NOT_FOUND');process.exit(2);
  }
  // Read only key-value lines from a local Vercel environment export. No dependency
  // on transitively installed dotenv packages and no values ever printed.
  for(const line of fs.readFileSync(source,'utf8').split(/\r?\n/)){
    const match=line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if(!match)continue;
    let value=match[2].trim();
    if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);
    process.env[match[1]]=value;
  }
}
const results=[];
const check=(name,pass,reason,blocking=true)=>results.push({name,status:pass?'PASS':(blocking?'BLOCK':'CHECK'),reason});
const file=(relative)=>fs.readFileSync(path.join(__dirname,'..',relative),'utf8');

async function run(){
  let head='unknown',origin='unknown';
  try{
    head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim().slice(0,8);
    origin=execFileSync('git',['rev-parse','origin/main'],{encoding:'utf8'}).trim().slice(0,8);
  }catch{}
  check('git_main_synced',head!=='unknown'&&head===origin,`HEAD ${head} / origin/main ${origin}`);
  try{
    const tracked=execFileSync('git',['diff','--name-only','HEAD'],{encoding:'utf8'}).trim();
    const launchFiles=execFileSync('git',['ls-files','--others','--exclude-standard','--','scripts','docs'],{encoding:'utf8'}).trim();
    check('release_committed',!tracked&&!launchFiles,tracked||launchFiles?'Release files must be committed':'Tracked release files committed');
  }catch{check('release_committed',false,'Unable to inspect working tree');}
  const checkoutBlocked=file('app/api/checkout/route.ts').includes('CHECKOUT_NOT_CONFIGURED');
  check('customer_checkout_enabled',!checkoutBlocked,checkoutBlocked?'Checkout intentionally returns 503':'Checkout route must still pass live E2E');

  const url=process.env.DATABASE_URL||'';
  check('database_configured',url.startsWith('postgresql://')||url.startsWith('postgres://'),'Production database connection provided');
  const vault=process.env.RUBY_PAYMENT_SETTINGS_KEY||'';
  let keyValid=false;
  try{keyValid=Buffer.from(vault,'base64url').length===32;}catch{}
  check('encrypted_vault_key',keyValid,keyValid?'AES-256-GCM key configured':'Local key absent, invalid or masked by Vercel Secret export: verify actual authenticated server readiness');

  if(url.startsWith('postgres')){
    const {PrismaClient}=require('@prisma/client');
    const db=new PrismaClient({datasources:{db:{url}}});
    try{
      const [products,variants,stockUnknown,stockPositive,stored]=await Promise.race([
        Promise.all([
          db.product.count({where:{active:true}}),
          db.variant.count({where:{active:true}}),
          db.variant.count({where:{active:true,stockQuantity:null}}),
          db.variant.count({where:{active:true,stockQuantity:{gt:0}}}),
          db.paymentIntegrationSetting.findMany({where:{environment:'live'},select:{provider:true,field:true}})
        ]),new Promise((_,reject)=>setTimeout(()=>reject(Error('database_timeout')),12000))
      ]);
      check('catalog',products>0&&variants>0,`${products} active products, ${variants} active variants`);
      check('physical_stock',stockUnknown===0&&stockPositive>0,`${stockUnknown} active variants with unverified stock; ${stockPositive} with positive stock`);
      const found=new Set(stored.map(s=>`${s.provider}:${s.field}`));
      for(const [provider,fields] of Object.entries({paypal:['clientId','clientSecret','webhookId'],klarna:['username','password','merchantId'],dhl:['clientId','clientSecret','username','password','accountNumber','billingNumber']})){
        const missing=fields.filter(x=>!found.has(`${provider}:${x}`));
        check(`${provider}_live_credentials`,missing.length===0,missing.length?`Missing ${missing.length} required fields: ${missing.join(', ')}`:'Required field entries are present (validity not yet verified)');
      }
    }catch(e){
      check('database_read',false,'Read-only database check failed: '+(e.code||e.message||'unknown').toString().slice(0,70));
    }finally{await db.$disconnect().catch(()=>{});}
  }
  try{
    const [a,mx]=await Promise.all([dns.resolve4('rubyhair.de'),dns.resolveMx('rubyhair.de')]);
    check('dns_mx_preserved',mx.length>0,`${mx.length} MX records present; do not change them at cutover`);
    results.push({name:'current_dns_a',status:'INFO',reason:`Domain points to ${a.join(', ')}; no DNS changes made`});
  }catch{results.push({name:'dns',status:'CHECK',reason:'DNS query unavailable on this machine'});}
  check('wordpress_full_backup_verified',false,'WordPress files + database backup and restore drill must be verified before cutover');
  check('provider_e2e_confirmed',false,'Payment authorization/capture, signed webhook, cancellation/refund and shipping E2E not yet signed off');
  const blocked=results.filter(r=>r.status==='BLOCK');
  console.log(JSON.stringify({project:'Ruby Hair',mode:'read-only',release:blocked.length?'NO_GO':'READY_FOR_CUTOVER',blocked:blocked.length,checks:results},null,2));
  if(blocked.length)process.exitCode=1;
}
run().catch(e=>{console.error('PREFLIGHT_FAILED',e.code||'unexpected_error');process.exitCode=2;});
