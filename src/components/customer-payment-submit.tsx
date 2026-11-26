"use client";
import {useRef,useState} from "react";
import type {CartLine} from "@/components/cart-context";
import type {GiftCartItem} from "@/lib/gift-cards/cart-schema";
import type {CheckoutAddressData} from "./checkout-address-preview";

type Props={agreed:boolean;claimPayment:()=>boolean;releasePayment:()=>void;method:"paypal"|"klarna";lines:CartLine[];gifts?:GiftCartItem[];address:CheckoutAddressData|null;cartReady:boolean;totalCents:number;giftCode?:string;couponCode?:string};
export default function CustomerPaymentSubmit({agreed,claimPayment,releasePayment,method,lines,gifts=[],address,cartReady,totalCents,giftCode,couponCode}:Props){
 const [loading,setLoading]=useState(false),[error,setError]=useState("");
 const key=useRef<string|null>(null);
 const ready=Boolean(address&&cartReady&&(lines.length||gifts.length)&&totalCents>=0&&!loading&&agreed&&(method==="paypal"||!giftCode)&&(!gifts.length||method==="paypal"));
 const start=async()=>{
  if(!ready||!address)return;
  if(!claimPayment()){setError("ZAHLUNG_BEREITS_GESTARTET");return}
  setLoading(true);setError("");
  if(!key.current)key.current=crypto.randomUUID();
  try{
   const res=await fetch("/api/checkout",{method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json"},body:JSON.stringify({
     key:key.current,provider:method,lines,gifts,shipping:address.shipping,
     billing:address.billing,email:address.email,giftCode,couponCode,consent:true
    })});
   const payload=await res.json() as {redirectUrl?:string;orderId?:string;error?:string;retrySafe?:boolean};
   if(!res.ok&&payload.retrySafe===true){key.current=null;releasePayment();setLoading(false);setError("Bitte Angaben oder Warenkorb prüfen und erneut versuchen.");return}
   if(!res.ok||!payload.redirectUrl)throw new Error(payload.error||"CHECKOUT_FAILED");
   const target=new URL(payload.redirectUrl);
   const giftPaid=target.origin===window.location.origin&&target.pathname==="/kasse/gutschein/erfolg"&&totalCents===0;
   if(!giftPaid&&(target.protocol!=="https:"||!
    ["www.paypal.com","pay.klarna.com","www.pay.klarna.com"].includes(target.hostname)))throw new Error("UNTRUSTED_PAYMENT_REDIRECT");
   if(payload.orderId&&/^[0-9a-f-]{36}$/i.test(payload.orderId)){
    try{sessionStorage.setItem("rubyhair-checkout-purchased:"+payload.orderId,
     JSON.stringify({lines,giftIds:gifts.map(x=>x.id)}))}catch{/* Checkout must not be blocked by browser storage restrictions. */}
   }
   window.location.assign(target.toString());
  }catch(e){
   setError(e instanceof Error?e.message:"CHECKOUT_FAILED");setLoading(false);
   // Keep the same idempotency key after an ambiguous response: never charge twice.
  }
 };
 return <div className="rh-payment-action-area rh-direct-payment-action" aria-live="polite">
  {address&&!cartReady&&<p className="rh-checkout-unavailable-note" role="alert">Die Preis- oder Bestandsprüfung ist noch nicht abgeschlossen oder meldet ein Problem. Prüfe die Bestellübersicht und entferne gegebenenfalls einen ungültigen Rabattcode im Warenkorb.</p>}
  {error&&<p role="alert" style={{color:"#a13c50"}}>Bestellung konnte nicht gestartet werden ({error}). Bitte nicht erneut versuchen, bis der Vorgang geprüft ist.</p>}
  <button type="button" className={"rh-payment-primary-link"+(totalCents>0?(method==="paypal"?" rh-paypal-branded-button":" rh-klarna-branded-button"):"")} disabled={!ready} aria-label={totalCents===0?"Gutschein einlösen":`${(totalCents/100).toFixed(2)} EUR zahlungspflichtig mit ${method==="paypal"?"PayPal":"Klarna"} bestellen`} onClick={start}
   style={{border:0,cursor:ready?"pointer":"not-allowed",opacity:ready?1:.48,width:"100%",fontSize:14}}>
   {loading?"…":totalCents===0?"Gutschein einlösen":`${(totalCents/100).toFixed(2).replace(".",",")} € zahlungspflichtig mit ${method==="paypal"?"PayPal":"Klarna"} bestellen`}
  </button>
 </div>;
}
