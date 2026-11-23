"use client";
import {useState} from "react";

type CardEligibility="idle"|"checking"|"eligible"|"unavailable"|"error";
type EligibilityMethods={isEligible(method:string):boolean};
type PaypalV6={createInstance(options:{clientId:string;components:string[];locale:string;pageType:string}):Promise<{
 findEligibleMethods(options:{countryCode:string;currencyCode:string;amount:string}):Promise<EligibilityMethods>;
}>};
const sdkSrc="https://www.paypal.com/web-sdk/v6/core";
const loadSdk=async():Promise<PaypalV6>=>{
 const w=window as Window&{paypal?:PaypalV6};
 if(w.paypal?.createInstance)return w.paypal;
 await new Promise<void>((resolve,reject)=>{
  const existing=document.querySelector<HTMLScriptElement>(`script[src="${sdkSrc}"]`);
  const script=existing||document.createElement("script");
  script.addEventListener("load",()=>resolve(),{once:true});
  script.addEventListener("error",()=>reject(new Error("PAYPAL_SDK_UNAVAILABLE")),{once:true});
  if(!existing){script.src=sdkSrc;script.async=true;document.head.appendChild(script)}
 });
 if(!w.paypal?.createInstance)throw new Error("PAYPAL_SDK_NOT_READY");
 return w.paypal;
};
/** Admin-only, read-only merchant eligibility probe. NEVER creates orders or payments. */
export default function PayPalCardEligibilityCheck({clientId}:{clientId:string|null}){
 const [state,setState]=useState<CardEligibility>("idle");
 const [message,setMessage]=useState("");
 const check=async()=>{
  if(!clientId||state==="checking")return;
  setState("checking");setMessage("");
  try{
   const sdk=await loadSdk();
   const instance=await sdk.createInstance({clientId,components:["card-fields"],locale:"de-DE",pageType:"checkout"});
   const methods=await instance.findEligibleMethods({countryCode:"DE",currencyCode:"EUR",amount:"100.00"});
   setState(methods.isEligible("advanced_cards")?"eligible":"unavailable");
  }catch(e){
   setState("error");
   const reason=e instanceof Error?e.message:"UNKNOWN";
   // Do not output credentials, browser tokens, or provider payloads.
   setMessage(/^PAYPAL_SDK_[A-Z_]+$/.test(reason)?reason:"ELIGIBILITY_CHECK_UNAVAILABLE");
  }
 };
 return <section aria-label="Karten-Zahlung PayPal Eignungsprüfung" style={{background:"#f6f0f3",padding:20,border:"1px solid #ccb9c4",borderRadius:10,marginTop:22}}>
  <h2 style={{fontSize:19,margin:"0 0 8px"}}>Kredit- / Debitkarte · PayPal Advanced</h2>
  <p>Prüft ausschließlich, ob PayPal Card Fields für ein Beispiel in Deutschland (EUR, 100 €) verfügbar meldet. Keine Bestellung, keine Zahlung, keine Speicherung von Kartendaten.</p>
  <button type="button" onClick={check} disabled={!clientId||state==="checking"} style={{border:0,padding:"12px 16px",background:"#583a47",color:"#fff",borderRadius:6,cursor:"pointer"}}>
   {state==="checking"?"Prüfung läuft …":"Kartenakzeptanz prüfen"}
  </button>
  <p role="status" data-paypal-card-eligibility={state} aria-live="polite" style={{marginTop:14,fontWeight:600}}>
   {!clientId?"Kein öffentliches PayPal Client-ID für den Live-Account verfügbar.":
   state==="eligible"?"Geeignet für diesen Testkontext – Integration und Testzahlung noch erforderlich.":
   state==="unavailable"?"PayPal meldet Advanced Cards für diesen Testkontext NICHT verfügbar. Kartenoption nicht anbieten.":
   state==="error"?"PayPal-Kartenprüfung konnte nicht abgeschlossen werden. "+message:
   state==="checking"?"PayPal-Eignung wird abgefragt …":"Noch nicht geprüft."}
  </p>
  <small>Ergebnis gilt nur für diese Prüfparameter. PayPal und Klarna bleiben im Shop unverändert.</small>
 </section>;
}
