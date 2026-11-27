import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {systemAreas} from "@/lib/system-diagnostic-policy";
import {recordSystemDiagnostic} from "@/lib/system-diagnostics";
import {publicRequestAllowed} from "@/lib/public-rate-limit";
export const runtime="nodejs",dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};const schema=z.object({area:z.enum(systemAreas),code:z.enum(["BROWSER_RUNTIME_FAILED","BROWSER_PROMISE_FAILED","BROWSER_RESOURCE_FAILED"])}).strict();
export async function POST(req:NextRequest){if(!["https://rubyhair.de","https://www.rubyhair.de"].includes(req.headers.get("origin")||"")||req.headers.get("sec-fetch-site")==="cross-site")return new NextResponse(null,{status:403,headers});try{if(Number(req.headers.get("content-length")||0)>512)return new NextResponse(null,{status:413,headers});const raw=await req.text();if(raw.length>512)return new NextResponse(null,{status:413,headers});const data=schema.safeParse(JSON.parse(raw));if(!data.success)return new NextResponse(null,{status:400,headers});if(!await publicRequestAllowed(req.headers,"system-diagnostic",{ip:10,global:300,windowMs:15*60000}))return new NextResponse(null,{status:429,headers});await recordSystemDiagnostic(data.data.area,data.data.code,"browser");return new NextResponse(null,{status:204,headers})}catch{console.warn("RUBY_BROWSER_DIAGNOSTIC_UNAVAILABLE");return new NextResponse(null,{status:503,headers})}}
