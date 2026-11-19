"use client";
import {useState} from "react";
export default function CustomerLogoutButton(){
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState(false);
 return <><button className="rh-account-logout" type="button" disabled={busy} onClick={async()=>{
  setBusy(true);setError(false);
  try{
   const r=await fetch("/api/konto/logout",{method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store"});
   if(!r.ok)throw Error("logout failed");
   window.location.replace("/konto/anmelden/");
  }catch{setError(true);setBusy(false)}
 }}>{busy?"Abmeldung …":"Abmelden"}</button>{error&&<p role="alert">Abmeldung fehlgeschlagen. Bitte erneut versuchen.</p>}</>;
}
