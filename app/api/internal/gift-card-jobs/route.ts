import {NextResponse} from "next/server";
import {deliverGiftEmails} from "@/lib/gift-cards/mail";
export const runtime="nodejs",maxDuration=60,dynamic="force-dynamic";
export async function GET(req:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret||secret.length<20||req.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({error:"UNAUTHORIZED"},{status:401});
 try{return NextResponse.json(await deliverGiftEmails(5),{headers:{"Cache-Control":"no-store"}})}
 catch{return NextResponse.json({error:"TEMPORARILY_UNAVAILABLE"},{status:503})}
}
