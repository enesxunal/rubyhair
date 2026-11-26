import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {touchSchema} from "@/lib/purchase-attribution-policy";
import {attributionCookie,attributionDays,grantAttribution,revokeAttribution,updateAttribution} from "@/lib/purchase-attribution";
import {publicRequestAllowed} from "@/lib/public-rate-limit";
export const runtime="nodejs",dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};
const input=z.union([z.object({action:z.literal("revoke")}).strict(),z.object({action:z.enum(["grant","touch"]),touch:touchSchema}).strict()]);
export async function POST(req:NextRequest){
 if(!["https://rubyhair.de","https://www.rubyhair.de"].includes(req.headers.get("origin")||"")||req.headers.get("sec-fetch-site")==="cross-site")return new NextResponse(null,{status:403,headers});
 try{
  const text=await req.text();if(text.length>1024)return new NextResponse(null,{status:413,headers});
  const p=input.safeParse(JSON.parse(text));if(!p.success)return new NextResponse(null,{status:400,headers});
  const token=req.cookies.get(attributionCookie)?.value;
  const result=new NextResponse(null,{status:204,headers});
  const options={path:"/",secure:true,httpOnly:true,sameSite:"lax" as const,domain:".rubyhair.de"};
  if(p.data.action==="revoke"){await revokeAttribution(token);result.cookies.set(attributionCookie,"",{...options,maxAge:0});return result;}
  if(req.cookies.get("ruby_purchase_attribution_choice")?.value!=="allow")return new NextResponse(null,{status:403,headers});
  if(!await publicRequestAllowed(req.headers,"purchase_attribution",{ip:80,global:2000,windowMs:15*60000}))return new NextResponse(null,{status:429,headers});
  if(await updateAttribution(token,p.data.touch))return result;
  if(p.data.action==="touch")return new NextResponse(null,{status:409,headers});
  const next=await grantAttribution(p.data.touch);result.cookies.set(attributionCookie,next,{...options,maxAge:attributionDays*86400});return result;
 }catch{return new NextResponse(null,{status:503,headers})}
}
