"use client";
import {useEffect,useState} from "react";
import {usePathname} from "next/navigation";
import Link from "next/link";
import {analyticsEnabled,isTrackableRubyPath,trackRubyEvent} from "@/lib/storefront-analytics";
import {trackRubyMetaEvent} from "@/lib/meta-pixel";
import {trackRubyGA4Event} from "@/lib/google-analytics";

type Choice="allow"|"deny"|null;
const statsKey="ruby_analytics_choice";
const marketingKey="ruby_marketing_choice";
const gaKey="ruby_ga4_choice";
const readChoice=(name:string):Choice=>{
 try{const v=localStorage.getItem(name);return v==="allow"||v==="deny"?v:null}catch{return null}
};

export default function AnalyticsConsent(){
 const path=usePathname();
 const [statistics,setStatistics]=useState<Choice>(null);
 const [marketing,setMarketing]=useState<Choice>(null);
 const [googleChoice,setGoogleChoice]=useState<Choice>(null);
 const [draftStatistics,setDraftStatistics]=useState(false);
 const [draftMarketing,setDraftMarketing]=useState(false);
 const [draftGoogle,setDraftGoogle]=useState(false);
 const [open,setOpen]=useState(false);
 const [initialized,setInitialized]=useState(false);
 const statsAvailable=analyticsEnabled();
 const trackable=isTrackableRubyPath(path)||path.startsWith("/ratgeber/");
 useEffect(()=>{
  if(!trackable)return;
  const stats=readChoice(statsKey),ads=readChoice(marketingKey),ga=readChoice(gaKey);
  setStatistics(stats);setMarketing(ads);setGoogleChoice(ga);
  setDraftStatistics(stats==="allow");setDraftMarketing(ads==="allow");setDraftGoogle(ga==="allow");
  setInitialized(true);
  if((statsAvailable&&stats===null)||ads===null||ga===null)setOpen(true);
 },[trackable,statsAvailable]);
 useEffect(()=>{
  const showSettings=()=>setOpen(true);
  window.addEventListener("ruby-open-analytics-settings",showSettings);
  return ()=>window.removeEventListener("ruby-open-analytics-settings",showSettings);
 },[]);
 useEffect(()=>{
  if(!initialized||!trackable)return;
  if(statsAvailable&&statistics==="allow"&&isTrackableRubyPath(path)){
   trackRubyEvent("page_view");
   if(path==="/kasse")trackRubyEvent("begin_checkout");
  }
 },[path,statistics,initialized,trackable,statsAvailable]);
 useEffect(()=>{
  if(!initialized||googleChoice!=="allow"||!trackable)return;
  trackRubyGA4Event("page_view");
  if(path.startsWith("/produkt/"))trackRubyGA4Event("view_item");
  if(path==="/kasse")trackRubyGA4Event("begin_checkout");
 },[path,googleChoice,initialized,trackable]);
 useEffect(()=>{
  if(!initialized||marketing!=="allow"||!trackable)return;
  trackRubyMetaEvent("PageView");
  if(path.startsWith("/produkt/"))trackRubyMetaEvent("ViewContent");
  if(path==="/kasse")trackRubyMetaEvent("InitiateCheckout");
 },[path,marketing,initialized,trackable]);
 const save=(stats:Choice,ads:Choice,ga:Choice)=>{
  if(!stats||!ads||!ga)return;
  const oldMarketing=readChoice(marketingKey);
  const oldGA=readChoice(gaKey);
  try{
   localStorage.setItem(statsKey,stats);
   localStorage.setItem(marketingKey,ads);
   localStorage.setItem(gaKey,ga);
   document.cookie="ruby_analytics="+stats+"; Path=/; Max-Age=31536000; SameSite=Lax"+(location.protocol==="https:"?"; Secure":"");
   if(ads==="deny"){
    // Remove the most common browser cookie created by Meta, as far as first party control allows.
    for(const key of ["_fbp","_fbc"])document.cookie=key+"=; Path=/; Max-Age=0; SameSite=Lax";
   }
   if(ga==="deny"){
    for(const item of document.cookie.split(";")){
     const key=item.trim().split("=")[0];
     if(key==="_ga"||key.startsWith("_ga_"))document.cookie=key+"=; Path=/; Max-Age=0; SameSite=Lax";
    }
   }
  }catch{return}
  setStatistics(stats);setMarketing(ads);setGoogleChoice(ga);setOpen(false);
  if((oldMarketing==="allow"&&ads==="deny")||(oldGA==="allow"&&ga==="deny"))window.location.reload();
 };
 if(path.startsWith("/admin")||path.startsWith("/api")||path.startsWith("/konto")||path.startsWith("/coming-soon"))return null;
 return <>{open&&<aside className="rh-consent-panel" role="dialog" aria-modal="false" aria-label="Datenschutz- und Cookie-Einstellungen">
    <strong>Privatsphäre & Cookies</strong>
    <p>Notwendige Funktionen sind immer aktiv. Optionale Dienste starten erst nach deiner Zustimmung. Du kannst deine Entscheidung jederzeit über den Seitenfuß ändern. <Link href="/rechtliches/datenschutz/">Datenschutzerklärung</Link></p>
    {statsAvailable&&<label className="rh-consent-option"><input type="checkbox" checked={draftStatistics} onChange={e=>setDraftStatistics(e.target.checked)}/><span><b>Statistik</b><small>Anonyme Tageszähler für Seiten, Community-Stories, KI-Versuche und Warenkorb-Aktionen. Keine Fotos oder Nutzerprofile.</small></span></label>}
    <label className="rh-consent-option"><input type="checkbox" checked={draftGoogle} onChange={e=>setDraftGoogle(e.target.checked)}/><span><b>Google Analytics 4 (Statistik)</b><small>Mit eigener Einwilligung: Seiten- und Shop-Ereignisse an Google Ireland. Frühere Zustimmungen zur internen Statistik gelten hierfür nicht.</small></span></label>
    <label className="rh-consent-option"><input type="checkbox" checked={draftMarketing} onChange={e=>setDraftMarketing(e.target.checked)}/><span><b>Marketing (Meta Pixel)</b><small>Erst mit Zustimmung: Seitenaufruf, Produktansicht, Warenkorb und Checkout an Meta. Es werden keine Fotos oder Namen übertragen.</small></span></label>
    <div className="rh-consent-actions">
     <button type="button" onClick={()=>save("deny","deny","deny")}>Alle ablehnen</button>
     <button type="button" onClick={()=>save(draftStatistics&&statsAvailable?"allow":"deny",draftMarketing?"allow":"deny",draftGoogle?"allow":"deny")}>Auswahl speichern</button>
     <button type="button" onClick={()=>save(statsAvailable?"allow":"deny","allow","allow")}>Alle akzeptieren</button>
    </div>
   </aside>}</>;
}
