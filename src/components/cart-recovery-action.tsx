"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {useCart,type CartLine} from "@/components/cart-context";
export default function CartRecoveryAction(){
 const [token,setToken]=useState(""),[action,setAction]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false),[restored,setRestored]=useState(false);
 const cart=useCart(),initialized=useRef(false);
 useEffect(()=>{if(initialized.current)return;initialized.current=true;const q=new URLSearchParams(location.hash.slice(1));setToken(q.get("token")||"");setAction(q.get("action")||"");history.replaceState(null,"",location.pathname)},[]);
 const valid=["confirm","unsubscribe","restore"].includes(action)&&/^[0-9a-f-]{36}\.[0-9a-f]{64}$/i.test(token);
 return <section className="rh-shell" style={{padding:"65px 20px",maxWidth:700}}><h1>Dein Ruby Hair Warenkorb</h1>
 {!valid?<p>Dieser Link ist ungültig oder abgelaufen.</p>:!message?<><p>{action==="confirm"?"Bestätige deine freiwillige Anfrage für bis zu drei Erinnerungen.":action==="unsubscribe"?"Beende die Erinnerungen für diesen Warenkorb.":"Füge deine gespeicherten Artikel zu deinem aktuellen Warenkorb hinzu. Preise und Lagerbestand werden neu geprüft."}</p>
 <button type="button" className="rh-buy-button" disabled={busy||!cart.loaded} onClick={async()=>{setBusy(true);try{const r=await fetch("/api/cart/recovery",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,action})});const data=await r.json();if(!r.ok)throw Error("EXPIRED");if(action==="restore"&&Array.isArray(data.lines)){for(const line of data.lines as CartLine[]){if(!cart.lines.some(x=>x.id===line.id))cart.add(line.id,line.quantity)}setRestored(true)}setMessage(action==="unsubscribe"?"Die Erinnerungen wurden beendet.":action==="confirm"?"Deine Erinnerung wurde bestätigt.":"Dein Warenkorb wurde aktualisiert.")}catch{setMessage("Dieser Link konnte nicht verwendet werden. Bitte kontaktiere Ruby Hair.")}finally{setBusy(false)}}}>{action==="confirm"?"BESTÄTIGEN":action==="unsubscribe"?"ERINNERUNGEN BEENDEN":"WARENKORB WIEDERHERSTELLEN"}</button></>:<p role="status">{message}</p>}
 <p><Link href={restored?"/warenkorb/":"/kollektionen/"}>{restored?"Zum Warenkorb":"Weiter einkaufen"}</Link></p></section>;
}
