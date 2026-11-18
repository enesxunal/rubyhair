import "server-only";
import {createHmac} from "node:crypto";
import nodemailer from "nodemailer";
import {z} from "zod";
import {getPrisma} from "@/lib/prisma";
import {loadStoreMailSettings,storeMailDefaults} from "@/lib/store-mail-settings";
import type {WithdrawalRequest} from "@prisma/client";

const clean=(min:number,max:number)=>z.string().trim().min(min).max(max).refine(s=>!/[<>\r\n\u0000-\u001f]/.test(s),"Invalid characters");
export const withdrawalInput=z.object({
 name:clean(2,120),
 contract:clean(3,160),
 email:z.email().max(254).transform(s=>s.trim().toLowerCase())
}).strict();
export type WithdrawalInput=z.infer<typeof withdrawalInput>;

function signingKey(){
 const key=process.env.SESSION_SECRET;
 if(!key||key.length<32)throw new Error("WITHDRAWAL_SIGNING_UNAVAILABLE");
 return key;
}
export const withdrawalDigest=(value:string)=>createHmac("sha256",signingKey()).update("rubyhair:withdrawal:"+value).digest("hex");

const germanyDate=(value:Date)=>new Intl.DateTimeFormat("de-DE",{
 dateStyle:"full",timeStyle:"long",timeZone:"Europe/Berlin"
}).format(value);

// Record the consumer declaration before sending mail. The exact mail
// acknowledgment is independent of merchant approval or actual order status.
export async function sendWithdrawalAcknowledgment(request:WithdrawalRequest){
 const cfg=await loadStoreMailSettings();
 if(!cfg.ready||!cfg.password)throw new Error("WITHDRAWAL_SMTP_UNAVAILABLE");
 const when=germanyDate(request.receivedAt);
 const body=[
  "Ruby Hair Extensions – Eingangsbestätigung des Widerrufs",
  "",
  "Wir bestätigen den Eingang Ihrer übermittelten Widerrufserklärung.",
  "Dies ist eine Eingangsbestätigung, keine Entscheidung über die rechtliche Wirksamkeit.",
  "",
  "Name: "+request.name,
  "Vertrag / Bestellung: "+request.contract,
  "E-Mail zur Bestätigung: "+request.email,
  "Eingang: "+when,
  "Eingang UTC: "+request.receivedAt.toISOString(),
  "Referenz: "+request.id,
  "",
  "Ihre Erklärung: Hiermit widerrufe ich den angegebenen Vertrag bzw. den angegebenen Teil davon.",
  "",
  "Ruby Hair, "+storeMailDefaults.from
 ].join("\n");
 const bcc=[storeMailDefaults.from,cfg.recipient].filter((x,i,a)=>x!==request.email&&a.indexOf(x)===i);
 const client=nodemailer.createTransport({
  host:storeMailDefaults.host,port:storeMailDefaults.port,secure:false,requireTLS:true,
  auth:{user:storeMailDefaults.user,pass:cfg.password},
  tls:{servername:storeMailDefaults.host,minVersion:"TLSv1.2",rejectUnauthorized:true},
  connectionTimeout:12000,greetingTimeout:12000,socketTimeout:16000
 });
 try{
  const response=await client.sendMail({
   from:{name:storeMailDefaults.senderName,address:storeMailDefaults.from},
   to:request.email,bcc,
   subject:"Eingangsbestätigung Ihres Widerrufs | Ruby Hair",
   text:body,
   messageId:"<rubyhair-widerruf-"+request.id+"@rubyhair.de>"
  });
  const accepted=(response.accepted||[]).map(x=>x.toLowerCase());
  if(!accepted.includes(request.email)||bcc.some(x=>!accepted.includes(x.toLowerCase()))||
     response.rejected?.length)throw new Error("WITHDRAWAL_SMTP_NOT_ACCEPTED");
  await getPrisma().withdrawalRequest.updateMany({
   where:{id:request.id,status:"pending"},
   data:{status:"sent",acknowledgedAt:new Date(),attempts:{increment:1}}
  });
  return true;
 }finally{client.close();}
}

export async function retryWithdrawalAcknowledgments(limit=3){
 const db=getPrisma();
 const queue=await db.withdrawalRequest.findMany({
  where:{status:"pending",nextAttemptAt:{lte:new Date()}},
  orderBy:{receivedAt:"asc"},take:Math.min(5,Math.max(1,limit))
 });
 let sent=0,failed=0;
 for(const request of queue){
  try{
   await sendWithdrawalAcknowledgment(request);
   sent++;
  }catch(e){
   failed++;
   console.error("RUBY_WITHDRAWAL_ACK_RETRY",e instanceof Error?e.name:"unknown");
   await db.withdrawalRequest.updateMany({
    where:{id:request.id,status:"pending"},
    data:{attempts:{increment:1},nextAttemptAt:new Date(Date.now()+30*60*1000)}
   });
  }
 }
 return {sent,failed};
}
