import {NextRequest,NextResponse} from "next/server";
import {isAdmin} from "@/lib/admin-auth";
import {publicCheckoutMode,providerForCheckout} from "@/lib/customer-checkout";

export const runtime="nodejs",dynamic="force-dynamic";
const headers={"Cache-Control":"no-store, private",Pragma:"no-cache","X-Content-Type-Options":"nosniff"};
/** Short-lived browser-safe SDK v6 token. Never return API client secret. */
export async function GET(req:NextRequest){
 const mode=publicCheckoutMode();
 if(process.env.RUBY_PAYPAL_CARD_FIELDS_ENABLED!=="true"||mode==="disabled"||mode==="klarna_public"||
    mode==="admin_test"&&!await isAdmin())return NextResponse.json({error:"NOT_AVAILABLE"},{status:404,headers});
 if(req.headers.get("sec-fetch-site")==="cross-site")return NextResponse.json({error:"ORIGIN_NOT_ALLOWED"},{status:403,headers});
 try{
  const {api}=await providerForCheckout("paypal");
  const clientToken=await api.browserClientToken();
  return NextResponse.json({clientToken},{headers});
 }catch{return NextResponse.json({error:"CARD_TOKEN_TEMPORARILY_UNAVAILABLE"},{status:503,headers});}
}
