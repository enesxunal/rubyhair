import {NextRequest,NextResponse} from "next/server";
import {isAdmin} from "@/lib/admin-auth";
import {META_DATASET} from "@/lib/meta-conversion-policy";
import {capiEnabled} from "@/lib/meta-conversions";
export const runtime="nodejs",dynamic="force-dynamic",maxDuration=30;
const headers={"Cache-Control":"private, no-store"};
async function inspect(path:string,expected:string){
 try{
  const response=await fetch("https://graph.facebook.com/v25.0/"+path+"?fields=id,name",{headers:{Authorization:"Bearer "+process.env.RUBY_META_CAPI_TOKEN},cache:"no-store",signal:AbortSignal.timeout(8000)});
  const data=await response.json().catch(()=>null);
  return {ok:response.ok&&data?.id===expected,http:response.status,code:Number.isInteger(data?.error?.code)?data.error.code:null};
 }catch{return {ok:false,http:null,code:null}}
}
export async function GET(){
 if(!await isAdmin())return NextResponse.json({error:"UNAUTHORIZED"},{status:401,headers});
 if(!process.env.RUBY_META_CAPI_TOKEN)return NextResponse.json({configured:false,enabled:false},{headers});
 const [dataset,ads]=await Promise.all([inspect(META_DATASET,META_DATASET),inspect("act_1672571907574765","act_1672571907574765")]);
 return NextResponse.json({configured:true,enabled:capiEnabled(),dataset,ads},{headers});
}
// Explicit Meta Test Events code required. Never send a real customer or purchase.
export async function POST(req:NextRequest){
 if(!await isAdmin())return NextResponse.json({error:"UNAUTHORIZED"},{status:401,headers});
 if(req.headers.get("origin")!=="https://rubyhair.de"||req.headers.get("sec-fetch-site")==="cross-site")return NextResponse.json({error:"ORIGIN"},{status:403,headers});
 if(!process.env.RUBY_META_CAPI_TOKEN)return NextResponse.json({error:"NOT_CONFIGURED"},{status:503,headers});
 try{
 const body=await req.text();if(body.length>256)return NextResponse.json({error:"INVALID"},{status:400,headers});
 const input=JSON.parse(body);if(Object.keys(input).length!==1||typeof input.testEventCode!=="string"||!/^TEST[A-Za-z0-9_-]{3,40}$/.test(input.testEventCode))return NextResponse.json({error:"INVALID_TEST_CODE"},{status:400,headers});
 const now=Date.now();
 const response=await fetch("https://graph.facebook.com/v25.0/"+META_DATASET+"/events",{method:"POST",headers:{Authorization:"Bearer "+process.env.RUBY_META_CAPI_TOKEN,"Content-Type":"application/json"},body:JSON.stringify({test_event_code:input.testEventCode,data:[{event_name:"PageView",event_time:Math.floor(now/1000),event_id:"ruby-qa-"+crypto.randomUUID(),action_source:"website",event_source_url:"https://rubyhair.de/",user_data:{client_user_agent:"Mozilla/5.0 RubyHair-Integration-QA",fbp:"fb.1."+now+".1234567890"}}]}),signal:AbortSignal.timeout(8000)});
 const data=await response.json().catch(()=>null);
 return NextResponse.json({ok:response.ok&&data?.events_received===1,http:response.status,received:typeof data?.events_received==="number"?data.events_received:0,code:Number.isInteger(data?.error?.code)?data.error.code:null},{headers});
 }catch{return NextResponse.json({ok:false,error:"TEST_UNAVAILABLE"},{status:503,headers})}
}
