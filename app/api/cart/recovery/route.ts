import {NextRequest,NextResponse,after} from "next/server";
import {publicRequestAllowed} from "@/lib/public-rate-limit";
import {cartRecoveryEnabled,requestCartRecovery,sendCartRecoveryConfirmation,applyCartRecoveryAction} from "@/lib/cart-recovery";
import {recoveryRequest,recoveryAction} from "@/lib/cart-recovery-policy";
export const runtime="nodejs",dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
export async function POST(req:NextRequest){
 if(!["https://rubyhair.de","https://www.rubyhair.de"].includes(req.headers.get("origin")||"")||req.headers.get("sec-fetch-site")==="cross-site")return NextResponse.json({error:"ORIGIN"},{status:403,headers});
 if(Number(req.headers.get("content-length")||0)>4096)return NextResponse.json({error:"SIZE"},{status:413,headers});
 try{
 const text=await req.text();if(text.length>4096)return NextResponse.json({error:"SIZE"},{status:413,headers});
 const body=JSON.parse(text),action=recoveryAction.safeParse(body);
 if(action.success){
  if(!await publicRequestAllowed(req.headers,"cart-recovery-action",{ip:30,global:300,windowMs:900000}))return NextResponse.json({error:"LIMIT"},{status:429,headers});
  const result=await applyCartRecoveryAction(action.data.token,action.data.action);return NextResponse.json(result||{error:"EXPIRED"},{status:result?200:404,headers});
 }
 if(!cartRecoveryEnabled())return NextResponse.json({error:"DISABLED"},{status:503,headers});
 const parsed=recoveryRequest.safeParse(body);if(!parsed.success)return NextResponse.json({error:"INPUT"},{status:400,headers});
 if(!await publicRequestAllowed(req.headers,"cart-recovery-request",{ip:3,global:60,windowMs:3600000}))return NextResponse.json({error:"LIMIT"},{status:429,headers});
 const entry=await requestCartRecovery(parsed.data);
 if(entry)after(async()=>{try{await sendCartRecoveryConfirmation(entry.id,entry.email)}catch{console.warn("CART_RECOVERY_CONFIRMATION_FAILED")}});
 return NextResponse.json({ok:true},{headers});
 }catch{return NextResponse.json({error:"UNAVAILABLE"},{status:503,headers})}
}
