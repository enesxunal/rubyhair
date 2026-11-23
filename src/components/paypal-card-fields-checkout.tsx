"use client";
import {useEffect,useRef,useState} from "react";
import type {CartLine} from "@/components/cart-context";
import type {CheckoutAddressData} from "./checkout-address-preview";

type CardSession={
 createCardFieldsComponent:(options:{type:"number"|"expiry"|"cvv";placeholder:string})=>HTMLElement;
 submit:(orderId:string,options:{billingAddress:{postalCode:string;streetAddress:string;city:string;countryCode:"DE"}})=>Promise<{state:string;data?:{orderId?:string;liabilityShift?:string}}>;
};
type PaypalSDK={createInstance:(o:{clientToken:string;components:string[];locale:string;pageType:string})=>Promise<{
 findEligibleMethods:(o:{countryCode:string;currencyCode:string;amount:string})=>Promise<{isEligible:(s:string)=>boolean}>;
 createCardFieldsOneTimePaymentSession:()=>CardSession;
}>};
type Props={lines:CartLine[];address:CheckoutAddressData|null;cartReady:boolean;totalCents:number;couponCode?:string};

const scriptUrl="https://www.paypal.com/web-sdk/v6/core";
async function loadPaypal():Promise<PaypalSDK>{
 const w=window as Window&{paypal?:PaypalSDK};
 if(w.paypal?.createInstance)return w.paypal;
 await new Promise<void>((resolve,reject)=>{
  let tag=document.querySelector<HTMLScriptElement>(`script[src="${scriptUrl}"]`);
  if(!tag){tag=document.createElement("script");tag.src=scriptUrl;tag.async=true;document.head.appendChild(tag)}
  tag.addEventListener("load",()=>resolve(),{once:true});
  tag.addEventListener("error",()=>reject(new Error("SDK_UNAVAILABLE")),{once:true});
 });
 if(!w.paypal?.createInstance)throw new Error("SDK_NOT_READY");
 return w.paypal;
}

