"use client";
import {storyAnalyticsPaths} from "@/data/story-analytics";
export type RubyEvent="page_view"|"add_to_cart"|"begin_checkout"|"story_view"|"ai_tryon_start"|"ai_tryon_success"|"ai_to_cart";
const enabled=process.env.NEXT_PUBLIC_RUBY_ANALYTICS_ENABLED==="APPROVED";
export const analyticsEnabled=()=>enabled;
const allowed=new Set(["/","/kollektionen","/kollektionen/tape-in-extensions","/produkt/tape-in-extensions","/produkt/keratin-bondings","/ratgeber","/kontakt","/versand-zahlung","/warenkorb","/kasse","/haar-anprobe","/suche","/geschenkgutschein"]);
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
export const isTrackableRubyPath=(path:string)=>allowed.has(path.replace(/\/$/,"")||"/");
export const analyticsConsent=()=>enabled&&typeof window!=="undefined"&&localStorage.getItem("ruby_analytics_choice")==="allow";
export function trackRubyEvent(event:RubyEvent,pathOverride?:string){
 if(!analyticsConsent())return;
 const path=pathOverride||location.pathname.replace(/\/$/,"")||"/";
 if(event==="story_view"){if(!storyAnalyticsPaths.has(path))return;}
 else if(event==="ai_tryon_start"||event==="ai_tryon_success"||event==="ai_to_cart"){if(path!=="/haar-anprobe")return;}
 else {if(!isTrackableRubyPath(path))return;}
 // Only whitelisted categorical metadata, never URL query strings, personal fields or photo data.
 const payload=JSON.stringify({event,path,source:source(),device:innerWidth<=767?"mobile":"desktop",consent:true});
 fetch("/api/analytics/event",{method:"POST",headers:{"Content-Type":"application/json"},body:payload,credentials:"same-origin",keepalive:true,cache:"no-store"}).catch(()=>{});
}
