import "server-only";
import {randomUUID} from "node:crypto";
import {loadPaymentValue} from "@/lib/payment-secrets";
import {PaypalClient} from "@/lib/paypal-provider-core";

export type ConnectionProvider="paypal"|"klarna";
export type ConnectionResult="authenticated"|"credentials_missing"|"rejected"|"unavailable"|"inconclusive";

/** No order/session creation or payment capture: only auth and read-only probes. */
export async function verifyPaymentConnection(provider:ConnectionProvider):Promise<ConnectionResult>{
 if(provider==="paypal"){
  const [clientId,clientSecret,webhookId]=await Promise.all([
   loadPaymentValue("paypal","live","clientId"),loadPaymentValue("paypal","live","clientSecret"),loadPaymentValue("paypal","live","webhookId")
  ]);
  if(!clientId||!clientSecret||!webhookId)return "credentials_missing";
  try{
   const client=new PaypalClient("live",{clientId,clientSecret,webhookId});
   const token=await client.token();
   return token.length>=12?"authenticated":"inconclusive";
  }catch(e){
   const code=e instanceof Error?e.message:"UNKNOWN";
   if(code==="PAYPAL_AUTH_REJECTED")return "rejected";
   if(code==="PAYPAL_AUTH_UNAVAILABLE")return "unavailable";
   return "inconclusive";
  }
 }
 const [username,password,merchantId]=await Promise.all([
  loadPaymentValue("klarna","live","username"),loadPaymentValue("klarna","live","password"),loadPaymentValue("klarna","live","merchantId")
 ]);
 if(!username||!password||!merchantId)return "credentials_missing";
 // GET a non-existent random test session: read-only, no checkout or payment created.
 const url="https://api.klarna.com/payments/v1/sessions/"+randomUUID();
 const authorization="Basic "+Buffer.from(username+":"+password,"utf8").toString("base64");
 try{
  const response=await fetch(url,{method:"GET",redirect:"error",headers:{Authorization:authorization,Accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(12000)});
  if(response.status===401)return "rejected";
  if(response.status===403)return "inconclusive"; // credentials or merchant activation unclear
  // A 404 for an intentionally nonexistent ID is expected, but not a full
  // transaction-level proof: treat as inconclusive until the actual flow runs.
  if(response.status===404||response.status===400)return "inconclusive";
  return response.status>=500?"unavailable":"inconclusive";
 }catch{return "unavailable"}
}
