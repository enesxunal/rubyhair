import {NextRequest,NextResponse} from "next/server";
import {runCustomerJobs,expireCustomerPaymentReservations} from "@/lib/customer-automation";
export const runtime="nodejs",dynamic="force-dynamic";
export const maxDuration=60;
export async function GET(req:NextRequest){
 const key=process.env.CRON_SECRET;
 if(!key||key.length<24||req.headers.get("authorization")!=="Bearer "+key)
  return NextResponse.json({error:"UNAUTHORIZED"},{status:401,headers:{"Cache-Control":"no-store"}});
 try{
  const reconciled=await expireCustomerPaymentReservations(10);
  const jobs=await runCustomerJobs(10);
  return NextResponse.json({reconciled,jobs},{headers:{"Cache-Control":"no-store"}});
 }catch(e){
  console.error("CUSTOMER_ORDER_AUTOMATION_RETRY",e instanceof Error?e.name:"unknown");
  return NextResponse.json({error:"AUTOMATION_RETRY_LATER"},{status:503,headers:{"Cache-Control":"no-store"}});
 }
}
