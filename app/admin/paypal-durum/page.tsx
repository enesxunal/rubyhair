import type {Metadata} from "next";
import {redirect} from "next/navigation";
import {reconcileLiveVariantTestAction} from "../../live-variant-test-actions";
import {isAdmin} from "@/lib/admin-auth";
import {getPrisma} from "@/lib/prisma";
import {PaypalClient,PaypalError} from "@/lib/paypal-provider-core";
import {loadPaymentValue} from "@/lib/payment-secrets";
import PayPalCardEligibilityCheck from "@/components/paypal-card-eligibility-check";

export const metadata:Metadata={title:"PayPal 1 EUR Status – Ruby Hair",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";

type PayPalAudit={status:string;captureStatus:string;captureAmount:string;verified:boolean;matchedOrder:boolean;error:string|null};
const obj=(v:unknown):v is Record<string,unknown>=>typeof v==="object"&&v!==null&&!Array.isArray(v);
const safe=(e:unknown)=>e instanceof PaypalError?e.code:"PROVIDER_READ_UNAVAILABLE";

export default async function PayPalStatusPage(){
 if(!await isAdmin())redirect("/admin/login");
 const livePublicClientId=await loadPaymentValue("paypal","live","clientId").catch(()=>null);
 const db=getPrisma();
 const variant=await db.variant.findUnique({where:{legacyId:886},select:{id:true,priceCents:true,stockQuantity:true}});
 const order=variant?await db.order.findFirst({
  where:{testOnly:true,lines:{some:{variantId:variant.id}}},orderBy:{createdAt:"desc"},
  select:{id:true,orderNumber:true,totalCents:true,status:true,paymentReference:true,invoice:{select:{invoiceNumber:true}}}
 }):null;
 let audit:PayPalAudit|null=null;
 if(order?.paymentReference){
  try{
   const [clientId,clientSecret,webhookId]=await Promise.all([
    loadPaymentValue("paypal","live","clientId"),loadPaymentValue("paypal","live","clientSecret"),loadPaymentValue("paypal","live","webhookId")
   ]);
   if(!clientId||!clientSecret||!webhookId)throw new Error("VAULT_NOT_READY");
   const api=new PaypalClient("live",{clientId,clientSecret,webhookId});
   const data=await api.getOrder(order.paymentReference);
   if(!obj(data))throw new Error("INVALID_RESPONSE");
   const units=Array.isArray(data.purchase_units)?data.purchase_units:[];
   const unit=units.length===1&&obj(units[0])?units[0]:null;
   const payment=unit&&obj(unit.payments)?unit.payments:null;
   const captures=payment&&Array.isArray(payment.captures)?payment.captures:[];
   const capture=captures.length===1&&obj(captures[0])?captures[0]:null;
   const amount=capture&&obj(capture.amount)?capture.amount:null;
   let verified=false;
   try{api.requireCompletedCapture(data,order.id,100,order.paymentReference);verified=true}catch{}
   audit={
    status:typeof data.status==="string"?data.status:"UNKNOWN",
    captureStatus:capture&&typeof capture.status==="string"?capture.status:"NONE",
    captureAmount:amount&&typeof amount.value==="string"&&amount.currency_code==="EUR"?amount.value+" EUR":"UNKNOWN",
    matchedOrder:Boolean(unit?.custom_id===order.id),verified,error:null
   };
  }catch(e){audit={status:"UNKNOWN",captureStatus:"UNKNOWN",captureAmount:"UNKNOWN",matchedOrder:false,verified:false,error:safe(e)}}
 }
 return <main style={{maxWidth:780,margin:"55px auto",padding:25,color:"#372630",fontFamily:"system-ui,sans-serif",lineHeight:1.65}}>
  <h1>PayPal – 1 € Teststatus</h1>
  <p>Nur lesen. Diese Seite startet keine neue Bestellung, keine Abbuchung und keine Rückerstattung.</p>
  <div style={{background:"#f5eff2",padding:23,border:"1px solid #ccb9c4"}}>
   <p><strong>Ruby Hair Bestellung:</strong> {order?String(order.orderNumber):"Nicht gefunden"}</p>
   <p><strong>Ruby Hair Status:</strong> {order?.status||"UNKNOWN"}</p>
   <p><strong>Ruby Hair Rechnung:</strong> {order?.invoice?.invoiceNumber||"Nicht erstellt"}</p>
   <p><strong>Produktpreis / Testlager:</strong> {variant?`${(variant.priceCents/100).toFixed(2)} EUR / ${variant.stockQuantity===null?"leer":variant.stockQuantity}`:"UNKNOWN"}</p>
   <hr/>
   <p><strong>PayPal Bestellstatus:</strong> {audit?.status||"Nicht abrufbar"}</p>
   <p><strong>PayPal Capture-Status:</strong> {audit?.captureStatus||"Nicht abrufbar"}</p>
   <p><strong>PayPal Capture-Betrag:</strong> {audit?.captureAmount||"Nicht abrufbar"}</p>
   <p><strong>Exakte 1-€-Zuordnung verifiziert:</strong> {audit?.verified?"JA":"NEIN / NICHT BESTÄTIGT"}</p>
   {audit?.error&&<p style={{color:"#8e3040"}}>Abfragefehler: {audit.error}</p>}
  </div>
  <p style={{fontWeight:650}}>{audit?.verified?
   "PayPal meldet eine abgeschlossene Zahlung. Ruby Hair muss ohne erneuten Einzug abgeglichen werden.":
   "Noch keine als abgeschlossen verifizierte Zahlung. Bitte NICHT erneut auf Einziehen klicken."}</p>
  {audit?.verified&&order?.status==="pending_payment"&&<form action={reconcileLiveVariantTestAction} style={{padding:18,background:"#ecf6ed",border:"1px solid #7a9b80"}}>
   <strong>PayPal 1,00 € bereits bezahlt. Ohne neue Abbuchung synchronisieren.</strong>
   <p>Nur Ruby Hair Bestellung, Zahlungsnachweis, PDF-Rechnung und ursprünglichen Produktpreis wiederherstellen. Kein weiterer PayPal-Einzug.</p>
   <label style={{display:"flex",gap:9,alignItems:"flex-start"}}>
    <input name="confirmNoCharge" type="checkbox" required/> Ich bestätige die Abstimmung der bereits bezahlten Bestellung ohne neue Zahlung.
   </label>
   <button type="submit" style={{marginTop:16,padding:"14px 18px",background:"#3f6b51",color:"#fff",border:0,cursor:"pointer"}}>
    Bereits bezahlte 1-€-Bestellung abgleichen und Rechnung erstellen
   </button>
  </form>}
  <PayPalCardEligibilityCheck clientId={livePublicClientId}/>
  <p><a href="/kasse?liveTest=1">Zurück zur Kasse</a></p>
 </main>;
}
