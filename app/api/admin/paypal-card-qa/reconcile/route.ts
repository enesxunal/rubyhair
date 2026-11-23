import {NextRequest,NextResponse} from "next/server";
import {CardQaError,reconcileCardQaCapturedOrder} from "@/lib/qa-card-one-euro";
import {qaAuthorized,qaError,qaHeaders,qaRequestJson} from "@/lib/qa-card-http";
export const runtime="nodejs",dynamic="force-dynamic",maxDuration=60;
/** Admin-only recorded receipt recovery: provider GET and local accounting only. */
export async function POST(req:NextRequest){
 const denied=await qaAuthorized(req,true);if(denied)return denied;
 try{
  const payload=await qaRequestJson(req);
  if(typeof payload.orderId!=="string")throw new CardQaError("INVALID_ORDER_ID",400);
  const result=await reconcileCardQaCapturedOrder(payload.orderId);
  return NextResponse.json(result,{headers:qaHeaders});
 }catch(error){return qaError(error)}
}
