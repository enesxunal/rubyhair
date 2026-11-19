"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowRight,CheckCircle2,Mail,ShieldCheck} from "lucide-react";

type Status="form"|"sent"|"verify"|"loading"|"error";
export default function CustomerLoginPanel(){
 const [status,setStatus]=useState<Status>("form");
 const [email,setEmail]=useState("");
 const [token,setToken]=useState("");
 const [message,setMessage]=useState("");
 useEffect(()=>{
  const fragment=new URLSearchParams(window.location.hash.replace(/^#/,""));
  const value=fragment.get("token")||"";
  if(/^[a-f0-9]{64}$/.test(value)){
   setToken(value);setStatus("verify");
   // Reduce accidental forwarding from browser history while keeping the token in component state.
   window.history.replaceState(null,"",window.location.pathname);
  }
 },[]);
 const submitEmail=async(e:React.FormEvent)=>{
  e.preventDefault();setStatus("loading");setMessage("");
  try{
   const res=await fetch("/api/konto/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email}),cache:"no-store"});
   if(!res.ok)throw Error("Bitte versuche es später erneut.");
   setStatus("sent");
  }catch{setStatus("error");setMessage("Der Login-Link konnte gerade nicht angefordert werden. Bitte versuche es später erneut.")}
 };
 const verify=async()=>{
  setStatus("loading");setMessage("");
  try{
   const res=await fetch("/api/konto/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token}),cache:"no-store"});
   if(!res.ok)throw Error("Link ungültig");
   window.location.replace("/konto/");
  }catch{setStatus("error");setToken("");setMessage("Dieser Link ist nicht mehr gültig. Fordere bitte einen neuen Login-Link an.")}
 };
 return <div className="rh-account-access">
  <div className="rh-eyebrow">RUBY HAIR / MEIN KONTO</div>
  <h1>Dein Kundenkonto.</h1>
  <p>Deine Bestellungen, Rechnungen und Sendungen an einem Ort. Sicher anmelden – ganz ohne Passwort.</p>
  {status==="verify"?<section className="rh-account-access-card" aria-live="polite">
    <ShieldCheck size={32} color="#735260"/><h2>Anmeldung bestätigen</h2>
    <p>Klicke auf „Sicher anmelden“, um deinen persönlichen Zugang freizuschalten. Diesen Link kannst nur du einmal verwenden.</p>
    <button type="button" onClick={verify}>Sicher anmelden <ArrowRight size={17}/></button>
  </section>:status==="sent"?<section className="rh-account-access-card" role="status">
    <CheckCircle2 size={32} color="#64866b"/><h2>Bitte Postfach prüfen.</h2>
    <p>Wenn wir die E-Mail zustellen konnten, findest du dort deinen Anmeldelink. Er ist 15 Minuten gültig. Sieh gegebenenfalls auch im Spam-Ordner nach.</p>
    <button type="button" className="rh-account-secondary" onClick={()=>{setStatus("form");setEmail("")}}>Andere E-Mail verwenden</button>
  </section>:<form className="rh-account-access-card" onSubmit={submitEmail}>
    <Mail size={28} color="#735260"/><h2>Einloggen oder Konto erstellen</h2>
    <label htmlFor="rh-account-email">Deine E-Mail-Adresse</label>
    <input id="rh-account-email" type="email" name="email" autoComplete="email" required maxLength={254} placeholder="name@beispiel.de" value={email} onChange={e=>setEmail(e.target.value)} disabled={status==="loading"}/>
    {status==="error"&&<p role="alert" className="rh-account-error">{message}</p>}
    <button type="submit" disabled={status==="loading"}>{status==="loading"?"Login-Link wird versendet …":"Login-Link senden"} <ArrowRight size={17}/></button>
    <small>Ein Konto ist freiwillig. Du kannst weiterhin als Gast bestellen. Mit deiner Anmeldung erhältst du Zugriff auf Bestellungen, die an diese bestätigte E-Mail-Adresse gesendet wurden.</small>
  </form>}
  <div className="rh-account-access-bottom"><ShieldCheck size={16}/><span>Dein Zugang ist nur für dich. Wir fragen nie nach deinem Passwort oder deinen Zahlungsdaten.</span></div>
  <Link className="rh-account-back" href="/kollektionen/">← Zurück zum Shop</Link>
 </div>;
}
