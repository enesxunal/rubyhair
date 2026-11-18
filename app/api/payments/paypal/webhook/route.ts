import {NextRequest,NextResponse,after} from "next/server";
import {providerForCheckout} from "@/lib/customer-checkout";
import {getPrisma} from "@/lib/prisma";
import {finalizePayPalCheckout} from "@/lib/customer-order-finalize";
import {runCustomerJobs} from "@/lib/customer-automation";
export const runtime="nodejs",dynamic="force-dynamic";
export const maxDuration=60;
export async function POST(req:NextRequest){
 if(Number(req.headers.get("content-length")||0)>65536)return NextResponse.json({error:"TOO_LARGE"},{status:413});
 try{
  const text=await req.text();if(text.length>65536)return NextResponse.json({error:"TOO_LARGE"},{status:413});
  const evt:unknown=JSON.parse(text);
  const gateway=await providerForCheckout("paypal");
  if(!await gateway.api.verifyWebhook(req.headers,evt))return NextResponse.json({error:"INVALID_SIGNATURE"},{status:401});
  const obj=evt as {event_type?:unknown;resource?:{supplementary_data?:{related_ids?:{order_id?:unknown}}}};
  if(obj.event_type==="PAYMENT.CAPTURE.REFUNDED"){
   // A signed webhook is not sufficient to classify a FULL vs PARTIAL refund.
   // Never change balance/stock or issue a duplicate refund from this handler.
   console.warn("RUBY_PAYPAL_REFUND_PROVIDER_RECONCILIATION_REQUIRED");
  }
  if(obj.event_type==="PAYMENT.CAPTURE.COMPLETED"){
   const ref=obj.resource?.supplementary_data?.related_ids?.order_id;
   if(typeof ref==="string"&&/^[A-Za-z0-9_-]{8,60}$/.test(ref)){
    const order=await getPrisma().order.findUnique({where:{paymentReference:ref},select:{id:true,testOnly:true}});
    if(order&&!order.testOnly){
     // provider canonical GET verifies amount and capture before DB mutation.
     await finalizePayPalCheckout(order.id,false);
     after(async()=>{try{await runCustomerJobs(2)}catch{}});
    }
   }
  }
  return NextResponse.json({received:true});
 }catch(e){console.error("PAYPAL_WEBHOOK_RETRY_REQUIRED",e instanceof Error?e.name:"unknown");
  return NextResponse.json({error:"RETRY_LATER"},{status:503})}
}
