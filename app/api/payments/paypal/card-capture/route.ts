import {NextRequest,NextResponse,after} from "next/server";
import {isAdmin} from "@/lib/admin-auth";
import {publicCheckoutMode,providerForCheckout,verifyCheckoutSignature,CustomerCheckoutError} from "@/lib/customer-checkout";
import {finalizePayPalCheckout} from "@/lib/customer-order-finalize";
import {runCustomerJobs} from "@/lib/customer-automation";
import {getPrisma} from "@/lib/prisma";

export const runtime="nodejs",dynamic="force-dynamic",maxDuration=60;
const headers={"Cache-Control":"no-store, private",Pragma:"no-cache","X-Content-Type-Options":"nosniff"};
const isObj=(v:unknown):v is Record<string,unknown>=>Boolean(v)&&typeof v==="object"&&!Array.isArray(v);
/** Never trust the card's 3DS status sent by the browser. Read it from PayPal Orders v2. */
export async function POST(req:NextRequest){
 const mode=publicCheckoutMode();
 if(process.env.RUBY_PAYPAL_CARD_FIELDS_ENABLED!=="true"||mode==="disabled"||mode==="klarna_public"||
    mode==="admin_test"&&!await isAdmin())return NextResponse.json({error:"NOT_AVAILABLE"},{status:404,headers});
 const origin=req.headers.get("origin"),site=req.headers.get("sec-fetch-site");
 if(!origin||!["https://rubyhair.de","https://www.rubyhair.de"].includes(origin)||site==="cross-site")
  return NextResponse.json({error:"ORIGIN_NOT_ALLOWED"},{status:403,headers});
 if(Number(req.headers.get("content-length")||0)>2048)return NextResponse.json({error:"REQUEST_TOO_LARGE"},{status:413,headers});
 let data:unknown;
 try{const raw=await req.text();if(raw.length>2048)throw Error();data=JSON.parse(raw);}catch{
  return NextResponse.json({error:"INVALID_REQUEST"},{status:400,headers});
 }
 if(!isObj(data)||typeof data.orderId!=="string"||!/^[0-9a-f-]{36}$/i.test(data.orderId)||
    typeof data.paypalOrderId!=="string"||!/^[A-Za-z0-9_-]{8,60}$/.test(data.paypalOrderId)||
    typeof data.cardState!=="string"||!/^[0-9a-f]{64}$/.test(data.cardState))
  return NextResponse.json({error:"INVALID_REQUEST"},{status:400,headers});
 if(!verifyCheckoutSignature(data.orderId,"paypal",data.cardState))
  return NextResponse.json({error:"INVALID_CARD_SESSION"},{status:403,headers});
 try{
  const order=await getPrisma().order.findUnique({where:{id:data.orderId},select:{id:true,testOnly:true,status:true,paymentReference:true}});
  if(!order||order.testOnly||order.paymentReference!==data.paypalOrderId)
   return NextResponse.json({error:"ORDER_REFERENCE_MISMATCH"},{status:409,headers});
  const {api}=await providerForCheckout("paypal");
  const remote=await api.getOrderWithPaymentSource(data.paypalOrderId);
  if(!isObj(remote)||remote.id!==data.paypalOrderId||typeof remote.status!=="string")
   return NextResponse.json({error:"PAYPAL_STATUS_UNVERIFIED"},{status:409,headers});
  const source=isObj(remote.payment_source)?remote.payment_source:null;
  const card=source&&isObj(source.card)?source.card:null;
  if(!card)return NextResponse.json({error:"CARD_PAYMENT_SOURCE_UNVERIFIED"},{status:409,headers});
  if(remote.status==="APPROVED"){
   const auth=isObj(card.authentication_result)?card.authentication_result:null;
   // Conservative German 3DS policy: never capture NO, UNKNOWN or absent liability shift.
   if(!auth||auth.liability_shift!=="POSSIBLE")
    return NextResponse.json({error:"CARD_3DS_REQUIRES_REVIEW"},{status:409,headers});
  }else if(remote.status!=="COMPLETED"){
   return NextResponse.json({error:"CARD_PAYMENT_NOT_APPROVED"},{status:409,headers});
  }
  const done=await finalizePayPalCheckout(data.orderId,true,data.paypalOrderId);
  if(!done.paid)return NextResponse.json({error:"CARD_PAYMENT_REQUIRES_REVIEW"},{status:409,headers});
  after(async()=>{try{await runCustomerJobs(2);}catch{}});
  return NextResponse.json({paid:true,invoiceNumber:done.invoiceNumber},{headers});
 }catch(e){
  const code=e instanceof CustomerCheckoutError?e.reason:"CARD_CONFIRMATION_REQUIRES_REVIEW";
  const status=e instanceof CustomerCheckoutError?e.http:503;
  return NextResponse.json({error:code},{status,headers});
 }
}
