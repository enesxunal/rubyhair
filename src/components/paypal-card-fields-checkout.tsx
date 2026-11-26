"use client";
import {useEffect,useRef,useState} from "react";
import type {CartLine} from "@/components/cart-context";
import type {CheckoutAddressData} from "./checkout-address-preview";

type CardValidity={data:{number:{isValid:boolean};expiry:{isValid:boolean};cvv:{isValid:boolean}}};
type CardSession={
 on:(event:"change"|"validitychange",callback:(event:CardValidity)=>void)=>Promise<void>;
 createCardFieldsComponent:(options:{type:"number"|"expiry"|"cvv";placeholder:string})=>HTMLElement;
 submit:(orderId:string,options:{billingAddress:{postalCode:string;addressLine1:string;adminArea2:string;countryCode:"DE"}})=>Promise<{state:string;data?:{orderId?:string;liabilityShift?:string}}>;
};
type PaypalSDK={createInstance:(o:{clientToken:string;components:string[];locale:string;pageType:string})=>Promise<{
 findEligibleMethods:(o:{countryCode:string;currencyCode:string;amount:string})=>Promise<{isEligible:(s:string)=>boolean}>;
 createCardFieldsOneTimePaymentSession:()=>CardSession;
}>};
type Props={agreed:boolean;claimPayment:()=>boolean;releasePayment:()=>void;lines:CartLine[];address:CheckoutAddressData|null;cartReady:boolean;totalCents:number;couponCode?:string};

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
export default function PayPalCardFieldsCheckout({agreed,claimPayment,releasePayment,lines,address,cartReady,totalCents,couponCode}:Props){
 const numberRef=useRef<HTMLDivElement>(null),expiryRef=useRef<HTMLDivElement>(null),cvvRef=useRef<HTMLDivElement>(null);
 const sessionRef=useRef<CardSession|null>(null),keyRef=useRef<string|null>(null);
 const [cardValid,setCardValid]=useState(false);
 const [sessionEpoch,setSessionEpoch]=useState(0);
 const [phase,setPhase]=useState<"loading"|"ready"|"unavailable">("loading");
 const [busy,setBusy]=useState(false),[locked,setLocked]=useState(false),[error,setError]=useState("");
 useEffect(()=>{
  let canceled=false;
  setCardValid(false);setPhase("loading");
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
    const update=(event:CardValidity)=>{if(!canceled)setCardValid(event.data?.number?.isValid===true&&event.data?.expiry?.isValid===true&&event.data?.cvv?.isValid===true)};
    await session.on("validitychange",update);
    await session.on("change",update);
    if(!canceled){sessionRef.current=session;setPhase("ready")}
   }catch{if(!canceled)setPhase("unavailable")}
  }
  void init();
  return ()=>{canceled=true;sessionRef.current=null;[numberRef,expiryRef,cvvRef].forEach(r=>r.current?.replaceChildren())};
 },[totalCents,sessionEpoch]);
 const ready=phase==="ready"&&cardValid&&Boolean(address&&cartReady&&lines.length&&totalCents>0&&agreed&&!busy&&!locked);
 async function pay(){
  if(!ready||!address||!sessionRef.current)return;
  if(!claimPayment()){setError("Eine Zahlung wurde bereits gestartet. Bitte Zahlungsstatus prüfen.");return}
  setBusy(true);setLocked(true);setError("");
  keyRef.current||=crypto.randomUUID();
  let cardStep:"create"|"submit"|"3ds"|"capture"="create";
  let reference:""|string="";
  let checkoutRef:{orderId:string;paypalOrderId:string;cardState:string}|null=null;
  try{
   const created=await fetch("/api/checkout",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({key:keyRef.current,provider:"paypal",paymentExperience:"card",lines,gifts:[],shipping:address.shipping,billing:address.billing,email:address.email,couponCode,consent:true})});
   const order=await created.json() as {orderId?:string;paypalOrderId?:string;cardState?:string;amountCents?:number;paymentExperience?:string};
   if(!created.ok||order.paymentExperience!=="card"||!order.orderId||!order.paypalOrderId||!order.cardState||order.amountCents!==totalCents)throw Error("ORDER_UNVERIFIED");
   reference=order.orderId;
   checkoutRef={orderId:order.orderId,paypalOrderId:order.paypalOrderId,cardState:order.cardState};
   cardStep="submit";
   const result=await sessionRef.current.submit(order.paypalOrderId,{billingAddress:{postalCode:(address.billing||address.shipping).postalCode,
    addressLine1:(address.billing||address.shipping).street,adminArea2:(address.billing||address.shipping).city,countryCode:"DE"}});
   if(result.state==="canceled")throw Error("CARD_AUTH_CANCELLED");
   if(result.state==="failed")throw Error("CARD_AUTH_FAILED");
   if(result.state!=="succeeded"||result.data?.orderId!==order.paypalOrderId)throw Error("CARD_NOT_APPROVED");
   cardStep="3ds";
   if(result.data.liabilityShift!=="POSSIBLE")throw Error("CARD_3DS_NOT_VERIFIED");
   cardStep="capture";
   const response=await fetch("/api/payments/paypal/card-capture",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({orderId:order.orderId,paypalOrderId:order.paypalOrderId,cardState:order.cardState})});
   const receipt=await response.json() as {paid?:boolean};
   if(!response.ok||!receipt.paid)throw Error("CAPTURE_NOT_VERIFIED");
   try{sessionStorage.setItem("rubyhair-checkout-purchased:"+order.orderId,JSON.stringify({lines,giftIds:[]}))}catch{}
   const query=new URLSearchParams({orderId:order.orderId,state:order.cardState,token:order.paypalOrderId});
   window.location.assign("/kasse/paypal/return?"+query.toString());
  }catch(error){
   const reason=error instanceof Error?error.message:"UNKNOWN";
   const explicitlyFailed=cardStep==="submit"&&(reason==="CARD_AUTH_CANCELLED"||reason==="CARD_AUTH_FAILED");
   // Reconcile an already completed charge without attempting a second capture.
   if(checkoutRef){
    for(let attempt=0;attempt<3;attempt++){
     try{
      const res=await fetch("/api/payments/paypal/card-status",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({...checkoutRef,retryRequested:explicitlyFailed})});
      const status=await res.json() as {paid?:boolean;retryAllowed?:boolean};
      if(res.ok&&status.retryAllowed&&explicitlyFailed){
       keyRef.current=null;setLocked(false);releasePayment();setCardValid(false);setSessionEpoch(v=>v+1);
       setError("Kartenzahlung nicht abgeschlossen. Bitte Kartendaten erneut eingeben oder eine andere Zahlungsart waehlen.");return;
      }
      if(res.ok&&status.paid){
       try{sessionStorage.setItem("rubyhair-checkout-purchased:"+checkoutRef.orderId,JSON.stringify({lines,giftIds:[]}))}catch{}
       const query=new URLSearchParams({orderId:checkoutRef.orderId,state:checkoutRef.cardState,token:checkoutRef.paypalOrderId});
       window.location.assign("/kasse/paypal/return?"+query.toString());
       return;
      }
     }catch{}
     if(attempt<2)await new Promise(resolve=>setTimeout(resolve,1200));
    }
   }
   const referenceMessage=reference?` Referenz: ${reference.slice(0,8)}.`:"";
   if(cardStep==="submit"||cardStep==="3ds"){
    const canceled=reason==="CARD_AUTH_CANCELLED";
    setError((canceled?"Die Kartenbestätigung wurde abgebrochen. ":"Die Kartenzahlung konnte nicht bestätigt werden. ")+
     "Es wurde keine abgeschlossene PayPal-Zahlung verifiziert. Falls deine Bank eine Buchung zeigt, kann es eine Vormerkung sein. Bitte NICHT erneut bezahlen und Ruby Hair kontaktieren."+referenceMessage);
   }else{
    setError("Der Zahlungsstatus muss geprüft werden. Bitte NICHT erneut bezahlen und Ruby Hair kontaktieren."+referenceMessage);
   }
  }
  finally{setBusy(false)}
 }
 const fieldStyle={height:48,border:"1px solid #c5b4bd",borderRadius:6,background:"#fff",marginBottom:12};
 return <div className="rh-payment-action-area rh-card-first-form" aria-live="polite">
  <p>Sicher mit Kredit- oder Debitkarte bezahlen. Kartendaten werden ausschließlich von PayPal verarbeitet.</p>
  {phase==="loading"&&<p role="status">Sichere Karteneingabe wird geladen …</p>}
  {phase==="unavailable"&&<p role="alert">Kartenzahlung ist momentan nicht verfügbar. Bitte PayPal oder Klarna wählen.</p>}
  <div style={{display:phase==="ready"?"block":"none"}}>
   <label style={{display:"block",fontSize:13}}>Kartennummer<div ref={numberRef} style={fieldStyle}/></label>
   <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
    <label style={{fontSize:13}}>Gültig bis<div ref={expiryRef} style={fieldStyle}/></label>
    <label style={{fontSize:13}}>Sicherheitscode<div ref={cvvRef} style={fieldStyle}/></label>
   </div>
  </div>
  {address&&!cartReady&&<p className="rh-checkout-unavailable-note" role="alert">Der Warenkorb ist noch nicht zur Zahlung freigegeben. Prüfe bitte die Preis- und Bestandsmeldung in deiner Bestellübersicht. Bei einem ungültigen Rabattcode diesen im Warenkorb entfernen.</p>}
  {error&&<p role="alert" style={{color:"#a13c50"}}>{error}</p>}
  <button type="button" className="rh-payment-primary-link" disabled={!ready} onClick={pay} style={{width:"100%",border:0,opacity:ready?1:.5}}>
   {busy?"Kartenzahlung wird überprüft …":`${(totalCents/100).toFixed(2).replace(".",",")} € zahlungspflichtig mit Karte bestellen`}
  </button>
 </div>;
}
