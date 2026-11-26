"use client";
import {useEffect,useRef,useState} from "react";
import type {CartLine} from "./cart-context";
import type {CheckoutAddressData} from "./checkout-address-preview";

type Method="apple_pay"|"google_pay";
type CheckoutOrder={paymentExperience?:string;orderId?:string;paypalOrderId?:string;walletState?:string;amountCents?:number;retrySafe?:boolean};
type PayPalMethods={isEligible:(method:string)=>boolean;getDetails:(method:string)=>{config:Record<string,unknown>}};
type GoogleWalletSession={
 formatConfigForPaymentRequest:(config:Record<string,unknown>)=>GooglePayConfig;
 confirmOrder:(options:{orderId:string;paymentMethodData:unknown})=>Promise<{status:string}>;
};
type AppleWalletSession={
 config:()=>Promise<{merchantCapabilities:string[];supportedNetworks:string[]}>;
 validateMerchant:(options:{validationUrl:string})=>Promise<{merchantSession:unknown}>;
 confirmOrder:(options:{orderId:string;token:unknown;billingContact?:unknown;shippingContact?:unknown})=>Promise<{status?:string}>;
};
type SDKInstance={
 findEligibleMethods:(options:{countryCode:string;currencyCode:string;amount:string})=>Promise<PayPalMethods>;
 createGooglePayOneTimePaymentSession:()=>GoogleWalletSession;
 createApplePayOneTimePaymentSession:()=>Promise<AppleWalletSession>;
};
type PayPalSDK={createInstance:(options:{clientToken:string;components:string[];locale:string;pageType:string})=>Promise<SDKInstance>};
type GooglePayConfig={
 allowedPaymentMethods:unknown[];merchantInfo:Record<string,unknown>;apiVersion:number;apiVersionMinor:number;countryCode:string;
};
type GooglePayPaymentData={paymentMethodData:unknown};
type GooglePayClient={
 isReadyToPay:(options:{allowedPaymentMethods:unknown[];apiVersion:number;apiVersionMinor:number})=>Promise<{result:boolean}>;
 createButton:(options:{onClick:()=>void;buttonSizeMode?:"fill";buttonColor?:"black";buttonType?:"buy"})=>HTMLElement;
 loadPaymentData:(options:GooglePayConfig&{transactionInfo:{countryCode:string;currencyCode:string;totalPriceStatus:string;totalPrice:string};callbackIntents:string[]})=>Promise<unknown>;
};
type GooglePayAPI={payments:{api:{PaymentsClient:new(options:{environment:"PRODUCTION";paymentDataCallbacks:{
 onPaymentAuthorized:(data:GooglePayPaymentData)=>Promise<{transactionState:"SUCCESS"|"ERROR";error?:{intent:string;message:string}}>;
}})=>GooglePayClient}}};
type AppleNativeSession={
 onvalidatemerchant:((e:{validationURL:string})=>void)|null;
 onpaymentauthorized:((e:{payment:{token:unknown;billingContact?:unknown;shippingContact?:unknown}})=>void)|null;
 oncancel:(()=>void)|null;
 completeMerchantValidation:(session:unknown)=>void;
 completePayment:(options:{status:number})=>void;
 abort:()=>void;begin:()=>void;
};
type AppleNativeConstructor={
 new(version:number,request:Record<string,unknown>):AppleNativeSession;
 canMakePayments:()=>boolean;supportsVersion?:(v:number)=>boolean;
 STATUS_SUCCESS:number;STATUS_FAILURE:number;
};
type WalletWindow=Window&{paypal?:PayPalSDK;google?:GooglePayAPI;ApplePaySession?:AppleNativeConstructor};
type Props={
 lines:CartLine[];address:CheckoutAddressData|null;cartReady:boolean;totalCents:number;couponCode?:string;
 appleEnabled:boolean;googleEnabled:boolean;accepted:boolean;claimPayment:()=>boolean;releasePayment:()=>void;
};
const PAYPAL_URL="https://www.paypal.com/web-sdk/v6/core";
const GOOGLE_URL="https://pay.google.com/gp/p/js/pay.js";
const APPLE_URL="https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js";
const windowWallet=()=>window as WalletWindow;
function loadScript(url:string,ready:()=>boolean):Promise<void>{
 if(ready())return Promise.resolve();
 return new Promise((resolve,reject)=>{
  let script=document.querySelector<HTMLScriptElement>(`script[src="${url}"]`);
  const success=()=>ready()?resolve():reject(new Error("PAYMENT_SDK_UNAVAILABLE"));
  if(script){script.addEventListener("load",success,{once:true});script.addEventListener("error",()=>reject(Error("PAYMENT_SDK_UNAVAILABLE")),{once:true});return}
  script=document.createElement("script");script.async=true;script.src=url;
  script.addEventListener("load",success,{once:true});script.addEventListener("error",()=>reject(Error("PAYMENT_SDK_UNAVAILABLE")),{once:true});
  document.head.appendChild(script);
 });
}
function asError(e:unknown):string{return e instanceof Error?e.message:"UNKNOWN_WALLET_ERROR"}
const money=(cents:number)=>(cents/100).toFixed(2);

