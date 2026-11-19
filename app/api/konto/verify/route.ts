import {NextResponse} from "next/server";
import {finishCustomerLogin,sameOriginCustomerRequest} from "@/lib/customer-account";
import {validCustomerToken} from "@/lib/customer-account-rules";
export const runtime="nodejs";
export async function POST(req:Request){
 if(!await sameOriginCustomerRequest())return NextResponse.json({error:"ORIGIN_DENIED"},{status:403});
 const body=await req.json().catch(()=>null);
 if(!validCustomerToken(body?.token))return NextResponse.json({error:"INVALID_LINK"},{status:400});
 try{
  if(!await finishCustomerLogin(body.token))return NextResponse.json({error:"LINK_EXPIRED"},{status:400});
  return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"LOGIN_TEMPORARILY_UNAVAILABLE"},{status:503})}
}
