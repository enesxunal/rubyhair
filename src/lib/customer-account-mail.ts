import "server-only";
import nodemailer from "nodemailer";
import {loadStoreMailSettings,storeMailDefaults,validMailAddress} from "@/lib/store-mail-settings";

export async function sendCustomerLoginEmail(email:string,link:string){
 if(!validMailAddress(email)||!link.startsWith("https://rubyhair.de/konto/anmelden/#token="))throw Error("INVALID_CUSTOMER_MAIL");
 const c=await loadStoreMailSettings();
 if(!c.ready||!c.password)throw Error("SMTP_NOT_CONFIGURED");
 const smtp=nodemailer.createTransport({host:storeMailDefaults.host,port:storeMailDefaults.port,
  secure:false,requireTLS:true,auth:{user:storeMailDefaults.user,pass:c.password},
  tls:{servername:storeMailDefaults.host,minVersion:"TLSv1.2",rejectUnauthorized:true},
  connectionTimeout:12000,greetingTimeout:12000,socketTimeout:16000});
 try{
  const sent=await smtp.sendMail({
   from:{name:storeMailDefaults.senderName,address:storeMailDefaults.from},to:email,
   subject:"Dein sicherer Ruby Hair Login",
   text:`Hallo,\n\nmit diesem Link kannst du dich bei Ruby Hair anmelden oder dein Kundenkonto erstellen:\n${link}\n\nDer Link ist nur 15 Minuten gültig und kann einmal genutzt werden. Wenn du ihn nicht angefordert hast, kannst du diese Nachricht ignorieren.\n\nRuby Hair`,
   html:`<div style="background:#faf8f5;padding:36px;font-family:Arial,sans-serif;color:#352930"><div style="max-width:520px;margin:auto;background:#fff;padding:32px"><p style="font-size:11px;letter-spacing:3px;color:#865b70">RUBY HAIR</p><h1 style="font-size:26px;font-weight:400">Dein Zugang zum Kundenkonto.</h1><p>Melde dich mit einem einmaligen, sicheren Link an. Ein Passwort brauchst du nicht.</p><p style="margin:30px 0"><a style="background:#583a47;color:white;padding:14px 22px;text-decoration:none;display:inline-block" href="${link}">Anmeldung bestätigen</a></p><p style="font-size:12px;color:#87767b">Dieser Link gilt 15 Minuten und ist nur einmal verwendbar. Falls du ihn nicht angefordert hast, ignoriere diese E-Mail.</p></div></div>`
  });
  if(!(sent.accepted||[]).some(x=>x.toLowerCase()===email.toLowerCase()))throw Error("SMTP_NOT_ACCEPTED");
 }finally{smtp.close()}
}
