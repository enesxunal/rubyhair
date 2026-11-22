/** Anonymous, allowlisted traffic categories only; no full URLs, UTM values, click IDs or profiles stored. */
export type RubyTrafficSource="meta_paid"|"meta_post"|"meta_reels"|"social"|"search"|"referral"|"direct"|"internal";
const socialHost=/(^|\.)(instagram|facebook|fb|tiktok|pinterest)\.(com|de|net)$/i;
const searchHost=/(^|\.)(google|bing|duckduckgo|yandex)\./i;
const paidMedium=new Set(["paid_social","paidsocial","cpc","ppc","paid","social_paid","paid-social"]);
const metaNetwork=new Set(["meta","facebook","instagram","fb","ig"]);

/** Safe category for one navigation. Query values and Meta click identifiers never leave browser. */
export function classifyRubyTraffic(currentUrl:string,referrer:string,previous?:RubyTrafficSource|null):RubyTrafficSource{
 let url:URL;
 try{url=new URL(currentUrl)}catch{return "direct";}
 const campaignSource=(url.searchParams.get("utm_source")||"").trim().toLowerCase().slice(0,40);
 const medium=(url.searchParams.get("utm_medium")||"").trim().toLowerCase().slice(0,40);
 if(metaNetwork.has(campaignSource)&&paidMedium.has(medium)){
  const creative=(url.searchParams.get("utm_content")||"").trim().toLowerCase();
  if(creative==="instagram_post")return "meta_post";
  if(creative==="elaine_reels_15s")return "meta_reels";
  return "meta_paid";
}
 if(metaNetwork.has(campaignSource)||["tiktok","pinterest"].includes(campaignSource))return "social";
 if(["google","bing","duckduckgo","yandex"].includes(campaignSource))return "search";
 // This code only receives categories, never persists UTM parameters or click IDs.
 // A paid-ad classification persists during the same consented tab visit.
 if(previous==="meta_paid"||previous==="meta_post"||previous==="meta_reels")return previous;
 if(referrer){
  try{
   const r=new URL(referrer);
   if(r.origin===url.origin)return previous||"internal";
   if(socialHost.test(r.hostname))return "social";
   if(searchHost.test(r.hostname))return "search";
   return "referral";
  }catch{/* malformed referrer */}
 }
 return previous||"direct";
}
