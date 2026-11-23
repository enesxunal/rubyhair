"use client";
import {useEffect,useRef,useState} from "react";

type CardSession={
 createCardFieldsComponent:(options:{type:"number"|"expiry"|"cvv";placeholder:string;style?:Record<string,Record<string,string>>})=>HTMLElement;
 submit:(orderId:string,options:{billingAddress:{postalCode:string;countryCode:"DE"}})=>Promise<{state:"succeeded"|"failed"|"canceled";data?:{orderId?:string;liabilityShift?:string;message?:string}}>;
};
type PayPalV6={createInstance:(o:{clientToken:string;components:string[];locale:string;pageType:string})=>Promise<{
 findEligibleMethods:(o:{countryCode:string;currencyCode:string;amount:string})=>Promise<{isEligible:(method:string)=>boolean}>;
 createCardFieldsOneTimePaymentSession:()=>CardSession;
}>};
type TestOrder={orderId:string;paypalOrderId:string;amountCents:number};
type TestStatus={orderStatus?:string;paypalStatus?:string;canRetry?:boolean;invoiceNumber?:string|null;error?:string};
const sdkUrl="https://www.paypal.com/web-sdk/v6/core";
const inputStyle={width:"100%",border:"1px solid #d8c6cf",borderRadius:7,padding:"13px 14px",fontSize:15,background:"white"} as const;
const fieldStyle={height:49,border:"1px solid #d8c6cf",borderRadius:7,background:"white",marginTop:6} as const;
const checks={display:"flex",gap:10,alignItems:"flex-start",fontSize:12,lineHeight:1.6,margin:"10px 0"} as const;
async function responseJson(response:Response):Promise<Record<string,unknown>>{
 try{return await response.json() as Record<string,unknown>}catch{return {error:"NETWORK_RESPONSE_INVALID"}}
}
function requestError(payload:Record<string,unknown>,fallback:string){return typeof payload.error==="string"?payload.error:fallback}
export default function CardQaForm({existingOrderId,existingPaypalOrderId}:{existingOrderId?:string;existingPaypalOrderId?:string}){
 const number=useRef<HTMLDivElement>(null),expiry=useRef<HTMLDivElement>(null),cvv=useRef<HTMLDivElement>(null);
 const card=useRef<CardSession|null>(null),submitted=useRef(false);
 const [sdk,setSdk]=useState<"loading"|"ready"|"unavailable">("loading");
 const [buyerName,setBuyerName]=useState(""),[buyerEmail,setBuyerEmail]=useState(""),[postalCode,setPostalCode]=useState("");
 const [seller,setSeller]=useState(false),[tax,setTax]=useState(false),[charge,setCharge]=useState(false);
 const [stage,setStage]=useState("Die Karteneingabe wird geladen ..."),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const [order,setOrder]=useState<TestOrder|null>(null),[orderId,setOrderId]=useState(existingOrderId||"");
 const [status,setStatus]=useState<TestStatus|null>(null),[invoice,setInvoice]=useState("");
 useEffect(()=>{
  let canceled=false;
  async function init(){
   try{
    const auth=await fetch("/api/admin/paypal-card-qa/token",{credentials:"same-origin",cache:"no-store"});
    const payload=await responseJson(auth);
    if(!auth.ok||typeof payload.clientToken!=="string")throw Error(requestError(payload,"CLIENT_TOKEN_UNAVAILABLE"));
    const win=window as Window&{paypal?:PayPalV6};
    if(!win.paypal?.createInstance){
     await new Promise<void>((resolve,reject)=>{
      const element=document.createElement("script");element.src=sdkUrl;element.async=true;
      element.onload=()=>resolve();element.onerror=()=>reject(Error("PAYPAL_SDK_LOAD_FAILED"));document.head.appendChild(element);
     });
    }
    if(!win.paypal?.createInstance)throw Error("PAYPAL_SDK_MISSING");
    const app=await win.paypal.createInstance({clientToken:payload.clientToken,components:["card-fields"],locale:"de-DE",pageType:"checkout"});
    const methods=await app.findEligibleMethods({countryCode:"DE",currencyCode:"EUR",amount:"1.00"});
    if(!methods.isEligible("advanced_cards"))throw Error("LIVE_CARD_NOT_ELIGIBLE");
    if(canceled)return;
    const instance=app.createCardFieldsOneTimePaymentSession();
    const refs=[number,expiry,cvv] as const;
    const types=["number","expiry","cvv"] as const;
    const hints=["Kartennummer","MM/JJ","CVV"] as const;
    const style={input:{fontSize:"16px",color:"#342530"}};
    types.forEach((type,index)=>refs[index].current?.replaceChildren(instance.createCardFieldsComponent({type,placeholder:hints[index],style})));
    card.current=instance;setSdk("ready");setStage("PayPal Card Fields bereit. Es wurde noch nichts belastet.");
   }catch(e){if(!canceled){setSdk("unavailable");setStage("Kartentest nicht verfuegbar: "+(e instanceof Error?e.message:"UNKNOWN"))}}
  }
  void init();
  return()=>{canceled=true;card.current=null;number.current?.replaceChildren();expiry.current?.replaceChildren();cvv.current?.replaceChildren()};
 },[]);
 useEffect(()=>{
  if(!orderId)return;
  let canceled=false;
  async function refresh(){try{
   const response=await fetch("/api/admin/paypal-card-qa/status?orderId="+encodeURIComponent(orderId),{cache:"no-store",credentials:"same-origin"});
   const payload=await responseJson(response);
   if(!canceled&&response.ok){setStatus(payload as TestStatus);if(typeof payload.invoiceNumber==="string")setInvoice(payload.invoiceNumber)}
  }catch{}}
  void refresh();const timer=setInterval(()=>void refresh(),8000);
  return()=>{canceled=true;clearInterval(timer)};
 },[orderId]);
 const safeExisting=Boolean(existingOrderId&&existingPaypalOrderId&&status?.canRetry===true);
 const ready=sdk==="ready"&&buyerName.trim().length>=2&&buyerEmail.includes("@")&&/^[0-9]{5}$/.test(postalCode)&&seller&&tax&&charge&&!busy&&!submitted.current&&(!existingOrderId||safeExisting);
 async function submit(){
  if(!ready||!card.current)return;
  submitted.current=true;setBusy(true);setError("");
  let current:TestOrder|null=null;
  try{
   if(existingOrderId&&existingPaypalOrderId){
    if(!safeExisting)throw Error("EXISTING_TEST_STATUS_NOT_SAFE_FOR_RETRY");
    current={orderId:existingOrderId,paypalOrderId:existingPaypalOrderId,amountCents:100};
    setStage("Verwende die bestehende 1,00-EUR-Testbestellung. Kein neuer Auftrag.");
   }else{
    setStage("Erstelle genau eine interne 1,00-EUR-Bestellung ...");
    const start=await fetch("/api/admin/paypal-card-qa/start",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({
     name:buyerName,email:buyerEmail,postalCode,confirmSeller:seller,confirmTax:tax,confirmCharge:charge
    })});
    const body=await responseJson(start);
    if(!start.ok||typeof body.orderId!=="string"||typeof body.paypalOrderId!=="string"||body.amountCents!==100)
     throw Error(requestError(body,"QA_ORDER_CREATION_REQUIRES_REVIEW"));
    current=body as unknown as TestOrder;
   }
   setOrder(current);setOrderId(current.orderId);
   setStage("PayPal-Verifizierung / 3D Secure. Zahlung noch nicht als abgeschlossen markieren.");
   const result=await card.current.submit(current.paypalOrderId,{billingAddress:{postalCode,countryCode:"DE"}});
   if(result.state!=="succeeded"||result.data?.orderId!==current.paypalOrderId)
    throw Error(result.state==="canceled"?"3DS_CANCELED":result.data?.message?.slice(0,120)||"CARD_SUBMISSION_FAILED");
   if(result.data?.liabilityShift!=="POSSIBLE")throw Error("CARD_3DS_REQUIRES_REVIEW");
   setStage("Kartendaten akzeptiert. Pruefe PayPal-Finanzierungsquelle und 3DS vor der Abbuchung ...");
   const capture=await fetch("/api/admin/paypal-card-qa/capture",{method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:current.orderId,paypalOrderId:current.paypalOrderId,sdkLiabilityShift:result.data.liabilityShift})});
   const receipt=await responseJson(capture);
   if(!capture.ok||receipt.paid!==true||typeof receipt.invoiceNumber!=="string")throw Error(requestError(receipt,"CAPTURE_RECONCILIATION_REQUIRED"));
   setInvoice(receipt.invoiceNumber);setStage("BESTAETIGT: PayPal 1,00 EUR Zahlung und Rechnung erfolgreich erfasst.");
  }catch(e){const code=e instanceof Error?e.message:"UNKNOWN_TEST_ERROR";
   setError("Test braucht Pruefung: "+code+(current?". Bitte NICHT erneut bezahlen.":""));
   setStage(current?"Testbestellung existiert; PayPal-Status wird unten aktualisiert.":"Kein erneuter Versuch ohne Statuspruefung.");
  }finally{setBusy(false)}
 }
 return <section style={{marginTop:23}} aria-label="PayPal Live Kartentest">
  {(!existingOrderId||safeExisting)&&<>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(215px,1fr))",gap:15}}>
    <label style={{fontSize:12}}>Name fuer Testrechnung<input value={buyerName} autoComplete="name" onChange={e=>setBuyerName(e.target.value)} style={{...inputStyle,marginTop:7}} required/></label>
    <label style={{fontSize:12}}>E-Mail fuer Testrechnung<input value={buyerEmail} type="email" autoComplete="email" onChange={e=>setBuyerEmail(e.target.value)} style={{...inputStyle,marginTop:7}} required/></label>
    <label style={{fontSize:12}}>Rechnungs-PLZ (Deutschland)<input value={postalCode} maxLength={5} autoComplete="postal-code" onChange={e=>setPostalCode(e.target.value)} style={{...inputStyle,marginTop:7}} inputMode="numeric" required/></label>
   </div>
   <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginTop:22}}>
    <label style={{gridColumn:"1/-1",fontSize:13}}>Kartennummer<div ref={number} style={fieldStyle}/></label>
    <label style={{fontSize:13}}>Gueltig bis<div ref={expiry} style={fieldStyle}/></label>
    <label style={{fontSize:13}}>Pruefziffer (CVV)<div ref={cvv} style={fieldStyle}/></label>
   </div>
   <p style={{fontSize:12,color:"#73636b",margin:"14px 0 20px"}}>Die Kartenfelder werden ausschliesslich von PayPal bereitgestellt. Ruby Hair speichert keine Kartennummer oder CVV.</p>
   <label style={checks}><input type="checkbox" checked={seller} onChange={e=>setSeller(e.target.checked)}/> Die Rechnungsdaten von Ruby Hair (Nazmi Bulganlar, Klara Strasse 19, Essen, USt-ID DE356097157) sind korrekt.</label>
   <label style={checks}><input type="checkbox" checked={tax} onChange={e=>setTax(e.target.checked)}/> 19 % Umsatzsteuer ist fuer diesen internen 1-EUR-Test korrekt.</label>
   <label style={checks}><input type="checkbox" checked={charge} onChange={e=>setCharge(e.target.checked)}/> Ich bestaetige: Dies ist eine echte LIVE-Abbuchung ueber genau 1,00 EUR, ohne Warenlieferung.</label>
   <button disabled={!ready} type="button" onClick={()=>void submit()} style={{display:"block",width:"100%",marginTop:24,background:"#5e3749",color:"white",border:0,borderRadius:7,padding:"17px 18px",fontSize:15,fontWeight:700,cursor:ready?"pointer":"not-allowed",opacity:ready?1:.45}}>
    {busy?"PayPal prueft die Zahlung ...":"1,00 EUR zahlungspflichtig mit Karte testen"}
   </button>
  </>}
  <div role="status" style={{marginTop:18,padding:"15px 17px",background:"#f8f3f5",border:"1px solid #e5d9df",borderRadius:8,color:"#573b49",fontSize:13,lineHeight:1.65}}>
   <strong>Status:</strong> {stage}
   {error&&<p role="alert" style={{color:"#a33b53",fontWeight:700,marginTop:10}}>{error}</p>}
   {orderId&&<p style={{marginTop:10}}>Test-ID: {orderId}</p>}
   {status&&<p style={{marginTop:6}}>Ruby Hair: <strong>{status.orderStatus}</strong> | PayPal: <strong>{status.paypalStatus}</strong>{existingOrderId&&status.canRetry===true?" | Gleiche Testbestellung erneut bestaetigen moeglich":""}</p>}
   {invoice&&<p style={{marginTop:7}}>Rechnung: <strong>{invoice}</strong> | <a href={"/api/admin/qa-invoice?orderId="+orderId} target="_blank" rel="noreferrer">PDF ansehen</a></p>}
   {order&&<p style={{marginTop:10}}>Ein Testauftrag wurde gespeichert. Der Status wird alle 8 Sekunden nur lesend geprueft.</p>}
  </div>
 </section>;
}
