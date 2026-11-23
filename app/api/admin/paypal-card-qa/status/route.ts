import {NextRequest,NextResponse} from "next/server";
import {cardQaStatus} from "@/lib/qa-card-one-euro";
import {qaAuthorized,qaError,qaHeaders} from "@/lib/qa-card-http";
export const runtime="nodejs",dynamic="force-dynamic";
export async function GET(req:NextRequest){
 const denied=await qaAuthorized(req);if(denied)return denied;
 try{const orderId=req.nextUrl.searchParams.get("orderId")||"";
  const status=await cardQaStatus(orderId);
  return NextResponse.json(status||{error:"QA_ORDER_NOT_FOUND"},{status:status?200:404,headers:qaHeaders});
 }catch(e){return qaError(e)}
}
