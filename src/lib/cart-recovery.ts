import "server-only";
import {randomUUID} from "node:crypto";
import nodemailer from "nodemailer";
import type {z} from "zod";
import {getPrisma} from "@/lib/prisma";
import {encryptPaymentValue,decryptPaymentValue,paymentVaultConfigured} from "@/lib/payment-secrets";
import {loadStoreMailSettings,storeMailDefaults,validMailAddress} from "@/lib/store-mail-settings";
import {CART_RECOVERY_CONSENT,emailRecoveryHash,recoveryToken,recoveryId,nextReminder,maySendReminder,recoveryLines,type recoveryRequest} from "@/lib/cart-recovery-policy";
export const cartRecoveryEnabled=()=>process.env.RUBY_CART_RECOVERY_ENABLED==="APPROVED"&&Boolean(process.env.SESSION_SECRET&&process.env.SESSION_SECRET.length>=32)&&paymentVaultConfigured();
const link=(token:string,action:string)=>"https://rubyhair.de/warenkorb/merken#action="+action+"&token="+token;
async function sendRecoveryMail(email:string,id:string,kind:"confirm"|"reminder",index=0){
 if(!validMailAddress(email))throw Error("INVALID_EMAIL");
 const c=await loadStoreMailSettings();if(!c.ready||!c.password)throw Error("SMTP_NOT_CONFIGURED");
 const token=recoveryToken(process.env.SESSION_SECRET!,id),unsubscribe=link(token,"unsubscribe");
 const subject=kind==="confirm"?"Ruby Hair: Bitte bestätige deine Warenkorb-Erinnerung":"Ruby Hair: Deine Auswahl wartet auf dich";
 const main=kind==="confirm"?"Du hast Erinnerungen zu deinem Warenkorb angefordert. Bitte bestätige deine Anfrage. Ohne Bestätigung erhältst du keine Erinnerungen.":index===0?"Deine ausgewählten Extensions warten auf dich.":index===1?"Benötigst du Hilfe bei der Wahl deiner Haarfarbe oder Länge? Unser Team hilft dir gerne.":"Dies ist deine letzte gewünschte Warenkorb-Erinnerung.";
 const target=link(token,kind==="confirm"?"confirm":"restore");
 const smtp=nodemailer.createTransport({host:storeMailDefaults.host,port:storeMailDefaults.port,secure:false,requireTLS:true,auth:{user:storeMailDefaults.user,pass:c.password},tls:{servername:storeMailDefaults.host,minVersion:"TLSv1.2",rejectUnauthorized:true},connectionTimeout:8000,greetingTimeout:8000,socketTimeout:10000});
 try{
 const mail=await smtp.sendMail({from:{name:storeMailDefaults.senderName,address:storeMailDefaults.from},to:email,subject,text:main+"\n\n"+target+"\n\nDu kannst Erinnerungen jederzeit beenden: "+unsubscribe+"\n\nRuby Hair · Essen · https://rubyhair.de/rechtliches/impressum/\nPreise und Verfügbarkeit werden im Shop erneut geprüft.",messageId:"<ruby-cart-"+id+"-"+kind+"-"+index+"@rubyhair.de>"});
 if(!(mail.accepted||[]).some(x=>x.toLowerCase()===email.toLowerCase()))throw Error("SMTP_NOT_ACCEPTED");
 }finally{smtp.close()}
}
export async function requestCartRecovery(input:z.infer<typeof recoveryRequest>){
 if(!cartRecoveryEnabled())return null;
 const email=input.email.trim().toLowerCase();if(!validMailAddress(email))return null;
 const db=getPrisma(),now=new Date(),hash=emailRecoveryHash(process.env.SESSION_SECRET!,email);
 // Never send a second confirmation to the same address in the active retention window.
 await db.cartRecovery.deleteMany({where:{emailHash:hash,expiresAt:{lt:now}}});
 const variants=await db.variant.findMany({where:{legacyId:{in:input.lines.map(l=>l.id)},active:true,product:{active:true}},select:{legacyId:true,stockQuantity:true}});
 if(input.lines.some(l=>!variants.some(v=>v.legacyId===l.id&&v.stockQuantity!==null&&v.stockQuantity>=l.quantity)))return null;
 const id=randomUUID(),encrypted=encryptPaymentValue("smtp","live","cart-recovery:"+id,email);
 try{
 await db.cartRecovery.create({data:{id,emailHash:hash,...encrypted,lines:input.lines,consentVersion:CART_RECOVERY_CONSENT,expiresAt:new Date(now.getTime()+72*3600000)}});
 }catch(e){if(e&&typeof e==="object"&&"code" in e&&e.code==="P2002")return null;throw e}
 return {id,email};
}
export async function sendCartRecoveryConfirmation(id:string,email:string){if(cartRecoveryEnabled())await sendRecoveryMail(email,id,"confirm")}
export async function applyCartRecoveryAction(token:string,action:"confirm"|"unsubscribe"|"restore"){
 const secret=process.env.SESSION_SECRET||"",id=recoveryId(secret,token);if(!id)return null;
 const db=getPrisma(),now=new Date(),row=await db.cartRecovery.findUnique({where:{id}});
 if(!row||row.expiresAt<=now)return null;
 if(action==="unsubscribe"){await db.cartRecovery.updateMany({where:{id},data:{status:"unsubscribed",nextReminderAt:null,ciphertext:"",nonce:"",authTag:"",lines:[]}});return {ok:true}}
 if(!cartRecoveryEnabled()||row.consentVersion!==CART_RECOVERY_CONSENT)return null;
 if(action==="confirm"&&row.status==="unconfirmed"){
  const changed=await db.cartRecovery.updateMany({where:{id,status:"unconfirmed",expiresAt:{gt:now}},data:{status:"confirmed",confirmedAt:now,nextReminderAt:nextReminder(now,0),expiresAt:new Date(now.getTime()+72*3600000)}});
  return changed.count?{ok:true}:null;
 }
 if(action==="confirm"&&row.status==="confirmed")return {ok:true};
 if(action==="restore"&&["confirmed","finished"].includes(row.status)&&row.confirmedAt){const parsed=recoveryLines.safeParse(row.lines);return parsed.success?{ok:true,lines:parsed.data}:null}
 return null;
}
export async function runCartRecovery(){
 if(!cartRecoveryEnabled())return {enabled:false,sent:0};
 const db=getPrisma(),now=new Date();
 await db.cartRecovery.deleteMany({where:{expiresAt:{lt:now}}});
 const rows=await db.cartRecovery.findMany({where:{status:"confirmed",nextReminderAt:{lte:now}},orderBy:{nextReminderAt:"asc"},take:3});
 let sent=0,stopped=0,failed=0;
 for(const row of rows){
  const email=decryptPaymentValue("smtp","live","cart-recovery:"+row.id,row);
  // Stop for any new checkout (including an unconfirmed or active provider session),
  // not merely completed payment. Never send a payment retry instruction.
  const checkout=await db.order.findFirst({where:{testOnly:false,customerEmail:{equals:email,mode:"insensitive"},createdAt:{gte:row.requestedAt}},select:{id:true}});
  if(checkout){await db.cartRecovery.updateMany({where:{id:row.id,status:"confirmed"},data:{status:"finished",nextReminderAt:null,ciphertext:"",nonce:"",authTag:""}});stopped++;continue;}
  if(!maySendReminder(row,now,false))continue;
  const claim=await db.cartRecovery.updateMany({where:{id:row.id,status:"confirmed",sentCount:row.sentCount},data:{status:"sending",nextReminderAt:null}});
  if(!claim.count)continue;
  try{
   // Recheck consent and checkout just before SMTP. Ambiguous deliveries are not retried.
   const latest=await db.cartRecovery.findFirst({where:{id:row.id,status:"sending"},select:{id:true}});
   const fresh=await db.order.findFirst({where:{testOnly:false,customerEmail:{equals:email,mode:"insensitive"},createdAt:{gte:row.requestedAt}},select:{id:true}});
   if(!latest||fresh){await db.cartRecovery.updateMany({where:{id:row.id,status:"sending"},data:{status:"finished",ciphertext:"",nonce:"",authTag:""}});stopped++;continue;}
   await sendRecoveryMail(email,row.id,"reminder",row.sentCount);
   const count=row.sentCount+1,next=nextReminder(row.confirmedAt!,count);
   await db.cartRecovery.updateMany({where:{id:row.id,status:"sending"},data:{sentCount:count,status:next?"confirmed":"finished",nextReminderAt:next,...(!next?{ciphertext:"",nonce:"",authTag:""}:{})}});sent++;
  }catch{await db.cartRecovery.updateMany({where:{id:row.id,status:"sending"},data:{status:"delivery_review",ciphertext:"",nonce:"",authTag:""}});failed++;}
 }
 return {enabled:true,sent,stopped,failed};
}
