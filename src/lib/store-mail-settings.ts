import "server-only";
import {getPrisma} from "@/lib/prisma";
import {decryptPaymentValue,paymentVaultConfigured} from "@/lib/payment-secrets";
export const storeMailDefaults={host:"smtp.ionos.de",port:587,user:"info@rubyhair.de",from:"info@rubyhair.de",senderName:"Ruby Hair Extensions",notify:"nazmibulganlar@gmail.com"} as const;
export const validMailAddress=(s:string)=>/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(s)&&s.length<=254&&!/[\r\n]/.test(s);
// One store notification goes to the IONOS inbox and the owner's original
// Gmail. Preserve any additional recipient explicitly saved in the admin panel.
export function adminOrderNotificationRecipients(configuredRecipient?:string){
 const values=[storeMailDefaults.from,storeMailDefaults.notify,configuredRecipient||""];
 return [...new Set(values.filter(validMailAddress).map(v=>v.toLowerCase()))];
}
export async function loadStoreMailSettings(){
 if(!paymentVaultConfigured())return {ready:false,stored:false,recipient:storeMailDefaults.notify,password:null};
 const rows=await getPrisma().paymentIntegrationSetting.findMany({where:{provider:"smtp",environment:"live"},select:{field:true,ciphertext:true,nonce:true,authTag:true}});
 const map=new Map(rows.map(row=>[row.field,row]));
 const decrypt=(field:string)=>{const record=map.get(field);return record?decryptPaymentValue("smtp","live",field,record):null};
 const password=decrypt("password");
 const configuredRecipient=decrypt("recipient");
 return {ready:true,stored:Boolean(password),recipient:configuredRecipient&&validMailAddress(configuredRecipient)?configuredRecipient:storeMailDefaults.notify,password};
}
