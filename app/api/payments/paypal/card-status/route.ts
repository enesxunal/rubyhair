import {NextRequest,NextResponse,after} from "next/server";
import {verifyCheckoutSignature} from "@/lib/customer-checkout";
import {finalizePayPalCheckout} from "@/lib/customer-order-finalize";
import {runCustomerJobs} from "@/lib/customer-automation";
import {getPrisma} from "@/lib/prisma";

export const runtime="nodejs",dynamic="force-dynamic",maxDuration=60;
const headers={"Cache-Control":"no-store, private","X-Content-Type-Options":"nosniff"};
/** Read-only PayPal lookup and atomic Ruby Hair accounting reconciliation.
 * NO capture, authorization, refund or order creation occurs here. */
export async function POST(req:NextRequest){
 if(process.env.RUBY_PAYPAL_CARD_FIELDS_ENABLED!=="true")return NextResponse.json({error:"NOT_AVAILABLE"},{status:404,headers});
 const origin=req.headers.get("origin");
 if(!origin||!["https://rubyhair.de","https://www.rubyhair.de"].includes(origin)||req.headers.get("sec-fetch-site")==="cross-site")
  return NextResponse.json({error:"ORIGIN_NOT_ALLOWED"},{status:403,headers});
 if(Number(req.headers.get("content-length")||0)>2048)return NextResponse.json({error:"REQUEST_TOO_LARGE"},{status:413,headers});
 let body:unknown;
 try{const text=await req.text();if(text.length>2048)throw Error();body=JSON.parse(text)}catch{return NextResponse.json({error:"INVALID_REQUEST"},{status:400,headers})}
 if(!body||typeof body!=="object"||Array.isArray(body))return NextResponse.json({error:"INVALID_REQUEST"},{status:400,headers});
 const {orderId,paypalOrderId,cardState}=body as Record<string,unknown>;
 if(typeof orderId!=="string"||!/^[0-9a-f-]{36}$/i.test(orderId)||typeof paypalOrderId!=="string"||!/^[A-Za-z0-9_-]{8,60}$/.test(paypalOrderId)||typeof cardState!=="string"||!/^[0-9a-f]{64}$/.test(cardState)||!verifyCheckoutSignature(orderId,"paypal",cardState))
  return NextResponse.json({error:"INVALID_PAYMENT_SESSION"},{status:403,headers});
 try{
  const order=await getPrisma().order.findUnique({where:{id:orderId},select:{testOnly:true,paymentReference:true}});
  if(!order||order.testOnly||order.paymentReference!==paypalOrderId)return NextResponse.json({error:"ORDER_MISMATCH"},{status:409,headers});
  const verified=await finalizePayPalCheckout(orderId,false,paypalOrderId);
  if(!verified.paid)return NextResponse.json({paid:false,review:true},{headers});
  after(async()=>{try{await runCustomerJobs(2)}catch{}});
  return NextResponse.json({paid:true},{headers});
 }catch{
  // A pending/unknown capture must never be represented as failed or retried.
  return NextResponse.json({paid:false,review:true},{headers});
 }
}
