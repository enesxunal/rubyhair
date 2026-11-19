"use client";
import {useEffect,useState,type FormEvent} from "react";
import Link from "next/link";
import {ArrowRight,CheckCircle2,Eye,EyeOff,KeyRound,Mail,ShieldCheck} from "lucide-react";

type Mode="register"|"signin";
type Stage="form"|"sent"|"setup"|"loading"|"error";
export default function CustomerLoginPanel(){
 const [mode,setMode]=useState<Mode>("register");
 const [stage,setStage]=useState<Stage>("form");
 const [email,setEmail]=useState("");
 const [token,setToken]=useState("");
 const [firstName,setFirstName]=useState("");
 const [lastName,setLastName]=useState("");
 const [password,setPassword]=useState("");
 const [confirmPassword,setConfirmPassword]=useState("");
 const [showPassword,setShowPassword]=useState(false);
 const [message,setMessage]=useState("");
 const setup=stage==="setup"||(stage==="loading"&&Boolean(token));
 useEffect(()=>{
  const fragment=new URLSearchParams(window.location.hash.replace(/^#/,""));
  const value=fragment.get("token")||"";
  if(/^[a-f0-9]{64}$/.test(value)){
   setToken(value);setStage("setup");
   window.history.replaceState(null,"",window.location.pathname);
  }
 },[]);
 const resetForm=(nextMode:Mode)=>{
  setMode(nextMode);setStage("form");setMessage("");setToken("");setPassword("");setConfirmPassword("");
 };
 const submitEmail=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();setStage("loading");setMessage("");
  try{
   const res=await fetch("/api/konto/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email}),cache:"no-store"});
   if(!res.ok)throw Error("MAIL_REQUEST_FAILED");
   setStage("sent");
  }catch{setStage("error");setMessage("Die E-Mail konnte gerade nicht versendet werden. Bitte versuche es später noch einmal.")}
 };
 const submitPassword=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();setStage("loading");setMessage("");
  try{
   const res=await fetch("/api/konto/password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password}),cache:"no-store"});
   if(!res.ok){setStage("error");setMessage(res.status===401?"E-Mail oder Passwort ist nicht korrekt. Wenn du noch kein Passwort hast, richte dein Konto per E-Mail ein.":"Die Anmeldung ist gerade nicht möglich. Bitte versuche es erneut.");return}
   window.location.replace("/konto/");
  }catch{setStage("error");setMessage("Die Anmeldung ist gerade nicht möglich. Bitte versuche es erneut.")}
 };
 const submitSetup=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();setMessage("");
  if(password.length<10||password.length>128||!/[0-9]/.test(password)){
   setMessage("Bitte wähle ein Passwort mit mindestens 10 Zeichen und einer Zahl.");return;
  }
  if(password!==confirmPassword){setMessage("Die Passwörter stimmen nicht überein.");return}
  setStage("loading");
  try{
   const res=await fetch("/api/konto/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,firstName,lastName,password}),cache:"no-store"});
   if(!res.ok){setMessage(res.status===400?"Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.":"Das Konto konnte gerade nicht eingerichtet werden. Bitte versuche es erneut.");setStage("setup");return}
   window.location.replace("/konto/");
  }catch{setMessage("Das Konto konnte gerade nicht eingerichtet werden. Bitte versuche es erneut.");setStage("setup")}
 };
 return <div className="rh-account-access">
  <div className="rh-eyebrow">RUBY HAIR / MEIN KONTO</div>
  <h1>{setup?"Dein persönlicher Zugang.":"Dein Kundenkonto."}</h1>
  <p>{setup?"Deine E-Mail ist bestätigt. Vervollständige jetzt dein Profil und lege ein sicheres Passwort fest.":"Deine Bestellungen, Rechnungen und Lieferadressen an einem Ort."}</p>
  {setup?<form className="rh-account-access-card" onSubmit={submitSetup}>
    <ShieldCheck size={30} color="#735260"/><h2>Konto einrichten</h2>
    <p>Trage deinen Namen ein und wähle ein persönliches Passwort. Du kannst damit künftig direkt einloggen.</p>
    <div className="rh-account-two-fields">
     <label>Vorname<input required autoComplete="given-name" minLength={2} maxLength={80} value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="Vorname"/></label>
     <label>Nachname<input required autoComplete="family-name" minLength={2} maxLength={80} value={lastName} onChange={e=>setLastName(e.target.value)} placeholder="Nachname"/></label>
    </div>
    <label htmlFor="rh-setup-password">Passwort</label>
    <div className="rh-account-password-field"><input id="rh-setup-password" required type={showPassword?"text":"password"} autoComplete="new-password" minLength={10} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mindestens 10 Zeichen und eine Zahl"/><button type="button" className="rh-account-eye" aria-label={showPassword?"Passwort verbergen":"Passwort anzeigen"} onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>
    <label>Passwort wiederholen<input required type={showPassword?"text":"password"} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Passwort bestätigen"/></label>
    {message&&<p role="alert" className="rh-account-error">{message}</p>}
    <button type="submit" disabled={stage==="loading"}>{stage==="loading"?"Konto wird eingerichtet …":"Konto erstellen & anmelden"}<ArrowRight size={17}/></button>
    <small>Dein Passwort wird verschlüsselt gespeichert. Dieser Bestätigungslink ist nur einmal gültig. Wenn du bereits ein Konto hast, kannst du hier auch dein Passwort neu festlegen.</small>
  </form>:stage==="sent"?<section className="rh-account-access-card" role="status">
    <CheckCircle2 size={32} color="#64866b"/><h2>Bitte Postfach prüfen.</h2>
    <p>Wir haben die Anmeldung vorbereitet. Falls die E-Mail zugestellt wurde, erhältst du einen Link zur Einrichtung deines Profils. Der Link ist 15 Minuten gültig. Prüfe gegebenenfalls auch den Spam-Ordner.</p>
    <button type="button" className="rh-account-secondary" onClick={()=>resetForm("register")}>Andere E-Mail verwenden</button>
  </section>:<section className="rh-account-access-card">
    <div className="rh-account-mode-tabs" role="group" aria-label="Kundenkonto wählen"><button type="button" className={mode==="register"?"active":""} onClick={()=>resetForm("register")}>Konto erstellen</button><button type="button" className={mode==="signin"?"active":""} onClick={()=>resetForm("signin")}>Anmelden</button></div>
    <form onSubmit={mode==="register"?submitEmail:submitPassword}>
     {mode==="register"?<><Mail size={28} color="#735260"/><h2>Mit E-Mail starten.</h2><p>Du erhältst einen sicheren Link. Dort kannst du Namen und Passwort festlegen.</p></>:<><KeyRound size={28} color="#735260"/><h2>Willkommen zurück.</h2><p>Melde dich mit deiner E-Mail und deinem Passwort an.</p></>}
     <label htmlFor="rh-account-email">E-Mail-Adresse</label>
     <input id="rh-account-email" type="email" name="email" autoComplete="email" required maxLength={254} placeholder="name@beispiel.de" value={email} onChange={e=>setEmail(e.target.value)} disabled={stage==="loading"}/>
     {mode==="signin"&&<><label htmlFor="rh-signin-password">Passwort</label><input id="rh-signin-password" type="password" name="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} disabled={stage==="loading"}/></>}
     {stage==="error"&&<p role="alert" className="rh-account-error">{message}</p>}
     <button type="submit" disabled={stage==="loading"}>{stage==="loading"?"Bitte warten …":mode==="signin"?"Anmelden":"Bestätigungslink senden"}<ArrowRight size={17}/></button>
     {mode==="signin"&&<button type="button" className="rh-account-text-button" onClick={()=>resetForm("register")}>Passwort vergessen? Neuen Link anfordern</button>}
     <small>Ein Kundenkonto ist freiwillig. Du kannst bei Ruby Hair weiterhin als Gast einkaufen.</small>
    </form>
   </section>}
  <div className="rh-account-access-bottom"><ShieldCheck size={16}/><span>Deine E-Mail und dein Passwort bleiben geschützt. Zahlungen werden weiterhin ausschließlich über unsere Zahlungsanbieter abgewickelt.</span></div>
  <Link className="rh-account-back" href="/kollektionen/">← Zurück zum Shop</Link>
 </div>;
}
