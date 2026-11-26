"use client";
import {useState} from "react";
import type {CartLine} from "@/components/cart-context";
export default function CartRecoveryForm({lines}:{lines:CartLine[]}){
 const [email,setEmail]=useState(""),[consent,setConsent]=useState(false),[status,setStatus]=useState<"idle"|"busy"|"done"|"error">("idle");
 return <form onSubmit={async e=>{e.preventDefault();if(!consent||status==="busy")return;setStatus("busy");try{const r=await fetch("/api/cart/recovery",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,consent,lines})});setStatus(r.ok?"done":"error")}catch{setStatus("error")}}} style={{marginTop:20,padding:16,border:"1px solid #ded2d5",background:"#fffdfa"}}>
 <strong>Deinen Warenkorb merken</strong><p>Wir erinnern dich auf Wunsch nach 1, 24 und 48 Stunden. Du kannst die Erinnerungen jederzeit beenden.</p>
 {status==="done"?<p role="status">Wenn deine Anfrage angenommen wurde, erhältst du eine Bestätigungs-E-Mail. Ohne Bestätigung senden wir keine Erinnerungen.</p>:<>
 <label>E-Mail<input style={{width:"100%"}} type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label>
 <label style={{display:"flex",alignItems:"flex-start",gap:8,margin:"10px 0"}}><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>Ich möchte bis zu drei E-Mails zu diesem Warenkorb von Ruby Hair erhalten. Die Einwilligung ist freiwillig und widerrufbar.</span></label>
 <button type="submit" className="rh-buy-button" disabled={!consent||status==="busy"}>ERINNERUNG ANFORDERN</button>
 {status==="error"&&<p role="alert">Die Anfrage konnte nicht gesendet werden. Bitte versuche es später.</p>}</>}
 </form>;
}
