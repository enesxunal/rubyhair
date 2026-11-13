import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {NextRequest} from "next/server";
import catalog from "../src/data/products.json";
import {checkPhotoSuitability,photoSuitabilityMessage} from "../src/lib/tryon-photo-suitability";
import {POST} from "../app/api/tryon/generate/route";

type MockDecision="suitable"|"not_a_person"|"multiple_people"|"hair_not_visible"|"head_cropped"|"too_far_away"|"poor_quality"|"not_a_real_photo"|"unsure";
const sample=Buffer.from([0xff,0xd8,0xff,0xd9]);
function visionReply(decision:MockDecision,confidence=0.97):Response{
 return Response.json({output:[{type:"message",content:[{type:"output_text",text:JSON.stringify({decision,confidence})}]}]});
}
function classifier(decision:MockDecision,confidence=0.97){
 let requests=0;
 const fake:typeof fetch=async (input,init)=>{
  requests++;
  assert.equal(String(input),"https://api.openai.com/v1/responses");
  const body=JSON.parse(String(init?.body));
  assert.equal(body.store,false);
  assert.equal(body.model,"gpt-4.1-mini");
  assert.equal(body.input[0].content[1].type,"input_image");
  assert.equal(body.text.format.type,"json_schema");
  assert.ok(body.input[0].content[1].image_url.startsWith("data:image/jpeg;base64,"));
  return visionReply(decision,confidence);
 };
 return {fake,get count(){return requests;}};
}
test("one suitable head and hair photo is approved, including possible rear views",async()=>{
 const mock=classifier("suitable");
 const result=await checkPhotoSuitability(sample,"image/jpeg","sk-fake",mock.fake);
 assert.deepEqual(result,{status:"accepted"});
 assert.equal(mock.count,1);
});
test("irrelevant, group, hidden hair, crop, long-distance and synthetic images are rejected",async()=>{
 const rejected:MockDecision[]=["not_a_person","multiple_people","hair_not_visible","head_cropped","too_far_away","poor_quality","not_a_real_photo","unsure"];
 for(const reason of rejected){
  const mock=classifier(reason);
  const result=await checkPhotoSuitability(sample,"image/jpeg","sk-fake",mock.fake);
  assert.deepEqual(result,{status:"rejected",reason});
  if(result.status==="rejected")assert.ok(photoSuitabilityMessage(result.reason).length>15);
 }
});
test("uncertain suitability never gets passed through to image generation",async()=>{
 const result=await checkPhotoSuitability(sample,"image/jpeg","sk-fake",classifier("suitable",0.64).fake);
 assert.deepEqual(result,{status:"rejected",reason:"unsure"});
});
test("vision classifier failures are fail-closed",async()=>{
 const errors:Response[]=[
  Response.json({error:{message:"upstream secret"}},{status:429}),
  Response.json({output:[]}),
  Response.json({output:[{type:"message",content:[{type:"output_text",text:"not json"}]}]}),
  Response.json({output:[{type:"message",content:[{type:"output_text",text:JSON.stringify({decision:"suitable"})}]}]})
 ];
 for(const response of errors){
  const r=await checkPhotoSuitability(sample,"image/jpeg","sk-fake",async()=>response);
  assert.deepEqual(r,{status:"unavailable"});
 }
 const thrown=await checkPhotoSuitability(sample,"image/jpeg","sk-fake",async()=>{throw Error("down");});
 assert.deepEqual(thrown,{status:"unavailable"});
});
const tapeIn=Object.values(catalog.products).find(x=>x.slug==="tape-in-extensions")!;
const shade=tapeIn.variations[0];
const photoBytes=readFileSync(path.join(process.cwd(),"public",shade.image.slice(1)));
async function requestTryon():Promise<NextRequest>{
 const form=new FormData();
 form.set("photo",new File([new Uint8Array(photoBytes)],"sample.jpg",{type:"image/jpeg"}));
 form.set("consent","yes");
 form.set("density","normal");
 form.set("variantKey",tapeIn.slug+"-"+shade.id);
 return new NextRequest("https://localhost:8788/api/tryon/generate",{
  method:"POST",headers:{origin:"https://localhost:8788"},body:form
 });
}
test("server never calls image edit API for unsuitable customer photos",async()=>{
 const originalKey=process.env.RUBY_HAIR_OPENAI_API_KEY,originalFetch=globalThis.fetch;
 process.env.RUBY_HAIR_OPENAI_API_KEY="sk-unit-test-placeholder";
 let editRequests=0,validationRequests=0;
 try{
  globalThis.fetch=async url=>{
   const endpoint=String(url);
   if(endpoint.endsWith("/responses")){validationRequests++;return visionReply("not_a_person");}
   if(endpoint.endsWith("/images/edits")){editRequests++;throw Error("THIS MUST NEVER BE CALLED");}
   throw Error("unexpected endpoint");
  };
  const result=await POST(await requestTryon());
  const body=await result.json();
  assert.equal(result.status,422);
  assert.equal(body.code,"photo_unsuitable");
  assert.equal(body.reason,"not_a_person");
  assert.equal(editRequests,0);
  assert.equal(validationRequests,1);
 }finally{
  globalThis.fetch=originalFetch;
  if(originalKey===undefined)delete process.env.RUBY_HAIR_OPENAI_API_KEY;
  else process.env.RUBY_HAIR_OPENAI_API_KEY=originalKey;
 }
});
test("server never calls image edit API when vision service is unavailable",async()=>{
 const originalKey=process.env.RUBY_HAIR_OPENAI_API_KEY,originalFetch=globalThis.fetch;
 process.env.RUBY_HAIR_OPENAI_API_KEY="sk-unit-test-placeholder";
 let editRequests=0;
 try{
  globalThis.fetch=async url=>{
   if(String(url).endsWith("/responses"))return Response.json({error:"upstream"},{status:500});
   if(String(url).endsWith("/images/edits"))editRequests++;
   throw Error("unexpected endpoint");
  };
  const result=await POST(await requestTryon());
  assert.equal(result.status,503);
  assert.equal(editRequests,0);
 }finally{
  globalThis.fetch=originalFetch;
  if(originalKey===undefined)delete process.env.RUBY_HAIR_OPENAI_API_KEY;
  else process.env.RUBY_HAIR_OPENAI_API_KEY=originalKey;
 }
});
test("approved photo proceeds to image editor only after passing vision",async()=>{
 const originalKey=process.env.RUBY_HAIR_OPENAI_API_KEY,originalFetch=globalThis.fetch;
 process.env.RUBY_HAIR_OPENAI_API_KEY="sk-unit-test-placeholder";
 const calls:string[]=[];
 try{
  globalThis.fetch=async url=>{
   const endpoint=String(url);
   if(endpoint.endsWith("/responses")){calls.push("validate");return visionReply("suitable");}
   if(endpoint.endsWith("/images/edits")){
    calls.push("edit");
    return Response.json({data:[{b64_json:Buffer.from("mock-image").toString("base64")}]});
   }
   throw Error("unexpected endpoint");
  };
  const result=await POST(await requestTryon());
  assert.equal(result.status,200);
  const body=await result.json();
  assert.ok(body.image.startsWith("data:image/webp;base64,"));
  assert.deepEqual(calls,["validate","edit"]);
 }finally{
  globalThis.fetch=originalFetch;
  if(originalKey===undefined)delete process.env.RUBY_HAIR_OPENAI_API_KEY;
  else process.env.RUBY_HAIR_OPENAI_API_KEY=originalKey;
 }
});
