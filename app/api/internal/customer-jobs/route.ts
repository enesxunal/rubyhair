import {NextRequest,NextResponse} from "next/server";
import {runCustomerJobs,expireCustomerPaymentReservations} from "@/lib/customer-automation";
import {cleanupJourneys} from "@/lib/journey-server";
import {retryWithdrawalAcknowledgments} from "@/lib/withdrawal";
export const runtime="nodejs",dynamic="force-dynamic";
export const maxDuration=60;
export async function GET(req:NextRequest){
 const key=process.env.CRON_SECRET;
 if(!key||key.length<24||req.headers.get("authorization")!=="Bearer "+key)
  return NextResponse.json({error:"UNAUTHORIZED"},{status:401,headers:{"Cache-Control":"no-store"}});
 try{
  await cleanupJourneys().catch(()=>console.warn("RUBY_JOURNEY_RETENTION_RETRY"));
  const reconciled=await expireCustomerPaymentReservations(10);
  const jobs=await runCustomerJobs(10);
  const withdrawal=await retryWithdrawalAcknowledgments(3);
  return NextResponse.json({reconciled,jobs,withdrawal},{headers:{"Cache-Control":"no-store"}});
 }catch(e){
  console.error("CUSTOMER_ORDER_AUTOMATION_RETRY",e instanceof Error?e.name:"unknown");
  return NextResponse.json({error:"AUTOMATION_RETRY_LATER"},{status:503,headers:{"Cache-Control":"no-store"}});
 }
}
