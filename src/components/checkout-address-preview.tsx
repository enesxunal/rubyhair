"use client";
import {useState,type FormEvent} from "react";
import {CheckCircle2,ShieldCheck} from "lucide-react";

/** UX-only address entry. No network request, storage or real order submission. */
export default function CheckoutAddressPreview(){
 const [otherBilling,setOtherBilling]=useState(false);
 const [checked,setChecked]=useState(false);
 const validate=(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  setChecked(true);
 };
 return <section className="rh-checkout-address" aria-label="Liefer- und Rechnungsadresse vorbereiten">
  <div className="rh-checkout-address-heading"><span>02 / LIEFERUNG</span><h2>Deine Lieferadresse.</h2>
   <p>Alle Felder werden nur in deinem Browser geprüft. Die Vorschau sendet oder speichert keine persönlichen Daten.</p></div>
  <form onSubmit={validate} onChange={()=>setChecked(false)}>
   <div className="rh-checkout-field-grid">
    <label>Vorname <input required autoComplete="given-name" name="givenName" maxLength={80} placeholder="Vorname"/></label>
    <label>Nachname <input required autoComplete="family-name" name="familyName" maxLength={80} placeholder="Nachname"/></label>
    <label className="rh-checkout-field-full">E-Mail <input required autoComplete="email" type="email" name="email" maxLength={254} placeholder="name@beispiel.de"/></label>
    <label className="rh-checkout-field-full">Straße und Hausnummer <input required autoComplete="street-address" name="street" maxLength={160} placeholder="Straße und Hausnummer"/></label>
    <label>Postleitzahl <input required name="zip" inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{5}" title="Bitte eine fünfstellige deutsche Postleitzahl eingeben" maxLength={5} placeholder="45130"/></label>
    <label>Ort <input required autoComplete="address-level2" name="city" maxLength={100} placeholder="Essen"/></label>
    <label className="rh-checkout-field-full">Lieferland <input disabled readOnly value="Deutschland" aria-label="Lieferland: Deutschland"/></label>
   </div>
   <label className="rh-checkout-check"><input type="checkbox" checked={otherBilling} onChange={e=>setOtherBilling(e.target.checked)}/> Rechnungsadresse weicht ab</label>
   {otherBilling&&<fieldset className="rh-checkout-extra-address"><legend>Rechnungsadresse</legend><div className="rh-checkout-field-grid">
     <label>Vorname <input required name="billingFirst" autoComplete="billing given-name" maxLength={80}/></label>
     <label>Nachname <input required name="billingLast" autoComplete="billing family-name" maxLength={80}/></label>
     <label className="rh-checkout-field-full">Straße und Hausnummer <input required name="billingStreet" autoComplete="billing street-address" maxLength={160}/></label>
     <label>Postleitzahl <input required name="billingZip" pattern="[0-9]{5}" maxLength={5} inputMode="numeric"/></label>
     <label>Ort <input required name="billingCity" maxLength={100}/></label>
   </div></fieldset>}
   <button type="submit" className="rh-checkout-validate">Adressen prüfen <CheckCircle2 size={16}/></button>
   {checked&&<p role="status" className="rh-checkout-address-ok"><CheckCircle2 size={17}/> Formulareingaben gültig. Es wurde keine Bestellung angelegt und kein Datenversand durchgeführt.</p>}
  </form>
  <p className="rh-checkout-private"><ShieldCheck size={16}/> Persönliche Daten werden hier weder versendet noch dauerhaft gespeichert. Die echte Bestellannahme bleibt gesperrt.</p>
 </section>;
}
