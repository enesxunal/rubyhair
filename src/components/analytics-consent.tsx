"use client";
import {useEffect,useState,useRef} from "react";
import {usePathname} from "next/navigation";
import Link from "next/link";
import {analyticsEnabled,isTrackableRubyPath,trackRubyEvent} from "@/lib/storefront-analytics";
import {trackRubyMetaEvent,META_PURCHASE_CONSENT_VERSION} from "@/lib/meta-pixel";
import {attributionChoiceKey,saveAttributionChoice,touchAttribution} from "@/lib/purchase-attribution-client";
import {trackRubyGA4Event} from "@/lib/google-analytics";

type Choice="allow"|"deny"|null;
const statsKey="ruby_analytics_choice";
const capiAvailable=process.env.NEXT_PUBLIC_RUBY_META_CAPI_ENABLED==="APPROVED";
const capiKey="ruby_meta_capi_choice";
const marketingKey="ruby_marketing_choice";
const gaKey="ruby_ga4_choice";
const readChoice=(name:string):Choice=>{
 try{const v=localStorage.getItem(name);return v==="allow"||v==="deny"?v:null}catch{return null}
};
/** Never infer renewed tracking consent from localStorage if the server-facing
 * consent cookie was deleted. Ask the visitor to confirm again instead. */
const readAnalyticsCookie=():Choice=>{
 try{
  const part=document.cookie.split(";").map(value=>value.trim()).find(value=>value.startsWith("ruby_analytics="));
  const value=part?.slice("ruby_analytics=".length);
  return value==="allow"||value==="deny"?value:null;
 }catch{return null}
};

