"use client";
import {useTransition} from "react";
import {useRouter} from "next/navigation";
import {RefreshCw} from "lucide-react";
export default function AdminAnalyticsRefresh({trafficAt,commerceAt}:{trafficAt:string;commerceAt?:string}){
 const router=useRouter();
 const [pending,startTransition]=useTransition();
 const format=(value:string)=>new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(new Date(value));
 return <div className="rh-adv-refresh-group">
  <button type="button" className="rh-adv-refresh" disabled={pending} aria-busy={pending} onClick={()=>startTransition(()=>router.refresh())}>
   <RefreshCw size={17} className={pending?"rh-adv-refresh-spinning":undefined}/> {pending?"Wird aktualisiert …":"Aktualisieren"}
  </button>
  <small role="status">Traffic: {format(trafficAt)} · Umsatz: {commerceAt?format(commerceAt):"nicht verfügbar"} · Daten-Cache 30 s</small>
 </div>;
}
