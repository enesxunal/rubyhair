import {NextRequest,NextResponse} from "next/server";
import {timingSafeEqual} from "node:crypto";
import {runCartRecovery} from "@/lib/cart-recovery";
export const runtime="nodejs",dynamic="force-dynamic",maxDuration=60;
const headers={"Cache-Control":"no-store"};
export async function GET(req:NextRequest){
 const secret=process.env.RUBY_CART_RECOVERY_CRON_SECRET||"",actual=Buffer.from(req.headers.get("authorization")||""),expected=Buffer.from("Bearer "+secret);
 if(secret.length<32||actual.length!==expected.length||!timingSafeEqual(actual,expected))return NextResponse.json({error:"UNAUTHORIZED"},{status:401,headers});
 try{return NextResponse.json(await runCartRecovery(),{headers})}catch{return NextResponse.json({error:"RETRY_LATER"},{status:503,headers})}
}
