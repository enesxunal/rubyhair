"use client";
import {useRef,useState} from "react";
import type {CartLine} from "@/components/cart-context";
import type {GiftCartItem} from "@/lib/gift-cards/cart-schema";
import type {CheckoutAddressData} from "./checkout-address-preview";

type Props={method:"paypal"|"klarna";lines:CartLine[];gifts?:GiftCartItem[];address:CheckoutAddressData|null;cartReady:boolean;totalCents:number;giftCode?:string};
export default function CustomerPaymentSubmit({method,lines,gifts=[],address,cartReady,totalCents,giftCode}:Props){
 const [loading,setLoading]=useState(false),[error,setError]=useState("");
 const [agreed,setAgreed]=useState(false);
 const key=useRef<string|null>(null);
 const ready=Boolean(address&&cartReady&&(lines.length||gifts.length)&&totalCents>=0&&!loading&&agreed&&(method==="paypal"||!giftCode)&&(!gifts.length||method==="paypal"));
 const start=async()=>{
  if(!ready||!address)return;
  setLoading(true);setError("");
  if(!key.current)key.current=crypto.randomUUID();
  try{
   const res=await fetch("/api/checkout",{method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json"},body:JSON.stringify({
     key:key.current,provider:method,lines,gifts,shipping:address.shipping,
     billing:address.billing,email:address.email,giftCode,consent:true
    })});
   const payload=await res.json() as {redirectUrl?:string;orderId?:string;error?:string};
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
 return <div className="rh-payment-action-area" aria-live="polite">
  <p>{lines.length?"DHL-Versand innerhalb Deutschlands.":"Digitaler Gutschein: kein DHL-Versand."} Die Zahlung startet erst nach deiner ausdrücklichen Bestätigung.</p>
  {!address&&<p>Bitte zuerst oben deine {lines.length?"Liefer- und Rechnungsadresse":"Rechnungsadresse"} bestätigen.</p>}
  <label style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:16,fontSize:12,lineHeight:1.7}}>
   <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} required/>
   <span style={{minWidth:0,overflowWrap:"anywhere"}}>Ich habe die <a href="/rechtliches/agb/" target="_blank" rel="noopener noreferrer">AGB</a> und die
   <a href="/rechtliches/widerruf/" target="_blank" rel="noopener noreferrer"> Widerrufsbelehrung</a> gelesen und bestätige den kostenpflichtigen Kauf.</span>
  </label>
  {error&&<p role="alert" style={{color:"#a13c50"}}>Bestellung konnte nicht gestartet werden ({error}). Bitte nicht erneut versuchen, bis der Vorgang geprüft ist.</p>}
  <button type="button" className="rh-payment-primary-link" disabled={!ready} onClick={start}
   style={{border:0,cursor:ready?"pointer":"not-allowed",opacity:ready?1:.48,width:"100%",fontSize:14}}>
   {loading?"Zahlung wird sicher vorbereitet …":totalCents===0?"Mit Geschenkgutschein bezahlen – 0,00 € Restbetrag":`${(totalCents/100).toFixed(2).replace(".",",")} € zahlungspflichtig mit ${method==="paypal"?"PayPal":"Klarna"} bestellen`}
  </button>
 </div>;
}
