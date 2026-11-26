import {retrySafeCheckoutRejection} from "@/lib/checkout-rejection-policy";
import {NextRequest,NextResponse,after} from "next/server";
import {isAdmin} from "@/lib/admin-auth";
import {checkoutInput,publicCheckoutMode,createCustomerCheckout,CustomerCheckoutError} from "@/lib/customer-checkout";
import {loadStoreMailSettings} from "@/lib/store-mail-settings";
import {getDhlIntegrationReadiness} from "@/lib/dhl-api";
import {runCustomerJobs} from "@/lib/customer-automation";
export const runtime="nodejs",dynamic="force-dynamic";
const headers={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
export async function POST(req:NextRequest){
 const mode=publicCheckoutMode();
 if(mode==="disabled"||mode==="admin_test"&&!await isAdmin())
  return NextResponse.json({error:"CHECKOUT_NOT_CONFIGURED",retrySafe:true},{status:503,headers});
 const origin=req.headers.get("origin"),site=req.headers.get("sec-fetch-site");
 if(!origin||![/^https:\/\/rubyhair\.de$/,/^https:\/\/www\.rubyhair\.de$/].some(r=>r.test(origin))||site==="cross-site")
  return NextResponse.json({error:"ORIGIN_NOT_ALLOWED"},{status:403,headers});
 if(Number(req.headers.get("content-length")||0)>16384)return NextResponse.json({error:"REQUEST_TOO_LARGE",retrySafe:true},{status:413,headers});
 try{
  // Prevent customers paying when the shop cannot send a receipt or start shipping.
  // admin_test may exercise the backend before external accounts are enabled.
  if(mode==="public"){
   const [mail,dhl]=await Promise.all([loadStoreMailSettings(),getDhlIntegrationReadiness("live")]);
   if(!mail.stored||!dhl.credentialsComplete||(process.env.RUBY_DHL_LIVE_LABELS_ENABLED!=="true"||process.env.RUBY_DHL_SENDER_APPROVED!=="true"||!process.env.RUBY_DHL_WEIGHT_G))
    return NextResponse.json({error:"FULFILLMENT_NOT_READY",retrySafe:true},{status:503,headers});
  }
  // Manual DHL fulfillment supports the separate Klarna-only and PayPal+Klarna
  // launch modes until automatic carrier label creation is ready.
  if(mode==="klarna_public"||mode==="payments_public"){
   const mail=await loadStoreMailSettings();
   if(!mail.stored||process.env.RUBY_MANUAL_DHL_FULFILLMENT_ENABLED!=="true")
    return NextResponse.json({error:"FULFILLMENT_NOT_READY",retrySafe:true},{status:503,headers});
  }
  const text=await req.text();
  if(text.length>16384)return NextResponse.json({error:"REQUEST_TOO_LARGE",retrySafe:true},{status:413,headers});
  let value:unknown;try{value=JSON.parse(text)}catch{return NextResponse.json({error:"INVALID_JSON",retrySafe:true},{status:400,headers})}
  const input=checkoutInput.safeParse(value);
  if(!input.success)return NextResponse.json({error:"INVALID_CHECKOUT",retrySafe:true},{status:400,headers});
  if(mode==="klarna_public"&&input.data.provider!=="klarna")
   return NextResponse.json({error:"PAYMENT_METHOD_DISABLED",retrySafe:true},{status:403,headers});
  console.info("RUBY_CHECKOUT_ATTEMPT",{provider:input.data.provider,experience:input.data.paymentExperience||"redirect"});
  const result=await createCustomerCheckout(input.data);
  console.info("RUBY_CHECKOUT_CREATED",{provider:input.data.provider,experience:input.data.paymentExperience||"redirect"});
  if("giftOnly" in result&&result.giftOnly)after(async()=>{try{await runCustomerJobs(2)}catch{}});
  return NextResponse.json(result,{status:201,headers});
 }catch(e){
  const code=e instanceof CustomerCheckoutError?e.reason:"CHECKOUT_TEMPORARILY_UNAVAILABLE";
  const status=e instanceof CustomerCheckoutError?e.http:503;
  console.warn("RUBY_CHECKOUT_REJECTED",{code,status});
  return NextResponse.json({error:code,retrySafe:retrySafeCheckoutRejection(code)},{status,headers});
 }
}
