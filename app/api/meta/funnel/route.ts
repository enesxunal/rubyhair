import {NextRequest,NextResponse} from "next/server";
import {buildCartQuote} from "@/lib/cart-quote";
import {capiEnabled,metaConsentActive} from "@/lib/meta-conversions";
import {allowedMetaCookie,META_DATASET,META_CAPI_COOKIE,META_CAPI_CONSENT,UUID} from "@/lib/meta-conversion-policy";
import {metaFunnelSchema,metaFunnelData,quoteMatchesFunnel,META_FUNNEL_COOKIE} from "@/lib/meta-funnel-policy";
import {publicRequestAllowed} from "@/lib/public-rate-limit";
export const runtime="nodejs",dynamic="force-dynamic";
const reply=(status:number)=>new NextResponse(null,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(req:NextRequest){
 if(!capiEnabled())return reply(503);
 if(!["https://rubyhair.de","https://www.rubyhair.de"].includes(req.headers.get("origin")||"")||req.headers.get("sec-fetch-site")==="cross-site")return reply(403);
 const consent=req.cookies.get(META_CAPI_COOKIE)?.value||"";
 const id=consent.startsWith(META_CAPI_CONSENT+":")?consent.slice(META_CAPI_CONSENT.length+1):"";
 if(req.cookies.get("ruby_meta_capi_browser")?.value!=="allow"||!UUID.test(id)||req.cookies.get(META_FUNNEL_COOKIE)?.value!==id)return reply(403);
 const fbp=allowedMetaCookie(req.cookies.get("_fbp")?.value,"fbp"),fbc=allowedMetaCookie(req.cookies.get("_fbc")?.value,"fbc");
 const ua=req.headers.get("user-agent")?.slice(0,512);
 if(!ua||(!fbp&&!fbc))return reply(204);
 try{
  if(Number(req.headers.get("content-length")||0)>4096)return reply(413);
  const raw=await req.text();if(raw.length>4096)return reply(413);
  let parsed;try{parsed=JSON.parse(raw)}catch{return reply(400)}
  const d=metaFunnelSchema.safeParse(parsed);if(!d.success)return reply(400);
  if(!await metaConsentActive(id))return reply(403);
  if(!await publicRequestAllowed(req.headers,"meta-funnel",{ip:90,global:2000,windowMs:15*60000}))return reply(429);
  const input=d.data;
  const quote=await buildCartQuote({lines:input.items.map(({id,quantity})=>({id,quantity})),couponCode:input.couponCode});
  if(!quoteMatchesFunnel(input,quote))return reply(409);
  if(!await metaConsentActive(id))return reply(403);
  const event={event_name:input.event,event_id:input.eventId,event_time:Math.floor(Date.now()/1000),action_source:"website",
    event_source_url:"https://rubyhair.de"+input.source,user_data:{client_user_agent:ua,...(fbp?{fbp}:{}),...(fbc?{fbc}:{})},custom_data:metaFunnelData(input.items)};
  const response=await fetch("https://graph.facebook.com/v25.0/"+META_DATASET+"/events",{method:"POST",headers:{Authorization:"Bearer "+process.env.RUBY_META_CAPI_TOKEN,"Content-Type":"application/json"},body:JSON.stringify({data:[event]}),signal:AbortSignal.timeout(8000)});
  const data=await response.json().catch(()=>null);
  if(!response.ok||data?.events_received!==1){console.warn("META_FUNNEL_NOT_ACCEPTED",input.event,response.status);return reply(502)}
  console.info("META_FUNNEL_ACCEPTED",input.event);
  return reply(204);
 }catch{console.warn("META_FUNNEL_DELIVERY_FAILED");return reply(503)}
}
