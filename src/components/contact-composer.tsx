"use client";
import {useState} from "react";
import {ArrowUpRight} from "lucide-react";
const recipient="info@rubyhair.de";
const topics=[
  "Farbberatung",
  "Keratin Bondings",
  "Tape-in Extensions",
  "Frage zu einer Bestellung",
  "Sonstige Frage"
];
export default function ContactComposer(){
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [topic,setTopic]=useState(topics[0]);
  const [order,setOrder]=useState("");
  const [message,setMessage]=useState("");
  const [showHint,setShowHint]=useState(false);
  const subject="Ruby Hair Anfrage – "+topic;
  const body=[
    "Hallo Ruby Hair,",
    "",
    message.trim(),
    "",
    "Name: "+name.trim(),
    "E-Mail: "+email.trim(),
    ...(order.trim()?["Bestellnummer: "+order.trim()]:[])
  ].join("\n");
  const mailto="mailto:"+recipient+"?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body);
  return <form className="rh-contact-composer" onSubmit={event=>{
    event.preventDefault();
    setShowHint(true);
    window.location.href=mailto;
  }}>
    <div className="rh-contact-grid">
      <label>Dein Name <span aria-hidden="true">*</span><input type="text" autoComplete="name" required maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder="Vor- und Nachname"/></label>
      <label>Deine E-Mail <span aria-hidden="true">*</span><input type="email" autoComplete="email" required maxLength={150} value={email} onChange={e=>setEmail(e.target.value)} placeholder="deinname@beispiel.de"/></label>
      <label>Worum geht es? <select value={topic} onChange={e=>setTopic(e.target.value)}>
        {topics.map(t=><option key={t} value={t}>{t}</option>)}</select></label>
      <label>Bestellnummer <span className="rh-optional">(optional)</span><input maxLength={50} value={order} onChange={e=>setOrder(e.target.value)} placeholder="Falls bereits vorhanden"/></label>
      <label className="rh-contact-full">Deine Nachricht <span aria-hidden="true">*</span>
        <textarea value={message} onChange={e=>setMessage(e.target.value)} required minLength={10} maxLength={1600} rows={6} placeholder="Erzähl uns, wie wir dir helfen können ..."/>
      </label>
    </div>
    <p className="rh-contact-explainer">Mit Klick auf den Button öffnet sich dein E-Mail-Programm mit der vorbereiteten Nachricht. Über diese Vorschauseite wird nichts gespeichert oder automatisch versendet.</p>
    <button className="rh-editorial-cta" type="submit">E-MAIL VORBEREITEN <ArrowUpRight size={18}/></button>
    {showHint&&<div role="status" className="rh-contact-hint">Bitte prüfe dein E-Mail-Programm und sende die Nachricht dort ab. Falls sich keine App öffnet, schreibe direkt an <a href={"mailto:"+recipient}>{recipient}</a>.</div>}
  </form>;
}
