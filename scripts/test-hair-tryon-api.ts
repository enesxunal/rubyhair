import "dotenv/config";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {NextRequest} from "next/server";
import catalog from "../src/data/products.json";
import {GET,POST} from "../app/api/tryon/generate/route";

async function main(){
 const oldFetch=globalThis.fetch;
 const savedKey=process.env.OPENAI_API_KEY,savedCode=process.env.RUBY_TRYON_TEST_CODE;
 const endpoint="http://localhost:8765/api/tryon/generate";
 const code="local-test-code-2026-11-02";
 const picture=await readFile("public/assets/story-blonde.webp");
 const first=Object.values(catalog.products)[0];
 const variant=first.variations[0];
 const variationKey=first.slug+"-"+variant.id;
 const file=new File([new Uint8Array(picture)],"test-picture.webp",{type:"image/webp"});
 let calls=0;
 function request({
  origin="http://localhost:8765",testCode=code,consent="yes",
  variantKey=variationKey,photo=file
 }:{origin?:string;testCode?:string;consent?:string;variantKey?:string;photo?:File}={}){
  const body=new FormData();
  body.append("photo",photo);
  body.append("variantKey",variantKey);
  body.append("density","normal");
  body.append("consent",consent);
  body.append("testCode",testCode);
  return new NextRequest(endpoint,{method:"POST",headers:{Origin:origin},body});
 }
 try{
  delete process.env.OPENAI_API_KEY;delete process.env.RUBY_TRYON_TEST_CODE;
  assert.equal((await (await GET()).json()).available,false);
  assert.equal((await POST(request())).status,503,"Closed before keys");
  process.env.OPENAI_API_KEY="sk-local-nonworking-test-key";
  process.env.RUBY_TRYON_TEST_CODE=code;
  assert.equal((await (await GET()).json()).available,true);
  assert.equal((await POST(request({origin:"https://other-site.test"}))).status,403);
  assert.equal((await POST(request({consent:"no"}))).status,403);
  assert.equal((await POST(request({testCode:"bad-code"}))).status,401);
  assert.equal((await POST(request({variantKey:"non-existent"}))).status,400);
  const spoofed=new File([Buffer.alloc(1500,5)],"not-a-photo.webp",{type:"image/webp"});
  assert.equal((await POST(request({photo:spoofed}))).status,400);
  const validOutput=Buffer.from("RIFF\x18\x00\x00\x00WEBPFAKE-TEST-IMAGE").toString("base64");
  globalThis.fetch=async(input,init)=>{
   assert.equal(String(input),"https://api.openai.com/v1/images/edits");
   assert.equal(init?.method,"POST");
   assert.ok(init?.body instanceof FormData);
   assert.equal(init.body.get("model"),"gpt-image-2.5-sunburst");
   assert.equal(init.body.get("quality"),"medium");
   assert.equal(init.body.getAll("image[]").length,2,"Original and authentic product swatch");
   const text=String(init.body.get("prompt"));
   assert.ok(text.includes("original person's face"),"Face preservation");
   assert.ok(text.includes(variant.color_label),"Real selected tone");
   assert.ok(text.includes(variant.length_label),"Real selected length");
   calls++;
   return new Response(JSON.stringify({data:[{b64_json:validOutput}]}),{
    status:200,headers:{"content-type":"application/json"}
   });
  };
  for(let i=0;i<3;i++){
   const result=await POST(request());
   assert.equal(result.status,200,"Allowed private edit "+i);
   const body=await result.json();
   assert.ok(body.image.startsWith("data:image/webp;base64,"));
   assert.equal(result.headers.get("Cache-Control"),"no-store, private");
  }
  assert.equal(calls,3);
  assert.equal((await POST(request())).status,429,"Private API limit");
  console.log("TRYON_IMAGE_API_TEST PASS",{cases:10,mockedUpstreamCalls:calls,realProviderCalls:0,consentRequired:true,closedWithoutSecrets:true,rateLimited:true});
 }finally{
  globalThis.fetch=oldFetch;
  if(savedKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=savedKey;
  if(savedCode===undefined)delete process.env.RUBY_TRYON_TEST_CODE;else process.env.RUBY_TRYON_TEST_CODE=savedCode;
 }
}
main().catch(error=>{console.error("TRYON_IMAGE_API_TEST FAIL",error);process.exitCode=1;});
