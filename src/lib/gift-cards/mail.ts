import "server-only";
import nodemailer from "nodemailer";
import {getPrisma} from "@/lib/prisma";
import {storeMailDefaults,loadStoreMailSettings} from "@/lib/store-mail-settings";
import {decryptGiftCode,euroGift,giftViewUrl,escapeGiftXml} from "./rules";

function giftMessage(p:{recipientName:string;senderName:string|null;message:string|null;amountCents:number},code:string,url:string,forBuyer:boolean){
 const safe=(s:string)=>escapeGiftXml(s);
 const greeting=forBuyer?"Dein Geschenkgutschein ist bereit.":`${p.senderName?safe(p.senderName)+" schenkt dir":"Du hast"} etwas Besonderes${p.senderName?"":" geschenkt bekommen"}.`;
 const subject=forBuyer?"Ruby Hair | Dein Geschenkgutschein ist bereit":"Ruby Hair | Ein Geschenk für dich";
 const note=p.message?`<div style="padding:17px 20px;background:#f9f4f2;border-left:3px solid #ab7e91;margin:23px 0;font-family:Georgia,serif;font-style:italic;color:#6b4859">„${safe(p.message)}“</div>`:"";
 const html=`<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#f7f4f5;font-family:Arial,sans-serif;color:#31252c"><table width="100%" cellspacing="0" cellpadding="0" role="presentation"><tr><td align="center" style="padding:26px 14px"><table role="presentation" width="100%" style="max-width:600px;background:#fff;border:1px solid #e7dce0" cellspacing="0" cellpadding="0"><tr><td style="background:#282028;padding:30px 36px"><img src="https://rubyhair.de/media/RubyHair-WebHeader-Logo-Hell-818376d91.png" alt="Ruby Hair" width="215" style="width:215px;max-width:90%;height:auto;color:white"></td></tr><tr><td style="padding:35px 35px 28px"><p style="font-size:10px;letter-spacing:3px;color:#a47686;font-weight:bold">RUBY HAIR · DIGITAL GIFT</p><h1 style="font:normal 32px/1.25 Georgia,serif;color:#3a2834">${greeting}</h1><p style="font-size:14px;color:#65515a;line-height:1.8">Für ${safe(p.recipientName)} · ${euroGift(p.amountCents)}</p><img src="${url.replace("/geschenkgutschein/karte/","/api/gutschein/bild/").replace("?sign=","?sign=")}" width="520" alt="Dein persönlicher Ruby Hair Geschenkgutschein" style="max-width:100%;width:520px;height:auto;border:0;border-radius:6px;margin:8px 0 15px"/>${note}<p style="margin:22px 0;text-align:center"><a href="${url}" style="display:inline-block;padding:15px 25px;background:#624351;color:#fff;text-decoration:none;font-size:13px;font-weight:bold">Geschenkkarte öffnen</a></p><p style="color:#4b3640;font-size:13px;line-height:1.8">Gutscheincode: <strong style="letter-spacing:1px">${code}</strong></p><p style="font-size:12px;color:#897780;line-height:1.8">Die Karte kannst du als Bild herunterladen und mit Familie oder Freunden teilen. Der Gutscheincode kann im Ruby Hair Onlineshop verwendet werden.</p></td></tr><tr><td style="background:#f8f3f5;text-align:center;padding:22px;font-size:11px;color:#85717d">RUBY HAIR · BEAUTY IN EVERY DETAIL<br><a href="mailto:info@rubyhair.de" style="color:#795266">info@rubyhair.de</a></td></tr></table></td></tr></table></body></html>`;
 const text=`${greeting}\n\nFür: ${p.recipientName}\nBetrag: ${euroGift(p.amountCents)}\n${p.message?`Nachricht: ${p.message}\n`:""}\nGutscheincode: ${code}\nGeschenkkarte: ${url}\n\nRuby Hair Extensions`;
 return {subject,html,text};
}
export async function deliverGiftEmails(limit=5){
 const db=getPrisma();
 const now=new Date(),stale=new Date(now.getTime()-20*60*1000);
 const rows=await db.giftPurchase.findMany({where:{status:"captured",nextMailAttempt:{lte:now},OR:[
  {buyerMailStatus:"queued"},{recipientMailStatus:"queued"},
  {buyerMailStatus:"sending",updatedAt:{lt:stale}},
  {recipientMailStatus:"sending",updatedAt:{lt:stale}}
 ]},include:{card:true},orderBy:{createdAt:"asc"},take:Math.min(Math.max(1,limit),10)});
 if(!rows.length)return {sent:0};
 const mail=await loadStoreMailSettings();
 if(!mail.ready||!mail.password)return {sent:0,skipped:"SMTP_UNAVAILABLE"};
 const client=nodemailer.createTransport({host:storeMailDefaults.host,port:storeMailDefaults.port,secure:false,requireTLS:true,auth:{user:storeMailDefaults.user,pass:mail.password},tls:{servername:storeMailDefaults.host,minVersion:"TLSv1.2",rejectUnauthorized:true},connectionTimeout:12000,greetingTimeout:12000,socketTimeout:16000});
 let sent=0;
 try{
  for(const purchase of rows){
   if(!purchase.card)continue;
   const code=decryptGiftCode(purchase.card),url=giftViewUrl(purchase.id);
   for(const role of ["buyer","recipient"] as const){
    const statusField=role==="buyer"?"buyerMailStatus":"recipientMailStatus";
    const sentField=role==="buyer"?"buyerMailSentAt":"recipientMailSentAt";
    const oldStatus=purchase[statusField];
    if(oldStatus!=="queued"&&!(oldStatus==="sending"&&purchase.updatedAt<stale))continue;
    const to=role==="buyer"?purchase.buyerEmail:purchase.recipientEmail;
    if(!to)continue;
    const lock=await db.giftPurchase.updateMany({where:{id:purchase.id,[statusField]:oldStatus,...(oldStatus==="sending"?{updatedAt:{lt:stale}}:{})},data:{[statusField]:"sending",mailAttempts:{increment:1}}});
    if(lock.count!==1)continue;
    try{
     const content=giftMessage(purchase,code,url,role==="buyer");
     const result=await client.sendMail({from:{name:storeMailDefaults.senderName,address:storeMailDefaults.from},to,...content,
      messageId:`<rubyhair-gift-${purchase.id}-${role}@rubyhair.de>`});
     if(!(result.accepted||[]).map(x=>x.toLowerCase()).includes(to.toLowerCase()))throw new Error("SMTP_NOT_ACCEPTED");
     await db.giftPurchase.updateMany({where:{id:purchase.id,[statusField]:"sending"},data:{[statusField]:"sent",[sentField]:new Date()}});
     sent++;
    }catch(e){
     const attempts=purchase.mailAttempts+1;
     await db.giftPurchase.updateMany({where:{id:purchase.id,[statusField]:"sending"},data:{[statusField]:attempts>=8?"review":"queued",nextMailAttempt:new Date(Date.now()+Math.min(12*3600000,attempts*15*60000))}});
     console.warn("GIFT_EMAIL_NEEDS_RETRY",{role,kind:e instanceof Error?e.name:"unknown"});
    }
   }
  }
 }finally{client.close()}
 return {sent};
}
