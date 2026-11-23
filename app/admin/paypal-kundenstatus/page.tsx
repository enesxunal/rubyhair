import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {isAdmin} from "@/lib/admin-auth";
import {getPrisma} from "@/lib/prisma";
import {providerForCheckout} from "@/lib/customer-checkout";
import AdminShell from "../admin-shell";
import {reconcileCapturedPayPalCustomerOrder} from "./actions";

export const metadata:Metadata={title:"PayPal Kundenbestellung prüfen | Ruby Hair",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
const obj=(v:unknown):v is Record<string,unknown>=>Boolean(v)&&typeof v==="object"&&!Array.isArray(v);
const euro=(c:number)=>new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(c/100);

/** Read-only incident audit. No capture, authorization, refund or order writes. */
export default async function CustomerPayPalStatus({searchParams}:{searchParams:Promise<{orderNumber?:string;result?:string}>}){
 if(!await isAdmin())redirect("/admin/login");
 const p=await searchParams;
 const number=/^\d{1,10}$/.test(p.orderNumber||"")?BigInt(p.orderNumber!):BigInt(10);
 const order=await getPrisma().order.findUnique({where:{orderNumber:number},
  select:{id:true,orderNumber:true,createdAt:true,status:true,totalCents:true,giftAppliedCents:true,paymentReference:true,testOnly:true,
    invoice:{select:{invoiceNumber:true}},payments:{select:{eventType:true,provider:true}}}});
 let paypalStatus="NICHT ABGEFRAGT",paymentSource="UNBEKANNT",captureStatus="KEIN CAPTURE",captureAmount="–",paypalAmount="–",liability="UNBEKANNT";
 let verified=false,providerError:string|null=null;
 if(order&&!order.testOnly&&order.paymentReference&&!order.paymentReference.startsWith("KLARNA-HPP:")){
  try{
   const {api}=await providerForCheckout("paypal");
   const raw=await api.getOrderWithPaymentSource(order.paymentReference);
   if(!obj(raw))throw new Error("INVALID_PROVIDER_RESULT");
   paypalStatus=typeof raw.status==="string"?raw.status:"UNKNOWN";
   const source=obj(raw.payment_source)?raw.payment_source:null;
   paymentSource=source?Object.keys(source).join(", "):"NICHT GEMELDET";
   const card=source&&obj(source.card)?source.card:null;
   const auth=card&&obj(card.authentication_result)?card.authentication_result:null;
   liability=auth&&typeof auth.liability_shift==="string"?auth.liability_shift:"NICHT GEMELDET";
   const units=Array.isArray(raw.purchase_units)?raw.purchase_units:[];
   const unit=units.length===1&&obj(units[0])?units[0]:null;
   const itemAmount=unit&&obj(unit.amount)?unit.amount:null;
   if(itemAmount&&itemAmount.currency_code==="EUR"&&typeof itemAmount.value==="string")paypalAmount=itemAmount.value+" EUR";
   const payments=unit&&obj(unit.payments)?unit.payments:null;
   const captures=payments&&Array.isArray(payments.captures)?payments.captures:[];
   const capture=captures.length===1&&obj(captures[0])?captures[0]:null;
   captureStatus=capture&&typeof capture.status==="string"?capture.status:"KEIN CAPTURE";
   const capAmount=capture&&obj(capture.amount)?capture.amount:null;
   if(capAmount&&capAmount.currency_code==="EUR"&&typeof capAmount.value==="string")captureAmount=capAmount.value+" EUR";
   try{api.requireCompletedCapture(raw,order.id,order.totalCents-order.giftAppliedCents,order.paymentReference);verified=true}catch{}
  }catch(e){providerError=e instanceof Error?e.name:"READ_FAILED"}
 }
 return <AdminShell current="orders" title="PayPal Kundenbestellung prüfen" description="Direkte Live-API-Abfrage. Nur lesen, keine neue Bestellung, keine Abbuchung und keine Rückerstattung.">
  <section className="rh-admin-panel-card" style={{padding:26,maxWidth:850}}>
   <p><strong>Ruby Hair Bestellung:</strong> {order&&!order.testOnly?"RH-"+String(order.orderNumber):"Nicht gefunden"}</p>
   <p><strong>Bestellzeit:</strong> {order?.createdAt.toLocaleString("de-DE",{timeZone:"Europe/Berlin"})||"–"}</p>
   <p><strong>Bestellbetrag:</strong> {order?euro(order.totalCents):"–"}</p>
   <p><strong>Ruby Hair Status:</strong> {order?.status||"–"}</p>
   <p><strong>Ruby Hair Capture-Nachweise:</strong> {order?.payments.filter(x=>x.provider==="paypal"&&x.eventType==="PAYMENT.CAPTURE.COMPLETED").length||0}</p>
   <p><strong>Rechnung:</strong> {order?.invoice?.invoiceNumber||"Noch keine Rechnung"}</p>
   <hr style={{margin:"22px 0"}}/>
   <p><strong>PayPal Order-Status:</strong> {paypalStatus}</p>
   <p><strong>PayPal Zahlungsquelle:</strong> {paymentSource}</p>
   <p><strong>PayPal Bestellbetrag:</strong> {paypalAmount}</p>
   <p><strong>3DS Liability Shift:</strong> {liability}</p>
   <p><strong>PayPal Capture-Status:</strong> {captureStatus}</p>
   <p><strong>PayPal Capture-Betrag:</strong> {captureAmount}</p>
   <p><strong>Exakte Capture-Zuordnung:</strong> {verified?"JA":"NEIN / NICHT BESTÄTIGT"}</p>
   {providerError&&<p className="rh-admin-warning" role="alert">PayPal konnte nicht abgefragt werden: {providerError}. Keine neue Zahlung ausgelöst.</p>}
   {p.result==="paid"&&<p className="rh-admin-success">Der bereits erfasste PayPal-Betrag wurde mit der Ruby-Hair-Bestellung und Rechnung abgeglichen. Keine neue Abbuchung.</p>}
   {p.result==="review"&&<p className="rh-admin-warning">Keine bestätigte Buchung übernommen. Bitte den PayPal-Status prüfen; keine neue Zahlung auslösen.</p>}
   {verified&&order?.status==="pending_payment"&&<>
    <p className="rh-admin-success">PayPal bestätigt vollständig eingezogene Zahlung. Ruby Hair muss OHNE neuen Capture abgeglichen werden.</p>
    <form action={reconcileCapturedPayPalCustomerOrder} style={{marginTop:15}}>
     <input type="hidden" name="orderNumber" value={String(order.orderNumber)}/>
     <button type="submit" className="rh-admin-primary-button">Erfasste PayPal-Zahlung ohne erneute Abbuchung übernehmen</button>
    </form>
   </>}
   {order?.status==="pending_payment"&&!verified&&<p className="rh-admin-warning">Keine abgeschlossene PayPal-Zahlung nachgewiesen. Eine Bankfreigabe ist nicht automatisch ein Capture. Nicht erneut bezahlen.</p>}
   <p style={{marginTop:22}}><Link href={"/admin/paypal-kundenstatus?orderNumber="+String(number)}>Nur lesen: erneut prüfen</Link> · <Link href="/admin/bestellungen">Zurück zu Bestellungen</Link></p>
  </section>
 </AdminShell>;
}
