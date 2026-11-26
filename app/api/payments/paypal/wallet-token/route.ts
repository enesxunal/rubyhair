import {NextRequest,NextResponse} from "next/server";
import {isAdmin} from "@/lib/admin-auth";
import {publicCheckoutMode,providerForCheckout} from "@/lib/customer-checkout";
import {publicRequestAllowed} from "@/lib/public-rate-limit";

export const runtime="nodejs",dynamic="force-dynamic";
const headers={"Cache-Control":"no-store, private",Pragma:"no-cache","X-Content-Type-Options":"nosniff"};
/** Short-lived browser SDK credential. Never expose REST client secret. */
export async function GET(req:NextRequest){
 const mode=publicCheckoutMode();
 if((process.env.RUBY_PAYPAL_APPLE_PAY_ENABLED!=="true"&&process.env.RUBY_PAYPAL_GOOGLE_PAY_ENABLED!=="true")||
    mode==="disabled"||mode==="klarna_public"||mode==="admin_test"&&!await isAdmin())
  return NextResponse.json({error:"NOT_AVAILABLE"},{status:404,headers});
 const origin=req.headers.get("origin"),site=req.headers.get("sec-fetch-site"),host=req.nextUrl.hostname;
 if(site!=="same-origin"||!['rubyhair.de','www.rubyhair.de'].includes(host)||origin&&!['https://rubyhair.de','https://www.rubyhair.de'].includes(origin))
  return NextResponse.json({error:"ORIGIN_NOT_ALLOWED"},{status:403,headers});
 try{
  if(!await publicRequestAllowed(req.headers,"paypal-wallet-token",{ip:30,global:600,windowMs:60*60_000}))
   return NextResponse.json({error:"RATE_LIMITED"},{status:429,headers:{...headers,"Retry-After":"3600"}});
 }catch{
  return NextResponse.json({error:"RATE_LIMIT_UNAVAILABLE"},{status:503,headers});
 }
 try{
  const {api}=await providerForCheckout("paypal");
  return NextResponse.json({clientToken:await api.browserClientToken()},{headers});
 }catch{return NextResponse.json({error:"WALLET_TOKEN_UNAVAILABLE"},{status:503,headers});}
}
