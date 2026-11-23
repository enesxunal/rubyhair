import {NextRequest,NextResponse} from "next/server";
import {providerForCheckout} from "@/lib/customer-checkout";
import {qaAuthorized,qaError,qaHeaders} from "@/lib/qa-card-http";
export const runtime="nodejs",dynamic="force-dynamic";
export async function GET(req:NextRequest){
 const denied=await qaAuthorized(req);if(denied)return denied;
 try{const {api}=await providerForCheckout("paypal");const clientToken=await api.browserClientToken();
  return NextResponse.json({clientToken},{headers:qaHeaders});}
 catch(e){return qaError(e)}
}