export default function AnalyticsConsent(){
 const path=usePathname();
 const [statistics,setStatistics]=useState<Choice>(null);
 const [marketing,setMarketing]=useState<Choice>(null);
 const [googleChoice,setGoogleChoice]=useState<Choice>(null);
 const [draftStatistics,setDraftStatistics]=useState(false);
 const [draftMarketing,setDraftMarketing]=useState(false);
 const [draftGoogle,setDraftGoogle]=useState(false);
 const [draftCapi,setDraftCapi]=useState(false);
 const [draftAttribution,setDraftAttribution]=useState(false);
 const attrFirst=useRef(true);
 const [open,setOpen]=useState(false);
 const [detailsOpen,setDetailsOpen]=useState(false);
 const [initialized,setInitialized]=useState(false);
 const statsAvailable=analyticsEnabled();
 const trackable=isTrackableRubyPath(path)||path.startsWith("/ratgeber/");
 useEffect(()=>{
  if(!trackable)return;
  const storedStats=readChoice(statsKey),ads=readChoice(marketingKey),ga=readChoice(gaKey);
  const stats=storedStats===readAnalyticsCookie()?storedStats:null;
  setStatistics(stats);setMarketing(ads);setGoogleChoice(ga);
  setDraftStatistics(stats==="allow");setDraftMarketing(ads==="allow");setDraftGoogle(ga==="allow");
  const attr=readChoice(attributionChoiceKey);setDraftAttribution(attr==="allow");if(attr===null)setOpen(true);
  setDraftCapi(capiAvailable&&readChoice(capiKey)==="allow");
  if(capiAvailable&&ads==="allow"&&readChoice(capiKey)===null)setOpen(true);
  setInitialized(true);
  if((statsAvailable&&stats===null)||ads===null||ga===null)setOpen(true);
  try{if(ads==="allow"&&localStorage.getItem("ruby_meta_purchase_consent")!==META_PURCHASE_CONSENT_VERSION)setOpen(true)}catch{}
 },[trackable,statsAvailable]);
 useEffect(()=>{
  const showSettings=()=>{setDetailsOpen(true);setOpen(true)};
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
 useEffect(()=>{if(!trackable||!initialized)return;const first=attrFirst.current;attrFirst.current=false;void touchAttribution(first).then(ok=>{if(!ok)setOpen(true)});},[path,trackable,initialized]);
 useEffect(()=>{
  if(!initialized||!trackable||!capiAvailable||(()=>{try{return localStorage.getItem(capiKey)!=="revoke_pending"}catch{return true}})())return;
  fetch("/api/meta/consent",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({allow:false}),keepalive:true}).then(r=>{if(r.ok)localStorage.setItem(capiKey,"deny")}).catch(()=>{});
 },[initialized,trackable,path]);
 const save=async(stats:Choice,ads:Choice,ga:Choice,capi=false,attribution=false)=>{
  if(!stats||!ads||!ga)return;
  const oldMarketing=readChoice(marketingKey);
  const oldGA=readChoice(gaKey);
  try{
   localStorage.setItem(statsKey,stats);
   localStorage.setItem(marketingKey,ads);
   if(ads==="allow")localStorage.setItem("ruby_meta_purchase_consent",META_PURCHASE_CONSENT_VERSION);else localStorage.removeItem("ruby_meta_purchase_consent");
   localStorage.setItem(gaKey,ga);
   document.cookie="ruby_analytics="+stats+"; Path=/; Max-Age=31536000; SameSite=Lax"+(location.protocol==="https:"?"; Secure":"");
   if(stats==="deny")try{sessionStorage.removeItem("ruby_analytics_source_tab")}catch{}
   if(capiAvailable){document.cookie="ruby_meta_capi_browser="+(ads==="allow"&&capi?"allow":"deny")+"; Path=/; Max-Age=15552000; SameSite=Lax; Secure";}
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
  if(capiAvailable||readChoice(capiKey)==="allow"){
   const allow=capiAvailable&&ads==="allow"&&capi;
   try{
    const response=await fetch("/api/meta/consent",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({allow}),keepalive:true});
    if(response.ok)localStorage.setItem(capiKey,allow?"allow":"deny");
    else if(!allow)localStorage.setItem(capiKey,"revoke_pending");else localStorage.removeItem(capiKey);
   }catch{try{if(!allow)localStorage.setItem(capiKey,"revoke_pending");else localStorage.removeItem(capiKey)}catch{}}
  }
  const attrSaved=await saveAttributionChoice(attribution);
  setStatistics(stats);setMarketing(ads);setGoogleChoice(ga);setOpen(!attrSaved&&attribution);
  if(stats==="allow")window.dispatchEvent(new Event("ruby-analytics-consent-saved"));
  if((oldMarketing==="allow"&&ads==="deny")||(oldGA==="allow"&&ga==="deny"))window.location.reload();
 };
 if(path.startsWith("/admin")||path.startsWith("/api")||path.startsWith("/konto")||path.startsWith("/coming-soon"))return null;
 return <>{open&&<aside className="rh-consent-panel rh-consent-simplified" role="dialog" aria-modal="false" aria-label="Datenschutz- und Cookie-Einstellungen">
    <header className="rh-consent-head"><span>RUBY HAIR / DATENSCHUTZ</span><strong>Deine Privatsphäre.</strong></header>
    <p>Wir verwenden notwendige Cookies, damit der Shop funktioniert. Statistik und Marketing sind freiwillig und bleiben ohne Zustimmung aus. Mit deiner freiwilligen Einwilligung können wir die Herkunft deiner Bestellung mit dem Kauf verknüpfen. Bei Marketing-Einwilligung kann Meta auch bestätigte Kaufbeträge messen.{capiAvailable&&" Optional können bestätigte Käufe auch serverseitig mit Browser- und Klickkennungen an Meta gemeldet werden."}</p>
    {detailsOpen&&<div className="rh-consent-preferences" role="group" aria-label="Optionale Cookie-Einstellungen">
     <div className="rh-consent-necessary"><b>Notwendig</b><span>Immer aktiv · Warenkorb und sicherer Checkout</span></div>
     {statsAvailable&&<label className="rh-consent-option"><input type="checkbox" checked={draftStatistics} onChange={e=>setDraftStatistics(e.target.checked)}/><span><b>Interne Statistik</b><small>Anonyme Seiten-, Story- und KI-Nutzungszahlen, keine Fotos und keine Personenprofile.</small></span></label>}
     <label className="rh-consent-option"><input type="checkbox" checked={draftGoogle} onChange={e=>setDraftGoogle(e.target.checked)}/><span><b>Google Analytics 4 (Statistik)</b><small>Freiwillige Shop-Nutzungsmessung durch Google, nur bei eigener Zustimmung.</small></span></label>
     <label className="rh-consent-option"><input type="checkbox" checked={draftMarketing} onChange={e=>setDraftMarketing(e.target.checked)}/><span><b>Marketing (Meta Pixel)</b><small>Freiwillige Werbungsmessung durch Meta; bei bestätigter Zahlung auch Betrag, Währung und pseudonyme Ereignis-ID, keine persönlichen Fotos.</small></span></label>
     <label className="rh-consent-option"><input type="checkbox" checked={draftAttribution} onChange={e=>setDraftAttribution(e.target.checked)}/><span><b>Bestellherkunft (interne Erfolgsmessung)</b><small>Ordnet freiwillig die erste und letzte erkennbare Quelle, Kampagnenkennungen und Geräteklasse deiner Bestellung zu. Keine Übermittlung an Werbeanbieter. Widerruf jederzeit.</small></span></label>
     {capiAvailable&&<label className="rh-consent-option"><input type="checkbox" checked={draftMarketing&&draftCapi} disabled={!draftMarketing} onChange={e=>setDraftCapi(e.target.checked)}/><span><b>Meta Conversions API</b><small>Optionale serverseitige Messung bestätigter Käufe mit Browserkennung, Klickkennung, Browserinformationen, Betrag und Ereignis-ID; keine E-Mail oder Adresse.</small></span></label>}
    </div>}
    <div className="rh-consent-actions">
     <button type="button" className="rh-consent-reject" onClick={()=>save("deny","deny","deny")}>Alle ablehnen</button>
     {detailsOpen
       ?<button type="button" className="rh-consent-manage" onClick={()=>save(draftStatistics&&statsAvailable?"allow":"deny",draftMarketing?"allow":"deny",draftGoogle?"allow":"deny",draftCapi,draftAttribution)}>Auswahl speichern</button>
       :<button type="button" className="rh-consent-manage" onClick={()=>setDetailsOpen(true)}>Anpassen</button>}
     <button type="button" className="rh-consent-accept" onClick={()=>save(statsAvailable?"allow":"deny","allow","allow",capiAvailable,true)}>Alle akzeptieren</button>
    </div>
    <footer className="rh-consent-foot"><span>Du kannst deine Wahl jederzeit im Footer ändern.</span><Link href="/rechtliches/datenschutz/">Datenschutzerklärung</Link></footer>
   </aside>}</>;
}
