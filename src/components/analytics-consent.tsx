"use client";
import {useEffect,useState} from "react";
import {usePathname} from "next/navigation";
import Link from "next/link";
import {analyticsEnabled,isTrackableRubyPath,trackRubyEvent} from "@/lib/storefront-analytics";
export default function AnalyticsConsent(){
 const path=usePathname();
 const [choice,setChoice]=useState<"allow"|"deny"|null>(null);
 const [open,setOpen]=useState(false);
 useEffect(()=>{
  if(!analyticsEnabled()||!isTrackableRubyPath(path))return;
  const saved=localStorage.getItem("ruby_analytics_choice");
  if(saved==="allow"||saved==="deny")setChoice(saved);
  else setOpen(true);
 },[path]);
 useEffect(()=>{
  if(choice!=="allow"||!isTrackableRubyPath(path))return;
  trackRubyEvent("page_view");
  if(path==="/kasse")trackRubyEvent("begin_checkout");
 },[path,choice]);
 if(!analyticsEnabled()||!isTrackableRubyPath(path))return null;
 const pick=(value:"allow"|"deny")=>{
  localStorage.setItem("ruby_analytics_choice",value);
  document.cookie="ruby_analytics="+(value==="allow"?"allow":"deny")+"; Path=/; Max-Age=31536000; SameSite=Lax"+(location.protocol==="https:"?"; Secure":"");
  setChoice(value);setOpen(false);
 };
 return <>
   {open&&<aside className="rh-consent-panel" role="dialog" aria-modal="false" aria-label="Datenschutz-Einstellungen">
     <strong>Datenschutz & Statistik</strong>
     <p>Dürfen wir anonyme, zusammengefasste Seiten- und Warenkorb-Ereignisse zählen? Keine Fotos, Namen, Adressen oder individuellen Besucherverläufe. Optional. <Link href="/rechtliches/datenschutz/">Datenschutz</Link></p>
     <div><button type="button" onClick={()=>pick("deny")}>Ablehnen</button><button type="button" onClick={()=>pick("allow")}>Zustimmen</button></div>
   </aside>}
   {choice&&<button type="button" className="rh-consent-settings" onClick={()=>setOpen(true)}>Statistik-Einstellungen</button>}
 </>;
}
