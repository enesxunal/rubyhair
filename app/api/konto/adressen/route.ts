import {NextResponse} from "next/server";
import {getCustomerAccount,sameOriginCustomerRequest} from "@/lib/customer-account";
import {getPrisma} from "@/lib/prisma";
import {parseCustomerAddress} from "@/lib/customer-profile-validation";
export const runtime="nodejs";
const noCache={"Cache-Control":"private, no-store"};
const safeId=(v:unknown):v is string=>typeof v==="string"&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
export async function GET(){
 const account=await getCustomerAccount();if(!account)return NextResponse.json({error:"UNAUTHORIZED"},{status:401,headers:noCache});
 const rows=await getPrisma().customerAddress.findMany({where:{accountId:account.id},orderBy:[{isDefault:"desc"},{createdAt:"desc"}],select:{id:true,label:true,firstName:true,lastName:true,street:true,postalCode:true,city:true,country:true,isDefault:true}});
 return NextResponse.json({addresses:rows,email:account.email},{headers:noCache});
}
export async function POST(req:Request){
 if(!await sameOriginCustomerRequest())return NextResponse.json({error:"ORIGIN_DENIED"},{status:403});
 const account=await getCustomerAccount();if(!account)return NextResponse.json({error:"UNAUTHORIZED"},{status:401});
 const body=await req.json().catch(()=>null);const address=parseCustomerAddress(body);
 if(!address)return NextResponse.json({error:"INVALID_ADDRESS"},{status:400});
 const db=getPrisma();
 try{
  const result=await db.$transaction(async tx=>{
   const count=await tx.customerAddress.count({where:{accountId:account.id}});
   if(count>=5)return null;
   const isDefault=count===0||body?.isDefault===true;
   if(isDefault)await tx.customerAddress.updateMany({where:{accountId:account.id,isDefault:true},data:{isDefault:false}});
   return tx.customerAddress.create({data:{accountId:account.id,...address,isDefault},select:{id:true}});
  });
  if(!result)return NextResponse.json({error:"ADDRESS_LIMIT"},{status:409});
  return NextResponse.json({ok:true,id:result.id},{status:201,headers:noCache});
 }catch{return NextResponse.json({error:"TEMPORARILY_UNAVAILABLE"},{status:503})}
}
export async function PATCH(req:Request){
 if(!await sameOriginCustomerRequest())return NextResponse.json({error:"ORIGIN_DENIED"},{status:403});
 const account=await getCustomerAccount();if(!account)return NextResponse.json({error:"UNAUTHORIZED"},{status:401});
 const body=await req.json().catch(()=>null),id=body?.id;
 if(!safeId(id))return NextResponse.json({error:"INVALID_ID"},{status:400});
 const address=parseCustomerAddress(body);
 if(!address)return NextResponse.json({error:"INVALID_ADDRESS"},{status:400});
 const db=getPrisma();
 try{
  const updated=await db.$transaction(async tx=>{
   const exists=await tx.customerAddress.findFirst({where:{id,accountId:account.id},select:{id:true}});if(!exists)return false;
   if(body?.isDefault===true)await tx.customerAddress.updateMany({where:{accountId:account.id,isDefault:true},data:{isDefault:false}});
   const r=await tx.customerAddress.updateMany({where:{id,accountId:account.id},data:{...address,...(body?.isDefault===true?{isDefault:true}:{})}});
   return r.count===1;
  });
  if(!updated)return NextResponse.json({error:"NOT_FOUND"},{status:404});
  return NextResponse.json({ok:true},{headers:noCache});
 }catch{return NextResponse.json({error:"TEMPORARILY_UNAVAILABLE"},{status:503})}
}
export async function DELETE(req:Request){
 if(!await sameOriginCustomerRequest())return NextResponse.json({error:"ORIGIN_DENIED"},{status:403});
 const account=await getCustomerAccount();if(!account)return NextResponse.json({error:"UNAUTHORIZED"},{status:401});
 const body=await req.json().catch(()=>null),id=body?.id;
 if(!safeId(id))return NextResponse.json({error:"INVALID_ID"},{status:400});
 const db=getPrisma();
 try{
  const found=await db.$transaction(async tx=>{
   const target=await tx.customerAddress.findFirst({where:{id,accountId:account.id},select:{isDefault:true}});
   if(!target)return false;
   await tx.customerAddress.deleteMany({where:{id,accountId:account.id}});
   if(target.isDefault){
    const next=await tx.customerAddress.findFirst({where:{accountId:account.id},orderBy:{createdAt:"desc"},select:{id:true}});
    if(next)await tx.customerAddress.updateMany({where:{id:next.id,accountId:account.id},data:{isDefault:true}});
   }
   return true;
  });
  if(!found)return NextResponse.json({error:"NOT_FOUND"},{status:404});
  return NextResponse.json({ok:true},{headers:noCache});
 }catch{return NextResponse.json({error:"TEMPORARILY_UNAVAILABLE"},{status:503})}
}
