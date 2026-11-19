"use client";
import {useEffect,useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {MapPin,Pencil,Plus,Trash2,CheckCircle2} from "lucide-react";

type Address={id:string;label:string;firstName:string;lastName:string;street:string;postalCode:string;city:string;country:string;isDefault:boolean};
type AddressForm={label:string;firstName:string;lastName:string;street:string;postalCode:string;city:string;country:"DE";isDefault:boolean};
const blank=(firstName:string,lastName:string):AddressForm=>({label:"Zuhause",firstName,lastName,street:"",postalCode:"",city:"",country:"DE",isDefault:false});
export default function CustomerAccountSettings({firstName,lastName,email}:{firstName:string;lastName:string;email:string}){
 const router=useRouter();
 const [names,setNames]=useState({firstName,lastName});
 const [saved,setSaved]=useState(false),[nameError,setNameError]=useState("");
 const [addresses,setAddresses]=useState<Address[]>([]);
 const [loading,setLoading]=useState(true);
 const [editing,setEditing]=useState<string|null>(null);
 const [form,setForm]=useState<AddressForm|null>(null);
 const [busy,setBusy]=useState(false),[addressError,setAddressError]=useState("");
 const reload=async()=>{
  const response=await fetch("/api/konto/adressen",{cache:"no-store"});
  if(!response.ok)throw Error("ADDRESSES_UNAVAILABLE");
  const payload=await response.json();setAddresses(payload.addresses||[]);
 };
 useEffect(()=>{let current=true;fetch("/api/konto/adressen",{cache:"no-store"}).then(r=>r.ok?r.json():Promise.reject()).then(r=>{if(current)setAddresses(r.addresses||[])}).catch(()=>{if(current)setAddressError("Die Adressen konnten nicht geladen werden.")}).finally(()=>{if(current)setLoading(false)});return()=>{current=false}},[]);
 const saveNames=async(e:FormEvent)=>{
  e.preventDefault();setSaved(false);setNameError("");
  try{const r=await fetch("/api/konto/profile",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(names)});if(!r.ok)throw Error();setSaved(true);router.refresh()}
  catch{setNameError("Das Profil konnte nicht gespeichert werden.")}
 };
 const startNew=()=>{setEditing("new");setAddressError("");setForm(blank(names.firstName,names.lastName))};
 const startEdit=(address:Address)=>{setEditing(address.id);setAddressError("");setForm({...address,country:"DE"})};
 const updateField=(key:keyof AddressForm,value:string|boolean)=>setForm(v=>v?{...v,[key]:value}:v);
 const saveAddress=async(e:FormEvent)=>{
  e.preventDefault();if(!form)return;
  setBusy(true);setAddressError("");
  try{
   const isNew=editing==="new";
   const r=await fetch("/api/konto/adressen",{method:isNew?"POST":"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,...(!isNew?{id:editing}:{})})});
   if(!r.ok)throw Error();
   await reload();setForm(null);setEditing(null);
  }catch{setAddressError("Die Adresse konnte nicht gespeichert werden. Bitte versuche es erneut.")}
  finally{setBusy(false)}
 };
 const deleteAddress=async(id:string)=>{
  if(!window.confirm("Diese Lieferadresse wirklich löschen?"))return;
  setBusy(true);setAddressError("");
  try{const r=await fetch("/api/konto/adressen",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});if(!r.ok)throw Error();await reload()}
  catch{setAddressError("Die Adresse konnte nicht gelöscht werden.")}
  finally{setBusy(false)}
 };
 return <section className="rh-account-profile-management">
  <div className="rh-account-heading"><h2>Mein Profil</h2><span>Persönliche Angaben und gespeicherte Adressen</span></div>
  <form className="rh-account-profile-card" onSubmit={saveNames}>
   <div className="rh-eyebrow">PERSÖNLICHE ANGABEN</div>
   <div className="rh-account-two-fields"><label>Vorname<input value={names.firstName} onChange={e=>setNames({...names,firstName:e.target.value})} required minLength={2} maxLength={80} autoComplete="given-name"/></label><label>Nachname<input value={names.lastName} onChange={e=>setNames({...names,lastName:e.target.value})} required minLength={2} maxLength={80} autoComplete="family-name"/></label></div>
   <label>E-Mail-Adresse <input value={email} disabled readOnly type="email"/></label>
   {nameError&&<p role="alert" className="rh-account-error">{nameError}</p>}
   {saved&&<p role="status" className="rh-account-success"><CheckCircle2 size={16}/> Profil aktualisiert</p>}
   <button type="submit" className="rh-account-save">Änderungen speichern</button>
  </form>
  <div className="rh-account-heading rh-account-address-header"><h2>Meine Lieferadressen</h2>{addresses.length<5&&!editing&&<button type="button" onClick={startNew}><Plus size={15}/> Adresse hinzufügen</button>}</div>
  <p className="rh-account-address-intro">Speichere bis zu fünf Lieferadressen. Deine vergangenen Bestellungen werden dadurch nicht verändert.</p>
  {loading&&<p>Adressen werden geladen …</p>}
  {!loading&&addresses.length===0&&!editing&&<div className="rh-account-empty-address"><MapPin size={24}/><p>Du hast noch keine Lieferadresse gespeichert.</p><button type="button" onClick={startNew}>Erste Adresse speichern</button></div>}
  <div className="rh-account-address-grid">{addresses.map(a=><article className="rh-account-saved-address" key={a.id}>
    <div className="rh-account-address-title"><strong>{a.label}</strong>{a.isDefault&&<span>Standard</span>}</div>
    <p>{a.firstName} {a.lastName}<br/>{a.street}<br/>{a.postalCode} {a.city}<br/>Deutschland</p>
    <div className="rh-account-address-actions"><button type="button" onClick={()=>startEdit(a)} disabled={busy}><Pencil size={14}/> Bearbeiten</button><button type="button" onClick={()=>deleteAddress(a.id)} disabled={busy}><Trash2 size={14}/> Löschen</button></div>
   </article>)}</div>
  {form&&<form className="rh-account-address-form" onSubmit={saveAddress}>
   <h3>{editing==="new"?"Neue Lieferadresse":"Lieferadresse bearbeiten"}</h3>
   <label>Bezeichnung<input maxLength={40} required value={form.label} onChange={e=>updateField("label",e.target.value)} placeholder="Zuhause, Büro …"/></label>
   <div className="rh-account-two-fields"><label>Vorname<input required minLength={2} maxLength={80} value={form.firstName} onChange={e=>updateField("firstName",e.target.value)}/></label><label>Nachname<input required minLength={2} maxLength={80} value={form.lastName} onChange={e=>updateField("lastName",e.target.value)}/></label></div>
   <label>Straße und Hausnummer<input required minLength={4} maxLength={160} autoComplete="shipping street-address" value={form.street} onChange={e=>updateField("street",e.target.value)}/></label>
   <div className="rh-account-two-fields"><label>Postleitzahl<input required maxLength={5} pattern="[0-9]{5}" inputMode="numeric" autoComplete="shipping postal-code" value={form.postalCode} onChange={e=>updateField("postalCode",e.target.value)}/></label><label>Ort<input required minLength={2} maxLength={100} autoComplete="shipping address-level2" value={form.city} onChange={e=>updateField("city",e.target.value)}/></label></div>
   <label>Land <input disabled readOnly value="Deutschland"/></label>
   <label className="rh-account-check"><input type="checkbox" checked={form.isDefault} onChange={e=>updateField("isDefault",e.target.checked)}/> Als Standard-Lieferadresse verwenden</label>
   {addressError&&<p role="alert" className="rh-account-error">{addressError}</p>}
   <div className="rh-account-address-form-actions"><button type="submit" disabled={busy}>{busy?"Wird gespeichert …":"Adresse speichern"}</button><button type="button" className="secondary" disabled={busy} onClick={()=>{setForm(null);setEditing(null);setAddressError("")}}>Abbrechen</button></div>
  </form>}
  {!form&&addressError&&<p role="alert" className="rh-account-error">{addressError}</p>}
 </section>;
}
