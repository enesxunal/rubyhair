const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {Script,createContext}=require('node:vm');

test('Vercel functions execute in Frankfurt while preserving scheduled background jobs',()=>{
  const config=JSON.parse(readFileSync('vercel.json','utf8'));
  assert.deepEqual(config.regions,['fra1']);
  assert.deepEqual(config.crons.map(c=>c.path),[
    '/api/internal/customer-jobs','/api/internal/customer-account-cleanup','/api/internal/gift-card-jobs']);
  assert.equal(config.framework,'nextjs');
});

test('Prisma uses one pooled connection per Vercel function and respects explicit overrides',()=>{
  const source=readFileSync('src/lib/prisma.ts','utf8');
  const match=source.match(/function runtimeDatabaseUrl\(\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(match,'Prisma URL builder exists');
  const testUrl='postgresql://user:example@pooled.db.prisma.io:5432/store?sslmode=require';
  const execute=(url,vercel)=>{
    const context=createContext({process:{env:{DATABASE_URL:url,DATABASE_URL_POOLED:url,VERCEL:vercel?'1':''}},URL});
    return new Script(`function runtimeDatabaseUrl(){${match[1].replace("process.env.DATABASE_URL!","process.env.DATABASE_URL")}\n};runtimeDatabaseUrl()`).runInContext(context);
  };
  const url=new URL(execute(testUrl,true));
  assert.equal(url.searchParams.get('connection_limit'),'1');
  assert.equal(url.searchParams.get('pool_timeout'),'25');
  assert.equal(url.searchParams.get('sslmode'),'require');
  assert.equal(new URL(execute(testUrl+'&connection_limit=3&pool_timeout=12',true)).searchParams.get('connection_limit'),'3');
  assert.equal(execute(testUrl,false),testUrl,'local development URL stays unchanged');
  assert.doesNotMatch(source,/\$disconnect\(\)/);
});
