import {z} from "zod";
const sources=["meta_post","meta_reels","meta_paid","instagram","facebook","google","google_paid","search","social","referral","direct_unknown"] as const;
export const touchSchema=z.object({source:z.enum(sources),device:z.enum(["mobile","desktop","unknown"]),campaignId:z.string().regex(/^\d{15,20}$/).optional(),adSetId:z.string().regex(/^\d{15,20}$/).optional(),adId:z.string().regex(/^\d{15,20}$/).optional()}).strict().refine(t=>["meta_post","meta_reels","meta_paid"].includes(t.source)||(!t.campaignId&&!t.adSetId&&!t.adId));
export type Touch=z.infer<typeof touchSchema>;
const paid=new Set(["paid_social","paidsocial","cpc","ppc","paid","social_paid","paid-social"]);
const meta=new Set(["meta","instagram","facebook","ig","fb"]);
const known=(host:string,domain:string)=>host===domain||host.endsWith("."+domain);
export function purchaseTouch(href:string,referrer:string,device:Touch["device"]):Touch|null{
 try{
 const url=new URL(href),q=url.searchParams;
 const s=(q.get("utm_source")||"").trim().toLowerCase(),m=(q.get("utm_medium")||"").trim().toLowerCase();
 const c=(q.get("utm_content")||"").trim().toLowerCase();
 if(meta.has(s)&&paid.has(m)){
  const id=(key:string)=>{const x=q.get(key)||"";return /^\d{15,20}$/.test(x)?x:undefined};
  return {source:c==="instagram_post"?"meta_post":c==="elaine_reels_15s"?"meta_reels":"meta_paid",device,campaignId:id("campaign_id")||id("utm_id"),adSetId:id("adset_id"),adId:id("ad_id")};
 }
 if(["instagram","ig"].includes(s))return {source:"instagram",device};
 if(["facebook","fb","meta"].includes(s))return {source:"facebook",device};
 if(s==="google")return {source:paid.has(m)?"google_paid":"google",device};
 if(["bing","duckduckgo","yandex"].includes(s))return {source:"search",device};
 if(["tiktok","pinterest"].includes(s))return {source:"social",device};
 if(referrer){
  const r=new URL(referrer);
  if(known(r.hostname,"rubyhair.de"))return null;
  if(known(r.hostname,"instagram.com"))return {source:"instagram",device};
  if(known(r.hostname,"facebook.com")||known(r.hostname,"fb.com"))return {source:"facebook",device};
  if(/^([a-z0-9-]+\.)*google\.(com|de|co\.uk)$/i.test(r.hostname))return {source:"google",device};
  if(["bing.com","duckduckgo.com","yandex.com"].some(h=>known(r.hostname,h)))return {source:"search",device};
  if(["tiktok.com","pinterest.com"].some(h=>known(r.hostname,h)))return {source:"social",device};
  if(["paypal.com","klarna.com"].some(h=>known(r.hostname,h)))return null;
  return {source:"referral",device};
 }
 return {source:"direct_unknown",device};
 }catch{return null}
}
export const purchaseSourceLabels:Record<Touch["source"]| "unknown",string>={meta_post:"Meta · Instagram Post",meta_reels:"Meta · Elaine Reels",meta_paid:"Meta · bezahlte Anzeige",instagram:"Instagram · nicht eindeutig bezahlt",facebook:"Facebook/Meta · nicht eindeutig bezahlt",google:"Google · nicht eindeutig bezahlt",google_paid:"Google · bezahlte Anzeige",search:"Suchmaschine",social:"Social Media",referral:"Externe Verlinkung",direct_unknown:"Direkt / nicht eindeutig",unknown:"Unbekannt / keine Zuordnung"};
export function updatedTouch(last:Touch,next:Touch){return next.source==="direct_unknown"&&last.source!=="direct_unknown"?last:next}
export function touchLabel(raw:unknown){const p=touchSchema.safeParse(raw);return p.success?purchaseSourceLabels[p.data.source]:purchaseSourceLabels.unknown}
