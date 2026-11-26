import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {diagnosticMethods,diagnosticStages,browserDiagnosticCodes} from "@/lib/checkout-diagnostic-policy";
import {recordCheckoutDiagnostic} from "@/lib/checkout-diagnostics";
import {publicRequestAllowed} from "@/lib/public-rate-limit";
export const runtime="nodejs",dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
const schema=z.object({method:z.enum(diagnosticMethods),stage:z.enum(diagnosticStages),code:z.enum(browserDiagnosticCodes)}).strict();
export async function POST(req:NextRequest){
 if(!["https://rubyhair.de","https://www.rubyhair.de"].includes(req.headers.get("origin")||"")||req.headers.get("sec-fetch-site")==="cross-site")return new NextResponse(null,{status:403,headers});
 if(Number(req.headers.get("content-length")||0)>512)return new NextResponse(null,{status:413,headers});
 try{
 const raw=await req.text();if(raw.length>512)return new NextResponse(null,{status:413,headers});
 const parsed=schema.safeParse(JSON.parse(raw));if(!parsed.success)return new NextResponse(null,{status:400,headers});
 if(!await publicRequestAllowed(req.headers,"checkout-diagnostic",{ip:30,global:1000,windowMs:15*60000}))return new NextResponse(null,{status:429,headers});
 await recordCheckoutDiagnostic(parsed.data.method,parsed.data.stage,parsed.data.code,"browser");
 return new NextResponse(null,{status:204,headers});
 }catch{return new NextResponse(null,{status:503,headers});}
}
