"use client";
import {useRef,useState} from "react";
import type {CartLine} from "@/components/cart-context";
import type {CheckoutAddressData} from "./checkout-address-preview";

type Props={method:"paypal"|"klarna";lines:CartLine[];address:CheckoutAddressData|null;cartReady:boolean;totalCents:number};
export default function CustomerPaymentSubmit({method,lines,address,cartReady,totalCents}:Props){
 const [loading,setLoading]=useState(false),[error,setError]=useState("");
 const [agreed,setAgreed]=useState(false);
 const key=useRef<string|null>(null);
 const ready=Boolean(address&&cartReady&&lines.length&&totalCents>=100&&!loading&&agreed);
 const start=async()=>{
  if(!ready||!address)return;
  setLoading(true);setError("");
  if(!key.current)key.current=crypto.randomUUID();
  try{
   const res=await fetch("/api/checkout",{method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json"},body:JSON.stringify({
     key:key.current,provider:method,lines,shipping:address.shipping,
     billing:address.billing,email:address.email,consent:true
    })});
   const payload=await res.json() as {redirectUrl?:string;error?:string};
   if(!res.ok||!payload.redirectUrl)throw new Error(payload.error||"CHECKOUT_FAILED");
   const target=new URL(payload.redirectUrl);
   if(target.protocol!=="https:"||!
    ["www.paypal.com","pay.klarna.com","www.pay.klarna.com"].includes(target.hostname))throw new Error("UNTRUSTED_PAYMENT_REDIRECT");
   window.location.assign(target.toString());
  }catch(e){
   setError(e instanceof Error?e.message:"CHECKOUT_FAILED");setLoading(false);
   // Keep the same idempotency key after an ambiguous response: never charge twice.
  }
 };
 return <div className="rh-payment-action-area" aria-live="polite">
  <p>Versand innerhalb Deutschlands. Enthaltene 19 % Umsatzsteuer. Keine Zahlung ohne deine ausdrückliche Bestätigung beim Zahlungsanbieter.</p>
  {!address&&<p>Bitte zuerst oben deine Liefer- und Rechnungsadresse mit „Adressen prüfen“ bestätigen.</p>}
  <label style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:16,fontSize:12,lineHeight:1.7}}>
   <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} required/>
   Ich habe die <a href="/agb/" target="_blank" rel="noopener noreferrer">AGB</a> und die
   <a href="/widerrufsbelehrung/" target="_blank" rel="noopener noreferrer"> Widerrufsbelehrung</a> gelesen und bestätige den kostenpflichtigen Kauf.
  </label>
  {error&&<p role="alert" style={{color:"#a13c50"}}>Bestellung konnte nicht gestartet werden ({error}). Bitte nicht erneut versuchen, bis der Vorgang geprüft ist.</p>}
  <button type="button" className="rh-payment-primary-link" disabled={!ready} onClick={start}
   style={{border:0,cursor:ready?"pointer":"not-allowed",opacity:ready?1:.48,width:"100%",fontSize:14}}>
   {loading?"Zahlung wird sicher vorbereitet …":`${(totalCents/100).toFixed(2).replace(".",",")} € zahlungspflichtig mit ${method==="paypal"?"PayPal":"Klarna"} bestellen`}
  </button>
 </div>;
}
