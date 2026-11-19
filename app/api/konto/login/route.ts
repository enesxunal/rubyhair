import {NextResponse} from "next/server";
import {sameOriginCustomerRequest,requestCustomerLogin} from "@/lib/customer-account";
import {validCustomerEmail,normalizeCustomerEmail} from "@/lib/customer-account-rules";
export const runtime="nodejs";
export async function POST(req:Request){
 if(!await sameOriginCustomerRequest())return NextResponse.json({error:"ORIGIN_DENIED"},{status:403});
 const body=await req.json().catch(()=>null);
 const email=typeof body?.email==="string"?normalizeCustomerEmail(body.email):"";
 if(!validCustomerEmail(email))return NextResponse.json({error:"INVALID_EMAIL"},{status:400});
 try{await requestCustomerLogin(email)}catch(error){
  // The response stays generic. Log the safe Prisma code, never the address, token or SMTP credentials.
  const code=(error as {code?:unknown})?.code;
  console.warn("customer_login_unavailable",{errorCode:typeof code==="string"?code:"unknown"});
  return NextResponse.json({error:"LOGIN_TEMPORARILY_UNAVAILABLE"},{status:503,headers:{"Cache-Control":"no-store","Retry-After":"10"}});
 }
 return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
}
