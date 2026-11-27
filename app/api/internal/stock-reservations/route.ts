import {NextRequest,NextResponse,after} from "next/server";
import {runSystemAlerts} from "@/lib/system-alerts";
import {timingSafeEqual} from "node:crypto";
import {expireCustomerPaymentReservations} from "@/lib/customer-automation";
export const runtime="nodejs",dynamic="force-dynamic";
export const maxDuration=60;
const headers={"Cache-Control":"no-store"};
export async function GET(req:NextRequest){
 const secret=process.env.STOCK_RESERVATION_CRON_SECRET;
 const supplied=Buffer.from(req.headers.get("authorization")||"");
 const expected=Buffer.from("Bearer "+(secret||""));
 if(!secret||secret.length<32||supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return NextResponse.json({error:"UNAUTHORIZED"},{status:401,headers});
 try{const dryRun=req.nextUrl.searchParams.get("audit")==="1";if(!dryRun)after(runSystemAlerts);return NextResponse.json(await expireCustomerPaymentReservations(dryRun?20:10,{releaseOnly:true,dryRun}),{headers});}
 catch{console.warn("STOCK_RESERVATION_SWEEP_RETRY");return NextResponse.json({error:"RETRY_LATER"},{status:503,headers});}
}
