import {NextResponse} from "next/server";
import {customerPasswordLogin,sameOriginCustomerRequest} from "@/lib/customer-account";
export const runtime="nodejs";
export async function POST(req:Request){
 if(!await sameOriginCustomerRequest())return NextResponse.json({error:"ORIGIN_DENIED"},{status:403});
 const body=await req.json().catch(()=>null);
 if(typeof body?.email!=="string"||typeof body?.password!=="string")return NextResponse.json({error:"INVALID_INPUT"},{status:400});
 try{
  if(!await customerPasswordLogin(body.email,body.password))return NextResponse.json({error:"INVALID_CREDENTIALS"},{status:401,headers:{"Cache-Control":"no-store"}});
  return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"LOGIN_TEMPORARILY_UNAVAILABLE"},{status:503,headers:{"Cache-Control":"no-store"}})}
}