/** Only PayPal-hosted frames handle PAN, expiry and CVV. */
export default function PayPalCardFieldsCheckout({lines,address,cartReady,totalCents,couponCode}:Props){
 const numberRef=useRef<HTMLDivElement>(null),expiryRef=useRef<HTMLDivElement>(null),cvvRef=useRef<HTMLDivElement>(null);
 const sessionRef=useRef<CardSession|null>(null),keyRef=useRef<string|null>(null);
 const [phase,setPhase]=useState<"loading"|"ready"|"unavailable">("loading");
 const [agreed,setAgreed]=useState(false),[busy,setBusy]=useState(false),[locked,setLocked]=useState(false),[error,setError]=useState("");
 useEffect(()=>{
  let canceled=false;
  async function init(){
   try{
    const response=await fetch("/api/payments/paypal/card-token",{cache:"no-store",credentials:"same-origin"});
    if(!response.ok)throw new Error("TOKEN_UNAVAILABLE");
    const data=await response.json() as {clientToken?:string};
    if(!data.clientToken)throw new Error("TOKEN_UNAVAILABLE");
    const sdk=await loadPaypal();
    const app=await sdk.createInstance({clientToken:data.clientToken,components:["card-fields"],locale:"de-DE",pageType:"checkout"});
    const eligible=await app.findEligibleMethods({countryCode:"DE",currencyCode:"EUR",amount:(totalCents/100).toFixed(2)});
    if(!eligible.isEligible("advanced_cards"))throw new Error("NOT_ELIGIBLE");
    if(canceled)return;
    const session=app.createCardFieldsOneTimePaymentSession();
    const refs=[numberRef,expiryRef,cvvRef] as const;
    const fields=["number","expiry","cvv"] as const;
    const placeholders=["Kartennummer","MM/JJ","CVV"] as const;
    fields.forEach((type,i)=>refs[i].current?.replaceChildren(session.createCardFieldsComponent({type,placeholder:placeholders[i]})));
    sessionRef.current=session;setPhase("ready");
   }catch{if(!canceled)setPhase("unavailable")}
  }
  void init();
  return ()=>{canceled=true;sessionRef.current=null;[numberRef,expiryRef,cvvRef].forEach(r=>r.current?.replaceChildren())};
 },[totalCents]);
 const ready=phase==="ready"&&Boolean(address&&cartReady&&lines.length&&totalCents>0&&agreed&&!busy&&!locked);
 async function pay(){
  if(!ready||!address||!sessionRef.current)return;
  setBusy(true);setLocked(true);setError("");
  keyRef.current||=crypto.randomUUID();
  try{
   const created=await fetch("/api/checkout",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({key:keyRef.current,provider:"paypal",paymentExperience:"card",lines,gifts:[],shipping:address.shipping,billing:address.billing,email:address.email,couponCode,consent:true})});
   const order=await created.json() as {orderId?:string;paypalOrderId?:string;cardState?:string;amountCents?:number;paymentExperience?:string};
   if(!created.ok||order.paymentExperience!=="card"||!order.orderId||!order.paypalOrderId||!order.cardState||order.amountCents!==totalCents)throw Error("ORDER_UNVERIFIED");
   const result=await sessionRef.current.submit(order.paypalOrderId,{billingAddress:{postalCode:(address.billing||address.shipping).postalCode,
    streetAddress:(address.billing||address.shipping).street,city:(address.billing||address.shipping).city,countryCode:"DE"}});
   if(result.state!=="succeeded"||result.data?.orderId!==order.paypalOrderId)throw Error("CARD_NOT_APPROVED");
   if(result.data.liabilityShift!=="POSSIBLE")throw Error("CARD_3DS_NOT_VERIFIED");
   const response=await fetch("/api/payments/paypal/card-capture",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({orderId:order.orderId,paypalOrderId:order.paypalOrderId,cardState:order.cardState})});
   const receipt=await response.json() as {paid?:boolean};
   if(!response.ok||!receipt.paid)throw Error("CAPTURE_NOT_VERIFIED");
   try{sessionStorage.setItem("rubyhair-checkout-purchased:"+order.orderId,JSON.stringify({lines,giftIds:[]}))}catch{}
   const query=new URLSearchParams({orderId:order.orderId,state:order.cardState,token:order.paypalOrderId});
   window.location.assign("/kasse/paypal/return?"+query.toString());
  }catch{setError("Die Bestellung muss geprüft werden. Bitte nicht erneut bezahlen und Ruby Hair kontaktieren.")}
  finally{setBusy(false)}
 }
 const fieldStyle={height:48,border:"1px solid #c5b4bd",borderRadius:6,background:"#fff",marginBottom:12};
 return <div className="rh-payment-action-area" aria-live="polite">
  <p>Direkte Visa- oder Mastercard-Zahlung. Kartendaten werden ausschließlich von PayPal verarbeitet.</p>
  {phase==="loading"&&<p role="status">Sichere Karteneingabe wird geladen …</p>}
  {phase==="unavailable"&&<p role="alert">Kartenzahlung ist momentan nicht verfügbar. Bitte PayPal oder Klarna wählen.</p>}
  <div style={{display:phase==="ready"?"block":"none"}}>
   <label style={{display:"block",fontSize:13}}>Kartennummer<div ref={numberRef} style={fieldStyle}/></label>
   <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
    <label style={{fontSize:13}}>Gültig bis<div ref={expiryRef} style={fieldStyle}/></label>
    <label style={{fontSize:13}}>Sicherheitscode<div ref={cvvRef} style={fieldStyle}/></label>
   </div>
  </div>
  {!address&&<p>Bitte zuerst die Liefer- und Rechnungsadresse bestätigen.</p>}
  <label style={{display:"flex",alignItems:"flex-start",gap:10,fontSize:12,lineHeight:1.7,margin:"14px 0"}}>
   <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)}/>
   <span>Ich akzeptiere die <a href="/rechtliches/agb/" target="_blank" rel="noreferrer">AGB</a> und die <a href="/rechtliches/widerruf/" target="_blank" rel="noreferrer">Widerrufsbelehrung</a> und bestelle zahlungspflichtig.</span>
  </label>
  {error&&<p role="alert" style={{color:"#a13c50"}}>{error}</p>}
  <button type="button" className="rh-payment-primary-link" disabled={!ready} onClick={pay} style={{width:"100%",border:0,opacity:ready?1:.5}}>
   {busy?"Kartenzahlung wird überprüft …":`${(totalCents/100).toFixed(2).replace(".",",")} € zahlungspflichtig mit Karte bestellen`}
  </button>
 </div>;
}
