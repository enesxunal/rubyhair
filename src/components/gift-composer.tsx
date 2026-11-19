"use client";
import {useState,type FormEvent} from "react";
import {Gift,ArrowRight,Heart,Mail,Download,ShieldCheck} from "lucide-react";
import Link from "next/link";
import {euroGift} from "@/lib/gift-cards/public";
const themes={classic:"Ruby Classic",soft:"Soft Beauty",black:"Black Edition"} as const;
type Theme=keyof typeof themes;
export default function GiftComposer({enabled}:{enabled:boolean}){
 const [preset,setPreset]=useState("100");
 const [custom,setCustom]=useState("75");
 const [theme,setTheme]=useState<Theme>("classic");
 const [recipient,setRecipient]=useState("");
 const [sender,setSender]=useState("");
 const [message,setMessage]=useState("");
 const [buyerEmail,setBuyerEmail]=useState("");
 const [recipientEmail,setRecipientEmail]=useState("");
 const [delivery,setDelivery]=useState<"download"|"email">("download");
 const [accept,setAccept]=useState(false);
 const [pending,setPending]=useState(false),[error,setError]=useState("");
 const amountCents=preset==="custom"?Math.round(Number(custom)*100):Number(preset)*100;
 const validAmount=Number.isSafeInteger(amountCents)&&amountCents>=1000&&amountCents<=50000&&/^(?:\d+)(?:[.,]\d{1,2})?$/.test(preset==="custom"?custom:"100");
 const amountLabel=validAmount?euroGift(amountCents):"– €";
 const pay=async(event:FormEvent)=>{
  event.preventDefault();setError("");
  if(!validAmount){setError("Bitte wähle einen Betrag zwischen 10 und 500 €.");return}
  if(!accept){setError("Bitte bestätige die Gutscheinbedingungen.");return}
  setPending(true);
  try{
   const body={key:crypto.randomUUID(),amountCents,buyerEmail,recipientEmail:delivery==="email"?recipientEmail:undefined,
    recipientName:recipient,senderName:sender||undefined,message:message||undefined,theme,delivery,provider:"paypal"};
   const response=await fetch("/api/gutschein/kaufen",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),cache:"no-store"});
   const payload=await response.json();
   if(!response.ok||!/^https:\/\/www\.paypal\.com\//.test(payload.redirectUrl||""))throw Error("PAYMENT_START_FAILED");
   window.location.assign(payload.redirectUrl);
  }catch{setError("Die Zahlung konnte nicht gestartet werden. Es wurde kein Gutschein ausgestellt. Bitte prüfe vor einem erneuten Versuch deinen PayPal-Status.");setPending(false)}
 };
 return <div className="rh-gift-shop">
  <div className="rh-shell rh-gift-hero"><div className="rh-eyebrow">RUBY HAIR / GESCHENKGUTSCHEIN</div>
   <h1>Beauty is <em>a gift.</em></h1><p>Eine persönliche Aufmerksamkeit für besondere Menschen. Gestalte einen Ruby Hair Geschenkgutschein, versende ihn per E-Mail oder teile ihn als Bild.</p></div>
  <div className="rh-shell rh-gift-builder">
   <form className="rh-gift-form" onSubmit={pay}>
    <div className="rh-gift-section"><span className="rh-gift-step">01 / GUTSCHEINWERT</span><h2>Wie viel Freude darf es sein?</h2>
     <div className="rh-gift-amounts">{["50","100","200","custom"].map(value=><button type="button" className={preset===value?"selected":""} onClick={()=>setPreset(value)} key={value}>{value==="custom"?"Eigener Betrag":value+" €"}</button>)}</div>
     {preset==="custom"&&<label className="rh-gift-field">Dein Wunschbetrag (€)<input type="text" inputMode="decimal" value={custom} onChange={e=>setCustom(e.target.value.replace(",","."))} placeholder="z. B. 75,00"/><small>Zwischen 10 und 500 €</small></label>}
    </div>
    <div className="rh-gift-section"><span className="rh-gift-step">02 / DESIGN</span><h2>Wähle deinen Stil.</h2>
     <div className="rh-gift-theme-grid">{(Object.keys(themes) as Theme[]).map(name=><button key={name} type="button" onClick={()=>setTheme(name)} className={"rh-gift-theme "+name+(theme===name?" selected":"")}><span><img src={name==="soft"?"/media/RubyHair-WebHeader-Logo-Dunkel-70efc2b6a.png":"/media/RubyHair-WebHeader-Logo-Hell-818376d91.png"} alt="" width={478} height={121}/></span><strong>{themes[name]}</strong></button>)}</div>
    </div>
    <div className="rh-gift-section"><span className="rh-gift-step">03 / PERSÖNLICHE WORTE</span><h2>Mach es persönlich.</h2>
     <div className="rh-gift-form-grid"><label className="rh-gift-field">Für wen? *<input value={recipient} onChange={e=>setRecipient(e.target.value)} required minLength={2} maxLength={80} placeholder="Name des Empfängers"/></label>
      <label className="rh-gift-field">Von wem? (optional)<input value={sender} onChange={e=>setSender(e.target.value)} maxLength={80} placeholder="Dein Name"/></label></div>
     <label className="rh-gift-field">Deine persönliche Nachricht (optional)<textarea rows={3} maxLength={180} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Alles Liebe zum Geburtstag …"/><small>{message.length}/180 Zeichen</small></label>
    </div>
    <div className="rh-gift-section"><span className="rh-gift-step">04 / ZUSTELLUNG</span><h2>Wie möchtest du schenken?</h2>
     <div className="rh-gift-delivery"><label className={delivery==="download"?"selected":""}><input type="radio" name="gift-delivery" checked={delivery==="download"} onChange={()=>setDelivery("download")}/><Download size={20}/><span><strong>Selbst verschenken</strong><small>PNG herunterladen und über WhatsApp oder selbst teilen</small></span></label>
      <label className={delivery==="email"?"selected":""}><input type="radio" name="gift-delivery" checked={delivery==="email"} onChange={()=>setDelivery("email")}/><Mail size={20}/><span><strong>Direkt per E-Mail schenken</strong><small>Wir verschicken deine Karte nach erfolgreicher Zahlung</small></span></label></div>
     <label className="rh-gift-field">Deine E-Mail-Adresse *<input type="email" autoComplete="email" required maxLength={254} value={buyerEmail} onChange={e=>setBuyerEmail(e.target.value)} placeholder="deine@email.de"/></label>
     {delivery==="email"&&<label className="rh-gift-field">E-Mail-Adresse des Beschenkten *<input type="email" required maxLength={254} value={recipientEmail} onChange={e=>setRecipientEmail(e.target.value)} placeholder="freundin@email.de"/></label>}
    </div>
    <label className="rh-gift-terms"><input type="checkbox" required checked={accept} onChange={e=>setAccept(e.target.checked)}/><span>Ich akzeptiere die <Link href="/rechtliches/agb/" target="_blank">AGB</Link> und die <Link href="/rechtliches/datenschutz/" target="_blank">Datenschutzhinweise</Link> und die <Link href="/rechtliches/widerruf/" target="_blank">Widerrufsbelehrung</Link>. Mir ist bewusst, dass der Gutscheincode erst nach bestätigter Zahlung aktiviert wird.</span></label>
    <div className="rh-gift-summary"><span>DEIN GESCHENK</span><strong>{amountLabel}</strong><small>Digital · Kein Versand</small></div>
    {error&&<p role="alert" className="rh-gift-form-error">{error}</p>}
    {!enabled&&<p className="rh-gift-soft-notice">Die Geschenkfunktion wird gerade für die sichere Auszahlung und Einlösung geprüft. Du kannst das Kartendesign bereits ansehen; ein Kauf wird noch nicht ausgelöst.</p>}
    <button disabled={!enabled||pending||!validAmount} type="submit" className="rh-gift-buy">{pending?"Weiterleitung zu PayPal …":enabled?"Jetzt zahlungspflichtig bestellen":"Geschenkgutschein – demnächst verfügbar"}<ArrowRight size={20}/></button>
    <p className="rh-gift-secure"><ShieldCheck size={16}/> Nur im Ruby Hair Onlineshop einlösbar · Digitale Lieferung ohne Versandkosten. Der Code wird erst nach bestätigter Zahlung aktiviert.</p>
   </form>
   <aside className="rh-gift-preview-sticky"><div className="rh-gift-step">DEIN GUTSCHEIN / VORSCHAU</div>
    <div className={"rh-gift-card-preview "+theme}><div className="rh-gift-card-border">
      <div className="rh-gift-card-top"><img src={theme==="soft"?"/media/RubyHair-WebHeader-Logo-Dunkel-70efc2b6a.png":"/media/RubyHair-WebHeader-Logo-Hell-818376d91.png"} alt="Ruby Hair Extensions – Original-Logo" width={478} height={121}/><span>DIGITAL GIFT CARD</span></div>
      <div className="rh-gift-card-center"><small>FÜR BESONDERE MOMENTE</small><h3>Geschenkgutschein</h3><div className="rh-gift-card-rule"/><b>{amountLabel}</b></div>
      <div className="rh-gift-card-personal"><div className="rh-gift-card-names"><span>FÜR <strong>{recipient||"Deine Lieblingsperson"}</strong></span>{sender&&<span>VON <strong>{sender}</strong></span>}</div>{message&&<em>„{message}“</em>}</div>
      <div className="rh-gift-card-bottom"><span>RUBYHAIR.DE</span><span>CODE NACH ZAHLUNG</span></div></div></div>
    <p><Heart size={16}/> Persönlich gestaltet. Hochwertig als Bild. Der echte Code erscheint ausschließlich nach Bezahlung.</p>
    <div className="rh-gift-confidence"><Gift size={17}/> Digitales Geschenk, direkt aus dem Ruby Hair Shop.</div>
   </aside>
  </div>
 </div>;
}
