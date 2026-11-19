import "server-only";
import nodemailer from "nodemailer";
import {loadStoreMailSettings,storeMailDefaults,validMailAddress} from "@/lib/store-mail-settings";
import {retryCustomerDb} from "@/lib/customer-account-rules";
import {renderCustomerRegistrationMail} from "@/lib/customer-account-mail-template";

export async function sendCustomerLoginEmail(email:string,link:string){
 if(!validMailAddress(email)||!link.startsWith("https://rubyhair.de/konto/anmelden/#token="))throw Error("INVALID_CUSTOMER_MAIL");
 const c=await retryCustomerDb(()=>loadStoreMailSettings());
 const mail=renderCustomerRegistrationMail(link);
 if(!c.ready||!c.password)throw Error("SMTP_NOT_CONFIGURED");
 const smtp=nodemailer.createTransport({host:storeMailDefaults.host,port:storeMailDefaults.port,
  secure:false,requireTLS:true,auth:{user:storeMailDefaults.user,pass:c.password},
  tls:{servername:storeMailDefaults.host,minVersion:"TLSv1.2",rejectUnauthorized:true},
  connectionTimeout:12000,greetingTimeout:12000,socketTimeout:16000});
 try{
  const sent=await smtp.sendMail({
   from:{name:storeMailDefaults.senderName,address:storeMailDefaults.from},to:email,...mail
  });
  if(!(sent.accepted||[]).some(x=>x.toLowerCase()===email.toLowerCase()))throw Error("SMTP_NOT_ACCEPTED");
 }finally{smtp.close()}
}
