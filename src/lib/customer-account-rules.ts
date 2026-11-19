import {createHash,createHmac,randomBytes} from "node:crypto";

export const CUSTOMER_COOKIE="rubyhair_customer";
export const LOGIN_TOKEN_AGE_MS=15*60*1000;
export const CUSTOMER_SESSION_AGE_SEC=30*24*60*60;
export const customerToken=()=>randomBytes(32).toString("hex");
export const hashCustomerToken=(token:string)=>createHash("sha256").update(token).digest("hex");
export const normalizeCustomerEmail=(value:string)=>value.trim().toLowerCase();
export const validCustomerEmail=(value:string)=>value.length<=254&&/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(value);
export const validCustomerToken=(token:unknown):token is string=>typeof token==="string"&&/^[a-f0-9]{64}$/.test(token);
export const customerRateKey=(category:string,value:string,secret:string)=>createHmac("sha256",secret).update("ruby-customer-auth:"+category+":"+value).digest("hex");
export const safeCustomerInvoiceName=(name:string)=>/^RH-[0-9]{4}-[0-9]{7}$/.test(name)?name:"Ruby-Hair-Rechnung";
export const safeCustomerTrackingUrl=(carrier:string|null,tracking:string|null)=>{
 if(carrier?.trim().toUpperCase()!=="DHL"||!tracking||!/^[A-Za-z0-9]{8,40}$/.test(tracking))return null;
 return "https://www.dhl.de/de/privatkunden/dhl-sendungsverfolgung.html?piececode="+encodeURIComponent(tracking);
};

/** Recover a single transient PostgreSQL pool error without retrying SMTP deliveries.
 *  P1001 = temporary DB reachability, P2024 = connection pool wait timeout.
 */
export async function retryCustomerDb<T>(action:()=>Promise<T>,delayMs=180):Promise<T>{
 try{return await action()}
 catch(error){
  const code=(error as {code?:unknown})?.code;
  if(code!=="P1001"&&code!=="P2024")throw error;
  await new Promise(resolve=>setTimeout(resolve,delayMs));
  return action();
 }
}
