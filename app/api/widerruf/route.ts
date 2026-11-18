import {NextRequest,NextResponse} from "next/server";
import {getPrisma} from "@/lib/prisma";
import {withdrawalInput,withdrawalDigest,sendWithdrawalAcknowledgment} from "@/lib/withdrawal";
export const runtime="nodejs",dynamic="force-dynamic";
export const maxDuration=45;
const headers={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};

export async function POST(req:NextRequest){
 const origin=req.headers.get("origin");
 if(!origin||!["https://rubyhair.de","https://www.rubyhair.de"].includes(origin)||
   req.headers.get("sec-fetch-site")==="cross-site")
  return NextResponse.json({error:"ORIGIN_NOT_ALLOWED"},{status:403,headers});
 if(Number(req.headers.get("content-length")||0)>4096)
  return NextResponse.json({error:"REQUEST_TOO_LARGE"},{status:413,headers});
 let payload:unknown;
 try{
  const raw=await req.text();
  if(raw.length>4096)return NextResponse.json({error:"REQUEST_TOO_LARGE"},{status:413,headers});
  payload=JSON.parse(raw);
 }catch{return NextResponse.json({error:"INVALID_REQUEST"},{status:400,headers});}
 const parsed=withdrawalInput.safeParse(payload);
 if(!parsed.success)return NextResponse.json({error:"INVALID_REQUEST"},{status:400,headers});
 try{
  const db=getPrisma();
  const emailDigest=withdrawalDigest("email:"+parsed.data.email);
  const rawIp=(req.headers.get("x-real-ip")||req.headers.get("x-forwarded-for")?.split(",")[0]||"").trim();
  const ipDigest=/^[0-9a-fA-F:.]{3,45}$/.test(rawIp)?withdrawalDigest("ip:"+rawIp):null;
  const since=new Date(Date.now()-60*60*1000);
  const [emailCount,ipCount]=await Promise.all([
   db.withdrawalRequest.count({where:{emailDigest,receivedAt:{gte:since}}}),
   ipDigest?db.withdrawalRequest.count({where:{ipDigest,receivedAt:{gte:since}}}):Promise.resolve(0)
  ]);
  if(emailCount>=8||ipCount>=25)
   return NextResponse.json({error:"RATE_LIMITED",support:"info@rubyhair.de"},{status:429,headers});
  const entry=await db.withdrawalRequest.create({
   data:{...parsed.data,emailDigest,ipDigest,receivedAt:new Date(),status:"pending"}
  });
  let acknowledgmentSent=false;
  try{acknowledgmentSent=await sendWithdrawalAcknowledgment(entry);}
  catch(e){console.error("RUBY_WITHDRAWAL_ACK_PENDING",e instanceof Error?e.name:"unknown");}
  return NextResponse.json({
   received:true,
   reference:entry.id,
   receivedAt:entry.receivedAt.toISOString(),
   acknowledgmentSent
  },{status:acknowledgmentSent?201:202,headers});
 }catch(e){
  console.error("RUBY_WITHDRAWAL_INTAKE_UNAVAILABLE",e instanceof Error?e.name:"unknown");
  return NextResponse.json({error:"INTAKE_TEMPORARILY_UNAVAILABLE",support:"info@rubyhair.de"},{status:503,headers});
 }
}
