import "server-only";
import {getPrisma} from "@/lib/prisma";
import {META_DATASET,META_CAPI_COOKIE,META_CAPI_CONSENT,UUID,allowedMetaCookie,consentHash,conversionPayload} from "@/lib/meta-conversion-policy";
import type {NextRequest} from "next/server";
export const capiEnabled=()=>process.env.RUBY_META_CAPI_ENABLED==="APPROVED"&&Boolean(process.env.RUBY_META_CAPI_TOKEN)&&Boolean(process.env.SESSION_SECRET&&process.env.SESSION_SECRET.length>=32);
export async function rememberMetaCheckout(req:NextRequest,orderId:string){
 if(!capiEnabled()||!UUID.test(orderId)||req.cookies.get("ruby_meta_capi_browser")?.value!=="allow")return;
 const consent=req.cookies.get(META_CAPI_COOKIE)?.value||"";
 if(!consent.startsWith(META_CAPI_CONSENT+":"))return;
 const consentId=consent.slice(META_CAPI_CONSENT.length+1);
 if(!UUID.test(consentId))return;
 const fbp=allowedMetaCookie(req.cookies.get("_fbp")?.value,"fbp"),fbc=allowedMetaCookie(req.cookies.get("_fbc")?.value,"fbc");
 const ua=req.headers.get("user-agent")?.slice(0,512);
 if(!ua||(!fbp&&!fbc))return;
 const db=getPrisma(),hash=consentHash(process.env.SESSION_SECRET!,consentId);
 const allowed=await db.metaMeasurementConsent.findFirst({where:{consentHash:hash,revokedAt:null,expiresAt:{gt:new Date()}},select:{consentHash:true}});
 if(!allowed)return;
 const order=await db.order.findFirst({where:{id:orderId,testOnly:false,status:{in:["pending_payment","payment_authorized","payment_confirmed"]},createdAt:{gte:new Date(Date.now()-600000)}},select:{id:true}});
 if(!order)return;
 await db.metaConversionContext.upsert({where:{orderId},update:{},create:{orderId,consentHash:hash,fbp,fbc,userAgent:ua}});
 // A capture may complete before the checkout response background task runs.
 await runMetaConversions(orderId);
}
export async function metaConsentActive(consentId:string){
 if(!UUID.test(consentId)||!process.env.SESSION_SECRET)return false;
 return Boolean(await getPrisma().metaMeasurementConsent.findFirst({where:{consentHash:consentHash(process.env.SESSION_SECRET,consentId),revokedAt:null,expiresAt:{gt:new Date()}},select:{consentHash:true}}));
}
export async function grantMetaConsent(consentId:string){
 if(!capiEnabled()||!UUID.test(consentId))return false;
 const hash=consentHash(process.env.SESSION_SECRET!,consentId);
 await getPrisma().metaMeasurementConsent.create({data:{consentHash:hash,expiresAt:new Date(Date.now()+180*86400000)}});
 return true;
}
export async function revokeMetaCheckout(consentId:string){
 if(!UUID.test(consentId)||!process.env.SESSION_SECRET)return;
 const db=getPrisma(),hash=consentHash(process.env.SESSION_SECRET,consentId);
 await db.$transaction([
  db.metaMeasurementConsent.updateMany({where:{consentHash:hash,revokedAt:null},data:{revokedAt:new Date()}}),
  db.metaConversionContext.updateMany({where:{consentHash:hash,status:{in:["pending","sending"]}},data:{status:"revoked",fbp:null,fbc:null,userAgent:""}})
 ]);
}
export async function runMetaConversions(orderId?:string){
 if(!capiEnabled())return {enabled:false,sent:0};
 const db=getPrisma(),now=new Date(),expiry=new Date(now.getTime()-7*86400000);
 // Expire before sending. Keep no matching cookies or UA after a terminal result.
 if(!orderId){
 await db.metaConversionContext.updateMany({where:{createdAt:{lt:expiry},status:{in:["pending","sending"]}},data:{status:"expired",fbp:null,fbc:null,userAgent:""}});
 await db.metaConversionContext.deleteMany({where:{createdAt:{lt:expiry}}});
 await db.metaMeasurementConsent.deleteMany({where:{expiresAt:{lt:now}}});
 }
 const rows=await db.metaConversionContext.findMany({where:{status:"pending",createdAt:{gte:expiry},...(orderId?{orderId}:{nextAttempt:{lte:now}})},orderBy:{nextAttempt:"asc"},take:3});
 let sent=0,held=0,failed=0;
 for(const row of rows){
  const allowed=await db.metaMeasurementConsent.findFirst({where:{consentHash:row.consentHash,revokedAt:null,expiresAt:{gt:new Date()}},select:{consentHash:true}});
  if(!allowed){await db.metaConversionContext.updateMany({where:{orderId:row.orderId,status:"pending"},data:{status:"revoked",fbp:null,fbc:null,userAgent:""}});continue;}
  const order=await db.order.findFirst({where:{id:row.orderId,testOnly:false},select:{id:true,status:true,currency:true,totalCents:true,giftAppliedCents:true,invoice:{select:{id:true}},payments:{where:{eventType:{in:["PAYMENT.CAPTURE.COMPLETED","KLARNA.CAPTURE.COMPLETED"]},provider:{in:["paypal","klarna"]}},orderBy:{receivedAt:"asc"},take:1,select:{receivedAt:true}}}});
  if(!order||["cancelled","refunded"].includes(order.status)){await db.metaConversionContext.updateMany({where:{orderId:row.orderId,status:"pending"},data:{status:"closed",fbp:null,fbc:null,userAgent:""}});continue;}
  if(!order.invoice||!order.payments.length){held++;await db.metaConversionContext.updateMany({where:{orderId:row.orderId,status:"pending"},data:{nextAttempt:new Date(now.getTime()+300000)}});continue;}
  const payload=conversionPayload({...order,secret:process.env.SESSION_SECRET!,testOnly:false,captureAt:order.payments[0].receivedAt,contextCreated:row.createdAt,fbp:row.fbp,fbc:row.fbc,userAgent:row.userAgent,now});
  if(!payload){await db.metaConversionContext.updateMany({where:{orderId:row.orderId,status:"pending"},data:{status:"closed",fbp:null,fbc:null,userAgent:""}});continue;}
  const claimed=await db.metaConversionContext.updateMany({where:{orderId:row.orderId,status:"pending",attempts:row.attempts},data:{status:"sending",attempts:{increment:1}}});
  if(!claimed.count)continue;
  try{
   // Retry with the SAME event ID only; never include credentials in URLs/logs.
   const stillAllowed=await db.metaConversionContext.findFirst({where:{orderId:row.orderId,status:"sending"},select:{orderId:true}});
   const activeConsent=await db.metaMeasurementConsent.findFirst({where:{consentHash:row.consentHash,revokedAt:null,expiresAt:{gt:new Date()}},select:{consentHash:true}});
   if(!stillAllowed||!activeConsent){await db.metaConversionContext.updateMany({where:{orderId:row.orderId,status:"sending"},data:{status:"revoked",fbp:null,fbc:null,userAgent:""}});continue;}
   const response=await fetch("https://graph.facebook.com/v25.0/"+META_DATASET+"/events",{method:"POST",headers:{Authorization:"Bearer "+process.env.RUBY_META_CAPI_TOKEN,"Content-Type":"application/json"},body:JSON.stringify({data:[payload]}),signal:AbortSignal.timeout(8000)});
   const data=await response.json().catch(()=>null);
   if(!response.ok||data?.events_received!==1)throw new Error("META_EVENT_NOT_ACCEPTED");
   await db.metaConversionContext.updateMany({where:{orderId:row.orderId,status:"sending"},data:{status:"sent",sentAt:new Date(),fbp:null,fbc:null,userAgent:""}});sent++;
  }catch{
   failed++;
   await db.metaConversionContext.updateMany({where:{orderId:row.orderId,status:"sending"},data:row.attempts>=2?{status:"failed",fbp:null,fbc:null,userAgent:""}:{status:"pending",nextAttempt:new Date(now.getTime()+300000)}});
  }
 }
 return {enabled:true,sent,held,failed};
}
