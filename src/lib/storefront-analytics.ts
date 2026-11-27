"use client";
import {trackJourney} from "@/lib/journey-client";
import {storyAnalyticsPaths} from "@/data/story-analytics";
import {classifyRubyTraffic,type RubyTrafficSource} from "@/lib/analytics-attribution";
export type RubyEvent="page_view"|"add_to_cart"|"begin_checkout"|"story_view"|"story_section_seen"|"ai_tryon_start"|"ai_tryon_success"|"ai_to_cart";
const enabled=process.env.NEXT_PUBLIC_RUBY_ANALYTICS_ENABLED==="APPROVED";
export const analyticsEnabled=()=>enabled;
const allowed=new Set(["/","/kollektionen","/kollektionen/tape-in-extensions","/produkt/tape-in-extensions","/produkt/keratin-bondings","/ratgeber","/kontakt","/versand-zahlung","/warenkorb","/kasse","/haar-anprobe","/suche","/geschenkgutschein"]);
const attributionKey="ruby_analytics_source_tab";
const allowedSource=new Set<RubyTrafficSource>(["meta_paid","meta_post","meta_reels","social","search","referral","direct","internal"]);
const source=():RubyTrafficSource=>{
 // Only called after analyticsConsent; store the source category for SPA navigation in this tab.
 let previous:RubyTrafficSource|null=null;
 try{const value=sessionStorage.getItem(attributionKey) as RubyTrafficSource|null;previous=value&&allowedSource.has(value)?value:null;}catch{}
 const result=classifyRubyTraffic(location.href,document.referrer,previous);
 try{sessionStorage.setItem(attributionKey,result)}catch{}
 return result;
};
export const isTrackableRubyPath=(path:string)=>allowed.has(path.replace(/\/$/,"")||"/");
export const analyticsConsent=()=>enabled&&typeof window!=="undefined"&&
 localStorage.getItem("ruby_analytics_choice")==="allow"&&
 document.cookie.split(";").some(part=>part.trim()==="ruby_analytics=allow");
export function trackRubyEvent(event:RubyEvent,pathOverride?:string){
 if(!analyticsConsent())return;
 const path=pathOverride||location.pathname.replace(/\/$/,"")||"/";
 if(event==="story_view"){if(!storyAnalyticsPaths.has(path))return;}
 else if(event==="story_section_seen"){if(path!=="/")return;}
 else if(event==="ai_tryon_start"||event==="ai_tryon_success"||event==="ai_to_cart"){if(path!=="/haar-anprobe")return;}
 else {if(!isTrackableRubyPath(path))return;}
 // Only whitelisted categorical metadata, never URL query strings, personal fields or photo data.
 const category=source(),device=innerWidth<=767?"mobile":"desktop";
 if(event==="add_to_cart"||event==="begin_checkout")trackJourney(event,{source:category,device});
 else if(event==="page_view"&&path.startsWith("/produkt/"))trackJourney("product_view",{source:category,device});
 else if(event==="page_view"&&path==="/warenkorb")trackJourney("cart_view",{source:category,device});
 const payload=JSON.stringify({event,path,source:category,device,consent:true});
 // A temporary 503 should not permanently lose a consented Story/AI click.
 // Never retry validation/consent rejections (400/403), and retry at most once.
 const send=(attempt:number)=>{
  fetch("/api/analytics/event",{method:"POST",headers:{"Content-Type":"application/json"},body:payload,credentials:"same-origin",keepalive:true,cache:"no-store"})
   .then(response=>{
    if(response.status===503&&attempt===0&&document.visibilityState==="visible")
     window.setTimeout(()=>send(1),850);
   })
   .catch(()=>{
    if(attempt===0&&document.visibilityState==="visible")window.setTimeout(()=>send(1),850);
   });
 };
 send(0);
}
