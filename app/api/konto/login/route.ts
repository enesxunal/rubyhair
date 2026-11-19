import {NextResponse} from "next/server";
import {sameOriginCustomerRequest,requestCustomerLogin} from "@/lib/customer-account";
import {validCustomerEmail,normalizeCustomerEmail} from "@/lib/customer-account-rules";
export const runtime="nodejs";
export async function POST(req:Request){
 if(!await sameOriginCustomerRequest())return NextResponse.json({error:"ORIGIN_DENIED"},{status:403});
 const body=await req.json().catch(()=>null);
 const email=typeof body?.email==="string"?normalizeCustomerEmail(body.email):"";
 if(!validCustomerEmail(email))return NextResponse.json({error:"INVALID_EMAIL"},{status:400});
 try{await requestCustomerLogin(email)}catch{return NextResponse.json({error:"LOGIN_TEMPORARILY_UNAVAILABLE"},{status:503,headers:{"Cache-Control":"no-store"}})}
 return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
}
