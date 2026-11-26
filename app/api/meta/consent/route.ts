import {NextRequest,NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import {capiEnabled,revokeMetaCheckout} from "@/lib/meta-conversions";
import {META_CAPI_COOKIE,META_CAPI_CONSENT} from "@/lib/meta-conversion-policy";
export const runtime="nodejs",dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
export async function POST(req:NextRequest){
 if(!["https://rubyhair.de","https://www.rubyhair.de"].includes(req.headers.get("origin")||"")||req.headers.get("sec-fetch-site")==="cross-site")return new NextResponse(null,{status:403,headers});
 try{
 const body=await req.text();if(body.length>128)return new NextResponse(null,{status:413,headers});
 const input=JSON.parse(body);if(typeof input.allow!=="boolean"||Object.keys(input).length!==1)return new NextResponse(null,{status:400,headers});
 const existing=req.cookies.get(META_CAPI_COOKIE)?.value||"";
 const response=new NextResponse(null,{status:204,headers});
 if(!input.allow){
  if(existing.startsWith(META_CAPI_CONSENT+":"))await revokeMetaCheckout(existing.slice(META_CAPI_CONSENT.length+1));
  response.cookies.set(META_CAPI_COOKIE,"",{path:"/",maxAge:0,secure:true,httpOnly:true,sameSite:"lax",domain:".rubyhair.de"});
 }else{
  if(!capiEnabled())return new NextResponse(null,{status:503,headers});
  if(!existing.startsWith(META_CAPI_CONSENT+":"))response.cookies.set(META_CAPI_COOKIE,META_CAPI_CONSENT+":"+randomUUID(),{path:"/",maxAge:180*86400,secure:true,httpOnly:true,sameSite:"lax",domain:".rubyhair.de"});
 }
 return response;
 }catch{return new NextResponse(null,{status:503,headers});}
}
