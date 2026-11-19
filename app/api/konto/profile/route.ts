import {NextResponse} from "next/server";
import {getCustomerAccount,sameOriginCustomerRequest} from "@/lib/customer-account";
import {parseCustomerNames} from "@/lib/customer-profile-validation";
import {getPrisma} from "@/lib/prisma";
export const runtime="nodejs";
export async function PUT(req:Request){
 if(!await sameOriginCustomerRequest())return NextResponse.json({error:"ORIGIN_DENIED"},{status:403});
 const account=await getCustomerAccount();if(!account)return NextResponse.json({error:"UNAUTHORIZED"},{status:401});
 const body=await req.json().catch(()=>null);
 const names=parseCustomerNames(body);
 if(!names)return NextResponse.json({error:"INVALID_PROFILE"},{status:400});
 try{
  await getPrisma().customerAccount.update({where:{id:account.id},data:names});
  return NextResponse.json({ok:true},{headers:{"Cache-Control":"private, no-store"}});
 }catch{return NextResponse.json({error:"TEMPORARILY_UNAVAILABLE"},{status:503})}
}
