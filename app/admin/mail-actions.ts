"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {isAdmin} from "@/lib/admin-auth";
import {paymentVaultConfigured,encryptPaymentValue} from "@/lib/payment-secrets";
import {getPrisma} from "@/lib/prisma";
import {validMailAddress} from "@/lib/store-mail-settings";
import {sendStoreSmtpTest} from "@/lib/store-mail-transport";

export async function saveStoreMailAction(form:FormData){
 if(!await isAdmin())redirect("/admin/login");
 if(!paymentVaultConfigured())redirect("/admin/benachrichtigungen?status=vault-missing");
 const password=form.get("smtpPassword"),recipient=form.get("notificationRecipient");
 if(typeof password!=="string"||typeof recipient!=="string")redirect("/admin/benachrichtigungen?status=invalid");
 const pwd=password.trim();const to=recipient.trim();
 if(pwd.length>512||pwd.length>0&&pwd.length<8||!validMailAddress(to))redirect("/admin/benachrichtigungen?status=invalid");
 const remove=form.get("removePassword")==="on";
 if(remove&&pwd)redirect("/admin/benachrichtigungen?status=invalid");
 await getPrisma().$transaction(async tx=>{
   const stored=(field:string,value:string)=>{
     const encrypted=encryptPaymentValue("smtp","live",field,value);
     return {where:{provider_environment_field:{provider:"smtp",environment:"live",field}},
       create:{provider:"smtp",environment:"live",field,...encrypted},update:encrypted};
   };
   await tx.paymentIntegrationSetting.upsert(stored("recipient",to));
   if(remove){await tx.paymentIntegrationSetting.deleteMany({where:{provider:"smtp",environment:"live",field:"password"}});}
   else if(pwd){await tx.paymentIntegrationSetting.upsert(stored("password",pwd));}
 });
 revalidatePath("/admin/benachrichtigungen");
 redirect("/admin/benachrichtigungen?status=saved");
}

export async function sendStoreMailTestAction(){
 if(!await isAdmin())redirect("/admin/login");
 try{
   await sendStoreSmtpTest();
   redirect("/admin/benachrichtigungen?status=test-sent");
 }catch(e){
   // Don't leak SMTP credentials, transport diagnostics, or recipient address.
   if((e as {digest?:string}).digest?.startsWith("NEXT_REDIRECT"))throw e;
   console.error("Ruby Hair SMTP test not confirmed",e instanceof Error?e.name:"UnknownError");
   redirect("/admin/benachrichtigungen?status=test-failed");
 }
}
