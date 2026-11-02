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
  variantKey=variationKey,photo=file,ip="127.0.0.1"
 }:{origin?:string;testCode?:string;consent?:string;variantKey?:string;photo?:File;ip?:string}={}){
  const body=new FormData();
  body.append("photo",photo);
  body.append("variantKey",variantKey);
  body.append("density","normal");
  body.append("consent",consent);
  body.append("testCode",testCode);
  return new NextRequest(endpoint,{method:"POST",headers:{Origin:origin,"x-real-ip":ip},body});
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
   const images=init.body.getAll("image[]") as File[];
   assert.equal(images.length,2,"Original and authentic product swatch");
   assert.equal(images[0].name,"customer-original.webp","Input extension must match WebP photo bytes");
   assert.ok(images[1].name.endsWith(variant.image.split(".").pop()!=="webp"?".jpg":".webp"),"Swatch filename matches type");
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
  const originalWarn=console.warn;
  try{
   console.warn=()=>{}; // Failure tests contain only sanitized provider error categories.
   for(const [status,codePart,expected,ip] of [
     [429,"insufficient_quota","API-Guthaben","192.0.2.3"],
     [400,"invalid_image","hochgeladenen Bilder","192.0.2.4"],
     [401,"invalid_api_key","API-Schlüssel abgelehnt","192.0.2.5"]
   ] as const){
    globalThis.fetch=async()=>new Response(JSON.stringify({
      error:{code:codePart,type:"invalid_request_error",message:"SECRET_DO_NOT_ECHO"}
     }),{status,headers:{"content-type":"application/json","x-request-id":"req-test"}});
    const res=await POST(request({ip}));
    const body=await res.json();
    assert.equal(res.status,status===429?429:502);
    assert.ok(body.error.includes(expected),codePart);
    assert.ok(body.error.includes(codePart));
    assert.ok(!body.error.includes("SECRET_DO_NOT_ECHO"),"Never echo raw provider messages");
   }
  }finally{console.warn=originalWarn;}
  console.log("TRYON_IMAGE_API_TEST PASS",{cases:13,mockedUpstreamCalls:calls,realProviderCalls:0,consentRequired:true,closedWithoutSecrets:true,rateLimited:true,providerErrorClassified:true});
 }finally{
  globalThis.fetch=oldFetch;
  if(savedKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=savedKey;
  if(savedCode===undefined)delete process.env.RUBY_TRYON_TEST_CODE;else process.env.RUBY_TRYON_TEST_CODE=savedCode;
 }
}
main().catch(error=>{console.error("TRYON_IMAGE_API_TEST FAIL",error);process.exitCode=1;});
