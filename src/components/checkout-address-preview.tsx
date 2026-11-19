"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import type {CustomerCheckoutInput} from "@/lib/customer-checkout";
import {CheckCircle2,ShieldCheck} from "lucide-react";

export type CheckoutAddressData={shipping:CustomerCheckoutInput["shipping"];billing?:CustomerCheckoutInput["billing"];email:string};
/** Validation is local; a purchase sends data only on explicit confirmation. */
export default function CheckoutAddressPreview({onValidated}:{onValidated?:(data:CheckoutAddressData|null)=>void}){
 const [otherBilling,setOtherBilling]=useState(false);
 const formRef=useRef<HTMLFormElement>(null);
 const [savedAddresses,setSavedAddresses]=useState<{id:string;label:string;firstName:string;lastName:string;street:string;postalCode:string;city:string}[]>([]);
 const [savedEmail,setSavedEmail]=useState("");
 useEffect(()=>{
  let active=true;
  fetch("/api/konto/adressen",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(data=>{
   if(!active||!data)return;
   setSavedAddresses(data.addresses||[]);setSavedEmail(data.email||"");
  }).catch(()=>{});
  return()=>{active=false};
 },[]);
 const applySavedAddress=(id:string)=>{
  const address=savedAddresses.find(a=>a.id===id);
  if(!address||!formRef.current)return;
  const fields:Record<string,string>={givenName:address.firstName,familyName:address.lastName,street:address.street,zip:address.postalCode,city:address.city,email:savedEmail};
  for(const [name,value] of Object.entries(fields)){
   const input=formRef.current.elements.namedItem(name);
   if(input instanceof HTMLInputElement)input.value=value;
  }
  setChecked(false);onValidated?.(null);
 };
 const [checked,setChecked]=useState(false);
 const validate=(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  const data=new FormData(event.currentTarget);
  const shipping={firstName:String(data.get("givenName")||""),lastName:String(data.get("familyName")||""),
   street:String(data.get("street")||""),postalCode:String(data.get("zip")||""),city:String(data.get("city")||""),country:"DE" as const};
  const billing=otherBilling?{firstName:String(data.get("billingFirst")||""),lastName:String(data.get("billingLast")||""),
   street:String(data.get("billingStreet")||""),postalCode:String(data.get("billingZip")||""),city:String(data.get("billingCity")||""),country:"DE" as const}:undefined;
  setChecked(true);
  onValidated?.({shipping,billing,email:String(data.get("email")||"")});
 };
 return <section className="rh-checkout-address" aria-label="Liefer- und Rechnungsadresse vorbereiten">
  <div className="rh-checkout-address-heading"><span>02 / LIEFERUNG</span><h2>Deine Lieferadresse.</h2>
   <p>Trage deine Lieferadresse und bei Bedarf eine abweichende Rechnungsadresse ein.</p></div>
  {savedAddresses.length>0&&<div className="rh-checkout-saved-address"><label htmlFor="rh-checkout-saved-address">Gespeicherte Lieferadresse verwenden</label>
   <select id="rh-checkout-saved-address" defaultValue="" onChange={e=>applySavedAddress(e.target.value)}>
    <option value="">Adresse auswählen …</option>
    {savedAddresses.map(a=><option key={a.id} value={a.id}>{a.label} – {a.street}, {a.postalCode} {a.city}</option>)}
   </select>
  </div>}
  <form ref={formRef} onSubmit={validate} onChange={()=>{setChecked(false);onValidated?.(null)}}>
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
   {checked&&<p role="status" className="rh-checkout-address-ok"><CheckCircle2 size={17}/> Deine Angaben sind vollständig. Noch keine Bestellung ausgelöst.</p>}
  </form>
  <p className="rh-checkout-private"><ShieldCheck size={16}/> Deine Adresse bleibt auf diesem Gerät, bis du eine Bestellung ausdrücklich bestätigst.</p>
 </section>;
}
