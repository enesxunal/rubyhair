"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {BLACK_FRIDAY_START,BLACK_FRIDAY_END,BLACK_FRIDAY_CAMPAIGN} from "@/lib/black-friday";

const END=Date.parse(BLACK_FRIDAY_END),START=Date.parse(BLACK_FRIDAY_START);
const SHOWN_KEY=BLACK_FRIDAY_CAMPAIGN+"-coupon-popup-shown";
function remaining(now:number){
 const seconds=Math.max(0,Math.ceil((END-now)/1000));
 return [Math.floor(seconds/86400),Math.floor(seconds/3600)%24,Math.floor(seconds/60)%60,seconds%60];
}
const two=(n:number)=>String(n).padStart(2,"0");
export default function BlackFridayExperience(){
 const pathname=usePathname();
 const [now,setNow]=useState(0);
 const [open,setOpen]=useState(false);
 const previousSaleState=useRef<boolean|null>(null);
 const storefront=!/^\/(admin|api|konto|coming-soon)/.test(pathname);
 const active=now>=START&&now<END;
 useEffect(()=>{
  const tick=()=>setNow(Date.now());
  tick();
  const interval=setInterval(tick,1000);
  const visible=()=>{if(document.visibilityState==="visible")tick()};
  document.addEventListener("visibilitychange",visible);
  return ()=>{clearInterval(interval);document.removeEventListener("visibilitychange",visible)};
 },[]);
 useEffect(()=>{
  if(!now||!storefront)return;
  const previous=previousSaleState.current;
  previousSaleState.current=active;
  // A tab left open across sale start/end must not keep showing old prices.
  if(previous!==null&&previous!==active)window.location.reload();
 },[active,now,storefront]);
 useEffect(()=>{
  if(!storefront||!active||!/^\/$|^\/produkt\/|^\/kollektionen\/|^\/suche\//.test(pathname))return;
  const check=()=>{
   try{
    if(sessionStorage.getItem(SHOWN_KEY))return;
    // Consent must be handled first. No competing modal.
    if(localStorage.getItem("ruby_ga4_choice")===null||
       localStorage.getItem("ruby_marketing_choice")===null||
       document.querySelector(".rh-consent-panel"))return;
    sessionStorage.setItem(SHOWN_KEY,"1");
    setOpen(true);
   }catch{/* Storage disabled: banner still visible, no disruptive popup. */}
  };
  const timer=setTimeout(check,1100);
  const poll=setInterval(check,900);
  return ()=>{clearTimeout(timer);clearInterval(poll)};
 },[storefront,active,pathname]);
 useEffect(()=>{
  if(!open)return;
  const escape=(e:KeyboardEvent)=>{if(e.key==="Escape")setOpen(false)};
  window.addEventListener("keydown",escape);
  return ()=>window.removeEventListener("keydown",escape);
 },[open]);
 if(!storefront||!active)return null;
 const [days,hours,minutes,seconds]=remaining(now);
 return <>
  <div className="rh-bf-bar" role="region" aria-label="Black Friday Aktion">
   <div className="rh-bf-bar-inner">
    <span className="rh-bf-bar-kicker">BLACK FRIDAY <b>–15%</b></span>
    <span className="rh-bf-bar-copy">15 % automatisch · bis 30.11.</span>
    <div className="rh-bf-countdown" aria-label="Verbleibende Zeit bis zum Angebotsende">
     {[[days,"Tage"],[hours,"Std."],[minutes,"Min."],[seconds,"Sek."]].map(([value,label])=>
      <span className="rh-bf-count-unit" key={label}><strong>{two(Number(value))}</strong><small>{label}</small></span>)}
    </div>
    <Link className="rh-bf-bar-cta" href="/kollektionen/">Jetzt shoppen <span aria-hidden="true">↗</span></Link>
   </div>
  </div>
  {open&&<div className="rh-bf-modal-layer" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
   <section role="dialog" aria-modal="true" aria-labelledby="rh-bf-modal-title" aria-describedby="rh-bf-modal-desc"
    className="rh-bf-popup">
    <button className="rh-bf-close" type="button" aria-label="Black Friday Fenster schließen" autoFocus onClick={()=>setOpen(false)}>×</button>
    <div className="rh-bf-popup-top"><img src="/media/RubyHair-WebHeader-Logo-Hell-818376d91.png" alt="Ruby Hair" width="250" height="100"/></div>
    <div className="rh-bf-popup-content">
     <span className="rh-bf-popup-eyebrow">LIMITED BLACK FRIDAY EDITION · 2026</span>
     <h2 id="rh-bf-modal-title">Beautiful hair.<br/><em>Better price.</em></h2>
     <div className="rh-bf-popup-number"><strong>15<span>%</span></strong><div>RABATT<br/>AUTOMATISCH<br/>IM SHOP</div></div>
     <p id="rh-bf-modal-desc">Der Aktionspreis gilt direkt im Shop. Der Code BLACKFRIDAY wird automatisch angewendet. Nur bis 30. November 2026.</p>
     <Link href="/kollektionen/" onClick={()=>setOpen(false)} className="rh-bf-popup-button">KOLLEKTION ENTDECKEN <span aria-hidden="true">↗</span></Link>
     <small>* Nicht kombinierbar mit anderen Aktionscodes. Geschenkgutscheine und Versand ausgenommen.</small>
    </div>
   </section>
  </div>}
 </>;
}
