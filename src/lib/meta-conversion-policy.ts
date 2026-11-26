import {createHmac} from "node:crypto";
export const META_DATASET="1157620659939392";
export const META_CAPI_CONSENT="2026-11-26-capi-v1";
export const META_CAPI_COOKIE="ruby_meta_capi_consent";
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function opaqueMetaId(secret:string,orderId:string){return createHmac("sha256",secret).update("ruby-meta-purchase:"+orderId).digest("hex")}
export function consentHash(secret:string,consentId:string){return createHmac("sha256",secret).update("ruby-meta-consent:"+consentId).digest("hex")}
export function allowedMetaCookie(value:unknown,kind:"fbp"|"fbc"){
 if(typeof value!=="string"||value.length>255)return undefined;
 return (kind==="fbp"?/^fb\.[0-9]+\.[0-9]{10,16}\.[0-9]+$/:/^fb\.[0-9]+\.[0-9]{10,16}\.[A-Za-z0-9_-]+$/).test(value)?value:undefined;
}
export function conversionPayload(input:{id:string;secret:string;status:string;testOnly:boolean;currency:string;totalCents:number;giftAppliedCents:number;captureAt:Date|null;contextCreated:Date;fbp?:string|null;fbc?:string|null;userAgent:string;now:Date}){
 if(input.testOnly||!["payment_confirmed","preparing","shipped","delivered"].includes(input.status)||input.currency!=="EUR"||!input.captureAt||
  input.captureAt.getTime()<input.contextCreated.getTime()-60000||input.captureAt>input.now||input.now.getTime()-input.captureAt.getTime()>24*3600000||
  !Number.isSafeInteger(input.totalCents)||!Number.isSafeInteger(input.giftAppliedCents)||input.giftAppliedCents<0||input.totalCents<=input.giftAppliedCents||
  !UUID.test(input.id)||input.secret.length<32||!input.userAgent||input.userAgent.length>512)return null;
 const fbp=allowedMetaCookie(input.fbp,"fbp"),fbc=allowedMetaCookie(input.fbc,"fbc");if(!fbp&&!fbc)return null;
 return {event_name:"Purchase",event_time:Math.floor(input.captureAt.getTime()/1000),event_id:opaqueMetaId(input.secret,input.id),
  action_source:"website",event_source_url:"https://rubyhair.de/kasse",
  user_data:{client_user_agent:input.userAgent,...(fbp?{fbp}:{}),...(fbc?{fbc}:{})},
  custom_data:{value:(input.totalCents-input.giftAppliedCents)/100,currency:"EUR"}};
}
