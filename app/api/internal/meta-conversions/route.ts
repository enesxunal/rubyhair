import {NextRequest,NextResponse} from "next/server";
import {timingSafeEqual} from "node:crypto";
import {runMetaConversions} from "@/lib/meta-conversions";
export const runtime="nodejs",dynamic="force-dynamic",maxDuration=60;
const headers={"Cache-Control":"no-store"};
export async function GET(req:NextRequest){
 const secret=process.env.RUBY_META_CAPI_CRON_SECRET||"",actual=Buffer.from(req.headers.get("authorization")||""),expected=Buffer.from("Bearer "+secret);
 if(secret.length<32||actual.length!==expected.length||!timingSafeEqual(actual,expected))return NextResponse.json({error:"UNAUTHORIZED"},{status:401,headers});
 try{return NextResponse.json(await runMetaConversions(),{headers})}catch{return NextResponse.json({error:"RETRY_LATER"},{status:503,headers})}
}
