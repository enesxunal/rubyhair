import "server-only";
import {createCipheriv,createDecipheriv,randomBytes} from "node:crypto";
import {getPrisma} from "@/lib/prisma";
import type {PaymentProvider,PaymentEnvironment} from "@/lib/payment-settings-spec";

// Data encryption key is a separate 256-bit server secret, never supplied by admins.
// Rotating this key requires a controlled re-encryption migration of existing values.
function encryptionKey():Buffer{
  const raw=process.env.RUBY_PAYMENT_SETTINGS_KEY;
  if(!raw||!/^[A-Za-z0-9_-]{43,44}={0,2}$/.test(raw))
    throw new Error("Payment settings encryption key not configured");
  const key=Buffer.from(raw,"base64url");
  if(key.length!==32)throw new Error("Invalid payment settings encryption key");
  return key;
}
export function paymentVaultConfigured(){
  try {encryptionKey();return true;}catch{return false;}
}
export function encryptPaymentValue(provider:PaymentProvider,env:PaymentEnvironment,field:string,value:string){
  const nonce=randomBytes(12);
  const cipher=createCipheriv("aes-256-gcm",encryptionKey(),nonce);
  cipher.setAAD(Buffer.from(provider+":"+env+":"+field));
  const ciphertext=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);
  return {ciphertext:ciphertext.toString("base64url"),nonce:nonce.toString("base64url"),authTag:cipher.getAuthTag().toString("base64url")};
}
export function decryptPaymentValue(provider:PaymentProvider,env:PaymentEnvironment,field:string,record:{ciphertext:string;nonce:string;authTag:string}){
  const decipher=createDecipheriv("aes-256-gcm",encryptionKey(),Buffer.from(record.nonce,"base64url"));
  decipher.setAAD(Buffer.from(provider+":"+env+":"+field));
  decipher.setAuthTag(Buffer.from(record.authTag,"base64url"));
  return decipher.update(Buffer.from(record.ciphertext,"base64url")).toString("utf8")+decipher.final("utf8");
}
// Only import in future trusted server-side provider adapters after payment authorization.
export async function loadPaymentValue(provider:PaymentProvider,env:PaymentEnvironment,field:string){
  const row=await getPrisma().paymentIntegrationSetting.findUnique({
    where:{provider_environment_field:{provider,environment:env,field}},
    select:{ciphertext:true,nonce:true,authTag:true}
  });
  return row?decryptPaymentValue(provider,env,field,row):null;
}
