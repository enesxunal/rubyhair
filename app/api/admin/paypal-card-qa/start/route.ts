import {NextRequest,NextResponse} from "next/server";
import {beginCardQaOrder,CardQaError} from "@/lib/qa-card-one-euro";
import {qaAuthorized,qaError,qaHeaders,qaRequestJson} from "@/lib/qa-card-http";
export const runtime="nodejs",dynamic="force-dynamic",maxDuration=45;
export async function POST(req:NextRequest){
 const denied=await qaAuthorized(req,true);if(denied)return denied;
 try{const data=await qaRequestJson(req);
  for(const key of ["name","email","postalCode"]){if(typeof data[key]!=="string")throw new CardQaError("INVALID_BUYER_INFO",400)}
  const order=await beginCardQaOrder({name:data.name as string,email:data.email as string,postalCode:data.postalCode as string,
   confirmSeller:data.confirmSeller===true,confirmTax:data.confirmTax===true,confirmCharge:data.confirmCharge===true});
  return NextResponse.json(order,{headers:qaHeaders});
 }catch(e){return qaError(e)}
}
