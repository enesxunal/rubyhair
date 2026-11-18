import "server-only";
import nodemailer from "nodemailer";
import {renderOrderMail,type OrderMailStage,type OrderMailData} from "@/lib/order-mail-templates";
import {loadStoreMailSettings,storeMailDefaults,validMailAddress,adminOrderNotificationRecipients} from "@/lib/store-mail-settings";

// Used only from a durable, idempotent order-notification worker after a verified payment.
export async function sendStoreOrderMail(stage:OrderMailStage,to:string|string[],order:OrderMailData,invoice?:{filename:string;content:Buffer}){
 const recipients=[...new Set((Array.isArray(to)?to:[to]).map(x=>x.trim().toLowerCase()))];
 if(!recipients.length||recipients.length>5||recipients.some(x=>!validMailAddress(x)))throw new Error("INVALID_RECIPIENT");
 const config=await loadStoreMailSettings();
 if(!config.ready||!config.password)throw new Error("SMTP_NOT_CONFIGURED");
 const rendered=renderOrderMail(stage,order);
 const client=nodemailer.createTransport({host:storeMailDefaults.host,port:storeMailDefaults.port,secure:false,requireTLS:true,
    auth:{user:storeMailDefaults.user,pass:config.password},tls:{servername:storeMailDefaults.host,minVersion:"TLSv1.2",rejectUnauthorized:true},
    connectionTimeout:12000,greetingTimeout:12000,socketTimeout:16000});
 try{
   const result=await client.sendMail({from:{name:storeMailDefaults.senderName,address:storeMailDefaults.from},to:recipients,subject:rendered.subject,html:rendered.html,text:rendered.text,
     messageId:`<rubyhair-${order.orderNumber.replace(/[^A-Za-z0-9-]/g,"")}-${stage}@rubyhair.de>`,
     attachments:invoice?[{filename:invoice.filename,content:invoice.content,contentType:"application/pdf"}]:[]});
   const accepted=new Set((result.accepted||[]).map(x=>x.toLowerCase()));
   if(recipients.some(x=>!accepted.has(x))||result.rejected?.length)throw new Error("MAIL_DELIVERY_NOT_ACCEPTED");
   return {accepted:true,messageId:result.messageId};
 }finally{client.close()}
}
// Explicit admin test; never creates an order, invoice or payment.
export async function sendStoreAdminSmtpTest(){
 const config=await loadStoreMailSettings();
 if(!config.ready||!config.password)throw new Error("SMTP_NOT_CONFIGURED");
 return sendStoreOrderMail("received_admin",adminOrderNotificationRecipients(config.recipient),
   {orderNumber:"MAILTEST",customerName:"Testkunde",totalCents:0});
}
export async function sendStoreSmtpTest(testRecipient?:string){
 const config=await loadStoreMailSettings();
 if(!config.ready||!config.password)throw new Error("SMTP_NOT_CONFIGURED");
 const recipient=testRecipient||config.recipient;
 if(!validMailAddress(recipient))throw new Error("INVALID_TEST_RECIPIENT");
 return sendStoreOrderMail("received",recipient,{orderNumber:"TEST-VORSCHAU",customerName:"Ruby Hair Team",totalCents:0});
}
