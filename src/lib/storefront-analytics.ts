"use client";
export type RubyEvent="page_view"|"add_to_cart"|"begin_checkout";
const enabled=process.env.NEXT_PUBLIC_RUBY_ANALYTICS_ENABLED==="APPROVED";
export const analyticsEnabled=()=>enabled;
const allowed=new Set(["/","/kollektionen","/kollektionen/tape-in-extensions","/produkt/tape-in-extensions","/ratgeber","/kontakt","/versand-zahlung","/warenkorb","/kasse","/haar-anprobe","/suche"]);
const source=()=>{
 if(!document.referrer)return "direct";
 try{
  const ref=new URL(document.referrer);
  if(ref.origin===location.origin)return "internal";
  if(/(^|\.)(google|bing|duckduckgo|yandex)\./.test(ref.hostname))return "search";
  if(/(^|\.)(instagram|facebook|tiktok|pinterest)\./.test(ref.hostname))return "social";
  return "referral";
 }catch{return "direct";}
};
export const analyticsConsent=()=>enabled&&typeof window!=="undefined"&&localStorage.getItem("ruby_analytics_choice")==="allow";
export function trackRubyEvent(event:RubyEvent){
 if(!analyticsConsent())return;
 const path=location.pathname.replace(/\/$/,"")||"/";
 if(!allowed.has(path))return;
 // Only whitelisted categorical metadata, never URL query strings, personal fields or photo data.
 const payload=JSON.stringify({event,path,source:source(),device:innerWidth<=767?"mobile":"desktop",consent:true});
 fetch("/api/analytics/event",{method:"POST",headers:{"Content-Type":"application/json"},body:payload,credentials:"same-origin",keepalive:true,cache:"no-store"}).catch(()=>{});
}