export default function PayPalWalletCheckout({lines,address,cartReady,totalCents,couponCode,appleEnabled,googleEnabled,accepted,claimPayment,releasePayment}:Props){
 const appleHost=useRef<HTMLDivElement>(null),googleHost=useRef<HTMLDivElement>(null);
 const paymentMethod=useRef<GooglePayClient|null>(null);
 const [appleReady,setAppleReady]=useState(false),[googleReady,setGoogleReady]=useState(false);
 const [chosenWallet,setChosenWallet]=useState<Method|null>(null);
 const [processing,setProcessing]=useState(false),[error,setError]=useState("");
 const lock=useRef(false),orderKeys=useRef<Record<Method,string|null>>({apple_pay:null,google_pay:null});
 const snapshot=useRef({lines,address,cartReady,totalCents,couponCode,accepted});
 snapshot.current={lines,address,cartReady,totalCents,couponCode,accepted};
 const canStart=()=>Boolean(snapshot.current.address&&snapshot.current.cartReady&&snapshot.current.lines.length>0&&
  snapshot.current.totalCents>0&&snapshot.current.accepted&&!lock.current);
 const createOrder=async(method:Method):Promise<Required<CheckoutOrder>>=>{
  const current=snapshot.current;
  if(!current.address||!current.cartReady||!current.lines.length||current.totalCents<=0||!current.accepted)throw Error("WALLET_CHECKOUT_NOT_READY");
  if(!claimPayment()){lock.current=false;throw Error("ZAHLUNG_BEREITS_GESTARTET")}
  orderKeys.current[method]||=crypto.randomUUID();
  const response=await fetch("/api/checkout",{method:"POST",credentials:"same-origin",cache:"no-store",
   headers:{"Content-Type":"application/json"},body:JSON.stringify({
    key:orderKeys.current[method],provider:"paypal",paymentExperience:method,lines:current.lines,gifts:[],
    shipping:current.address.shipping,billing:current.address.billing,email:current.address.email,
    couponCode:current.couponCode,consent:true
   })});
  const data=await response.json() as CheckoutOrder;
  if(!response.ok&&data.retrySafe===true){orderKeys.current[method]=null;lock.current=false;releasePayment();throw Error("Bitte Angaben oder Warenkorb prüfen und erneut versuchen.")}
  if(!response.ok||data.paymentExperience!==method||!data.orderId||!data.paypalOrderId||
     !data.walletState||data.amountCents!==current.totalCents)throw Error("WALLET_ORDER_REQUIRES_REVIEW");
  return data as Required<CheckoutOrder>;
 };
 const confirmCapture=async(method:Method,order:Required<CheckoutOrder>)=>{
  const response=await fetch("/api/payments/paypal/wallet-capture",{method:"POST",cache:"no-store",credentials:"same-origin",
   headers:{"Content-Type":"application/json"},body:JSON.stringify({method,orderId:order.orderId,
    paypalOrderId:order.paypalOrderId,walletState:order.walletState})});
  const receipt=await response.json() as {paid?:boolean};
  if(!response.ok||!receipt.paid)throw Error("WALLET_CAPTURE_REQUIRES_REVIEW");
  try{sessionStorage.setItem("rubyhair-checkout-purchased:"+order.orderId,
    JSON.stringify({lines:snapshot.current.lines,giftIds:[]}))}catch{}
  const q=new URLSearchParams({orderId:order.orderId,state:order.walletState,token:order.paypalOrderId,wallet:method});
  return "/kasse/paypal/return?"+q.toString();
 };
 useEffect(()=>{
  let canceled=false;
  const controller=new AbortController();
  setAppleReady(false);setGoogleReady(false);
  appleHost.current?.replaceChildren();googleHost.current?.replaceChildren();
  const run=async()=>{
   if(!cartReady||(!appleEnabled&&!googleEnabled)||totalCents<=0)return;
   try{
    const token=await fetch("/api/payments/paypal/wallet-token",{cache:"no-store",credentials:"same-origin",signal:controller.signal});
    if(!token.ok)return;
    const json=await token.json() as {clientToken?:string};
    if(!json.clientToken)return;
    if(canceled)return;
    await loadScript(PAYPAL_URL,()=>Boolean(windowWallet().paypal?.createInstance));
    if(canceled)return;
    const sdk=await windowWallet().paypal!.createInstance({clientToken:json.clientToken,
     components:[...(googleEnabled?["googlepay-payments"]:[]),...(appleEnabled?["applepay-payments"]:[])],
     locale:"de-DE",pageType:"checkout"});
    const eligible=await sdk.findEligibleMethods({countryCode:"DE",currencyCode:"EUR",amount:money(totalCents)});
    if(canceled)return;
    if(googleEnabled&&eligible.isEligible("googlepay")){
     try{
      await loadScript(GOOGLE_URL,()=>Boolean(windowWallet().google?.payments?.api?.PaymentsClient));
      const session=sdk.createGooglePayOneTimePaymentSession();
      const details=eligible.getDetails("googlepay");
      const config=session.formatConfigForPaymentRequest(details.config);
      const GoogleClient=windowWallet().google!.payments.api.PaymentsClient;
      const client=new GoogleClient({
       environment:"PRODUCTION",
       paymentDataCallbacks:{onPaymentAuthorized:async(data)=>{
        let walletOrder:Required<CheckoutOrder>|null=null;
        try{
         if(lock.current||!canStart())throw Error("WALLET_NOT_READY");
         lock.current=true;setProcessing(true);setError("");
         walletOrder=await createOrder("google_pay");
         const result=await session.confirmOrder({orderId:walletOrder.paypalOrderId,paymentMethodData:data.paymentMethodData});
         // v6 has no documented 3DS action method on this session; never capture until approved.
         if(result.status!=="APPROVED")throw Error("GOOGLE_PAY_PAYER_ACTION_REQUIRED");
         const url=await confirmCapture("google_pay",walletOrder);
         setTimeout(()=>window.location.assign(url),350);
         return {transactionState:"SUCCESS"};
        }catch(e){
         setError(walletOrder?"Zahlungsstatus muss geprüft werden. Bitte nicht erneut bezahlen.":asError(e));
         return {transactionState:"ERROR",error:{intent:"PAYMENT_AUTHORIZATION",message:"Zahlung konnte nicht bestätigt werden."}};
        }finally{setProcessing(false)}
       }}
      });
      const {result}=await client.isReadyToPay({allowedPaymentMethods:config.allowedPaymentMethods,
       apiVersion:config.apiVersion,apiVersionMinor:config.apiVersionMinor});
      if(!canceled&&result&&googleHost.current){
       paymentMethod.current=client;
       const button=client.createButton({buttonSizeMode:"fill",buttonColor:"black",buttonType:"buy",onClick:()=>{
        if(!canStart()){setError("Bitte Lieferadresse vollständig ausfüllen und AGB bestätigen.");return}
        setError("");
        // Must be called directly inside a genuine click for browser popup permission.
        void client.loadPaymentData({...config,transactionInfo:{countryCode:"DE",currencyCode:"EUR",
         totalPriceStatus:"FINAL",totalPrice:money(snapshot.current.totalCents)},
         callbackIntents:["PAYMENT_AUTHORIZATION"]}).catch(()=>{if(!lock.current)setError("Google Pay wurde abgebrochen oder ist nicht verfügbar.")});
       }});
       googleHost.current.replaceChildren(button);
       setGoogleReady(true);
      }
     }catch{/* Not eligible on this browser or Google Pay configuration not complete. */}
    }
    const Apple=windowWallet().ApplePaySession;
    if(appleEnabled&&eligible.isEligible("applepay")&&Apple?.canMakePayments()&&(Apple.supportsVersion?.(4)??true)){
     try{
      await loadScript(APPLE_URL,()=>Boolean(document.querySelector("apple-pay-button")||
       customElements.get("apple-pay-button")));
      const session=await sdk.createApplePayOneTimePaymentSession();
      const config=await session.config();
      if(!canceled&&appleHost.current&&config.supportedNetworks.length){
       const button=document.createElement("apple-pay-button");
       button.setAttribute("buttonstyle","black");button.setAttribute("type","buy");
       button.setAttribute("locale","de-DE");button.style.cssText="display:block;width:100%;height:48px;cursor:pointer";
       button.addEventListener("click",()=>{
        if(!canStart()){setError("Bitte Lieferadresse vollständig ausfüllen und AGB bestätigen.");return}
        setError("");lock.current=true;setProcessing(true);
        const native=new Apple(4,{countryCode:"DE",currencyCode:"EUR",
         merchantCapabilities:config.merchantCapabilities,supportedNetworks:config.supportedNetworks,
         requiredBillingContactFields:["name","postalAddress"],requiredShippingContactFields:[],
         total:{label:"Ruby Hair",amount:money(snapshot.current.totalCents),type:"final"}});
        native.onvalidatemerchant=e=>{
         void session.validateMerchant({validationUrl:e.validationURL})
          .then(v=>native.completeMerchantValidation(v.merchantSession))
          .catch(()=>{setError("Apple Pay Domain-Validierung fehlgeschlagen.");lock.current=false;setProcessing(false);native.abort()});
        };
        native.onpaymentauthorized=e=>{void (async()=>{
         let order:Required<CheckoutOrder>|null=null;
         try{
          order=await createOrder("apple_pay");
          const confirmation=await session.confirmOrder({orderId:order.paypalOrderId,token:e.payment.token,
           billingContact:e.payment.billingContact,shippingContact:e.payment.shippingContact});
          if(confirmation.status&&confirmation.status!=="APPROVED")throw Error("APPLE_PAY_NOT_APPROVED");
          const url=await confirmCapture("apple_pay",order);
          native.completePayment({status:Apple.STATUS_SUCCESS});
          setTimeout(()=>window.location.assign(url),350);
         }catch{
          setError(order?"Zahlungsstatus muss geprüft werden. Bitte nicht erneut bezahlen.":"Apple Pay konnte nicht gestartet werden.");
          native.completePayment({status:Apple.STATUS_FAILURE});
         }finally{setProcessing(false)}
        })()};
        native.oncancel=()=>{if(!orderKeys.current.apple_pay){lock.current=false;setProcessing(false)}};
        native.begin();
       });
       appleHost.current.replaceChildren(button);setAppleReady(true);
      }
     }catch{/* Domain or Apple Pay configuration is unavailable; hide the button. */}
    }
   }catch{/* Never show unsupported wallets. */}
  };
  void run();
  return()=>{canceled=true;controller.abort();appleHost.current?.replaceChildren();googleHost.current?.replaceChildren();paymentMethod.current=null};
 },[cartReady,totalCents,appleEnabled,googleEnabled]);
 if(!appleEnabled&&!googleEnabled)return null;
 return <section className="rh-payment-action-area rh-wallet-actions" aria-label="Digitale Wallets" hidden={!appleEnabled&&!googleEnabled&&!error&&!processing}>
  {appleEnabled&&<button type="button" className="rh-logo-wallet-tile" disabled={!appleReady} title={!appleReady?"Apple Pay ist auf diesem Gerät nicht verfügbar":"Apple Pay auswählen"} aria-label={appleReady?"Apple Pay auswählen":"Apple Pay auf diesem Gerät nicht verfügbar"} aria-expanded={chosenWallet==="apple_pay"} onClick={()=>setChosenWallet(v=>v==="apple_pay"?null:"apple_pay")}><img src="/assets/payment-brands/reference/apple_pay.svg" alt="Apple Pay"/></button>}
  {googleEnabled&&<button type="button" className="rh-logo-wallet-tile" disabled={!googleReady} title={!googleReady?"Google Pay ist auf diesem Gerät nicht verfügbar":"Google Pay auswählen"} aria-label={googleReady?"Google Pay auswählen":"Google Pay auf diesem Gerät nicht verfügbar"} aria-expanded={chosenWallet==="google_pay"} onClick={()=>setChosenWallet(v=>v==="google_pay"?null:"google_pay")}><img src="/assets/payment-brands/reference/google_pay.svg" alt="Google Pay"/></button>}
  <div ref={appleHost} className="rh-wallet-button-host" style={{display:appleReady&&chosenWallet==="apple_pay"?"block":"none"}}/>
  <div ref={googleHost} className="rh-wallet-button-host" style={{display:googleReady&&chosenWallet==="google_pay"?"block":"none"}}/>
  {processing&&<p role="status">Deine Wallet-Zahlung wird geprüft …</p>}
  {error&&<p role="alert" style={{color:"#a13c50"}}>{error}</p>}
 </section>;
}
