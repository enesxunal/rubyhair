import {NextRequest,NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import {capiEnabled,grantMetaConsent,revokeMetaCheckout,metaConsentActive} from "@/lib/meta-conversions";
import {META_FUNNEL_COOKIE} from "@/lib/meta-funnel-policy";
import {META_CAPI_COOKIE,META_CAPI_CONSENT} from "@/lib/meta-conversion-policy";
export const runtime="nodejs",dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
export async function POST(req:NextRequest){
 if(!["https://rubyhair.de","https://www.rubyhair.de"].includes(req.headers.get("origin")||"")||req.headers.get("sec-fetch-site")==="cross-site")return new NextResponse(null,{status:403,headers});
 try{
 const body=await req.text();if(body.length>128)return new NextResponse(null,{status:413,headers});
 const input=JSON.parse(body);if(!input||typeof input.allow!=="boolean"||Object.keys(input).some(k=>k!=="allow"&&k!=="funnel")||(input.funnel!==undefined&&typeof input.funnel!=="boolean")||(input.funnel===true&&!input.allow))return new NextResponse(null,{status:400,headers});
 const existing=req.cookies.get(META_CAPI_COOKIE)?.value||"";
 const response=new NextResponse(null,{status:204,headers});
 const options={path:"/",secure:true,httpOnly:true,sameSite:"lax" as const,domain:".rubyhair.de"};
 if(!input.allow){
  response.cookies.set(META_FUNNEL_COOKIE,"",{...options,maxAge:0});
  if(existing.startsWith(META_CAPI_CONSENT+":"))await revokeMetaCheckout(existing.slice(META_CAPI_CONSENT.length+1));
  response.cookies.set(META_CAPI_COOKIE,"",{path:"/",maxAge:0,secure:true,httpOnly:true,sameSite:"lax",domain:".rubyhair.de"});
 }else{
  if(!capiEnabled())return new NextResponse(null,{status:503,headers});
  // Replace only an absent, expired or revoked consent. Preserve active consent on re-save.
  const id=existing.startsWith(META_CAPI_CONSENT+":")?existing.slice(META_CAPI_CONSENT.length+1):"";
  const active=id&&await metaConsentActive(id);
  let activeId=id;
  if(!active){activeId=randomUUID();if(!await grantMetaConsent(activeId))return new NextResponse(null,{status:503,headers});response.cookies.set(META_CAPI_COOKIE,META_CAPI_CONSENT+":"+activeId,{...options,maxAge:180*86400});}
  if(input.funnel===true)response.cookies.set(META_FUNNEL_COOKIE,activeId,{...options,maxAge:180*86400});
  else response.cookies.set(META_FUNNEL_COOKIE,"",{...options,maxAge:0});
 }
 return response;
 }catch{return new NextResponse(null,{status:503,headers});}
}
