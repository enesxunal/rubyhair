import "server-only";
import nodemailer from "nodemailer";
import {renderOrderMail,type OrderMailStage,type OrderMailData} from "@/lib/order-mail-templates";
import {loadStoreMailSettings,storeMailDefaults,validMailAddress} from "@/lib/store-mail-settings";

// No automatic order dispatch yet: only call after a verified payment/order event
// and once an idempotent notification/outbox log has been introduced.
export async function sendStoreOrderMail(stage:OrderMailStage,to:string,order:OrderMailData){
 if(!validMailAddress(to))throw new Error("INVALID_RECIPIENT");
 const config=await loadStoreMailSettings();
 if(!config.ready||!config.password)throw new Error("SMTP_NOT_CONFIGURED");
 const rendered=renderOrderMail(stage,order);
 const client=nodemailer.createTransport({host:storeMailDefaults.host,port:storeMailDefaults.port,secure:false,requireTLS:true,
    auth:{user:storeMailDefaults.user,pass:config.password},tls:{servername:storeMailDefaults.host,minVersion:"TLSv1.2",rejectUnauthorized:true},
    connectionTimeout:12000,greetingTimeout:12000,socketTimeout:16000});
 try{
   const result=await client.sendMail({from:{name:storeMailDefaults.senderName,address:storeMailDefaults.from},to,subject:rendered.subject,html:rendered.html,text:rendered.text});
   if(!result.accepted?.length||result.rejected?.length)throw new Error("MAIL_DELIVERY_NOT_ACCEPTED");
   return {accepted:true,messageId:result.messageId};
 }finally{client.close()}
}
export async function sendStoreSmtpTest(){
 const config=await loadStoreMailSettings();
 if(!config.ready||!config.password)throw new Error("SMTP_NOT_CONFIGURED");
 return sendStoreOrderMail("received",config.recipient,{orderNumber:"TEST-VORSCHAU",customerName:"Ruby Hair Team",totalCents:0});
}
