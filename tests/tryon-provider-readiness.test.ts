import {test} from "node:test";
import assert from "node:assert/strict";
import {GET} from "../app/api/tryon/generate/route";

test("AI readiness rejects a configured but revoked provider key",async()=>{
 const oldDedicated=process.env.RUBY_HAIR_OPENAI_API_KEY;
 const oldFallback=process.env.OPENAI_API_KEY;
 const fetchOriginal=globalThis.fetch;
 process.env.RUBY_HAIR_OPENAI_API_KEY="sk-invalid-dedicated-test";
 delete process.env.OPENAI_API_KEY;
 try{
  globalThis.fetch=async (_url,options)=>{
   assert.equal((options?.headers as {Authorization?:string})?.Authorization,"Bearer sk-invalid-dedicated-test");
   return Response.json({error:{code:"invalid_api_key"}},{status:401});
  };
  const res=await GET(),body=await res.json();
  assert.equal(res.status,200);
  assert.equal(body.available,false);
  assert.equal(body.status,"invalid_key");
 }finally{
  globalThis.fetch=fetchOriginal;
  if(oldDedicated===undefined)delete process.env.RUBY_HAIR_OPENAI_API_KEY;
  else process.env.RUBY_HAIR_OPENAI_API_KEY=oldDedicated;
  if(oldFallback===undefined)delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY=oldFallback;
 }
});

test("AI readiness selects the active general project credential if dedicated one was revoked",async()=>{
 const oldDedicated=process.env.RUBY_HAIR_OPENAI_API_KEY;
 const oldFallback=process.env.OPENAI_API_KEY;
 const fetchOriginal=globalThis.fetch;
 process.env.RUBY_HAIR_OPENAI_API_KEY="sk-invalid-dedicated-test";
 process.env.OPENAI_API_KEY="sk-good-fallback-test";
 let attempted=0;
 try{
  globalThis.fetch=async (_url,options)=>{
   attempted++;
   const header=(options?.headers as {Authorization?:string})?.Authorization;
   if(header==="Bearer sk-invalid-dedicated-test")return Response.json({error:{code:"invalid_api_key"}},{status:401});
   assert.equal(header,"Bearer sk-good-fallback-test");
   return Response.json({id:"gpt-4.1-mini"});
  };
  const res=await GET(),body=await res.json();
  assert.equal(body.available,true);
  assert.equal(body.status,"ready");
  assert.equal(attempted,2);
 }finally{
  globalThis.fetch=fetchOriginal;
  if(oldDedicated===undefined)delete process.env.RUBY_HAIR_OPENAI_API_KEY;
  else process.env.RUBY_HAIR_OPENAI_API_KEY=oldDedicated;
  if(oldFallback===undefined)delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY=oldFallback;
 }
});
