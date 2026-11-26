"use client";
import {purchaseTouch} from "@/lib/purchase-attribution-policy";
export const attributionChoiceKey="ruby_purchase_attribution_v1";
const currentTouch=()=>purchaseTouch(location.href,document.referrer,innerWidth<=767?"mobile":"desktop")||{source:"direct_unknown" as const,device:innerWidth<=767?"mobile" as const:"desktop" as const};
function browserChoice(allow:boolean){document.cookie="ruby_purchase_attribution_choice="+(allow?"allow":"deny")+"; Path=/; Domain=.rubyhair.de; Max-Age=7776000; SameSite=Lax; Secure"}
export async function saveAttributionChoice(allow:boolean){
 try{
  browserChoice(allow);
  // Block new order bindings immediately on revocation; retry failed removal on later visits.
  localStorage.setItem(attributionChoiceKey,allow?"pending":"revoke_pending");
  const r=await fetch("/api/analytics/attribution",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(allow?{action:"grant",touch:currentTouch()}:{action:"revoke"}),keepalive:true});
  if(r.ok)localStorage.setItem(attributionChoiceKey,allow?"allow":"deny");
  else if(allow)browserChoice(false);
  return r.ok;
 }catch{if(allow)try{browserChoice(false)}catch{};return false}
}
export async function touchAttribution(firstDocument:boolean){
 try{
  const choice=localStorage.getItem(attributionChoiceKey);
  if(choice==="revoke_pending"){await saveAttributionChoice(false);return true;}
  if(choice!=="allow")return choice==="deny";
  if(!firstDocument&&!new URL(location.href).searchParams.has("utm_source"))return true;
  const touch=purchaseTouch(location.href,firstDocument?document.referrer:"",innerWidth<=767?"mobile":"desktop");
  if(!touch)return true;
  const r=await fetch("/api/analytics/attribution",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"touch",touch}),keepalive:true});
  if(r.status===409||r.status===403){browserChoice(false);localStorage.removeItem(attributionChoiceKey);return false;}
  return true;
 }catch{return true}
}
