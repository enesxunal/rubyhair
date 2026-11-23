import {NextRequest,NextResponse} from "next/server";
import {captureCardQaOrder,CardQaError} from "@/lib/qa-card-one-euro";
import {qaAuthorized,qaError,qaHeaders,qaRequestJson} from "@/lib/qa-card-http";
export const runtime="nodejs",dynamic="force-dynamic",maxDuration=60;
export async function POST(req:NextRequest){
 const denied=await qaAuthorized(req,true);if(denied)return denied;
 try{const data=await qaRequestJson(req);
  if(typeof data.orderId!=="string"||typeof data.paypalOrderId!=="string")throw new CardQaError("INVALID_REQUEST",400);
  return NextResponse.json(await captureCardQaOrder(data.orderId,data.paypalOrderId),{headers:qaHeaders});
 }catch(e){return qaError(e)}
}
