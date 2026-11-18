import {CreditCard,FileText} from "lucide-react";
import {RUBY_TEST_SELLER} from "@/lib/qa-invoice";
import {startOneEuroQaPaymentAction,captureOneEuroQaPaymentAction,cancelPendingOneEuroQaPaymentAction} from "../qa-purchase-actions";
import type {getHiddenQaProduct} from "@/lib/internal-test-product";

type Item=Awaited<ReturnType<typeof getHiddenQaProduct>>;
type QaOrder={id:string;orderNumber:bigint;status:string;totalCents:number;paymentReference:string|null;createdAt:Date;invoice:{invoiceNumber:string}|null};
type Params={paypalToken?:string;qaError?:string;paid?:string};
export default function QaPayPalTestSection({qa,paypalReady,orders,params}:{qa:Item;paypalReady:boolean;orders:QaOrder[];params:Params}){
 const pending=orders.find(o=>o.status==="pending_payment");
 const paid=orders.find(o=>o.status==="payment_confirmed");
 const approved=orders.find(o=>o.status==="pending_payment"&&o.paymentReference===params.paypalToken);
 const canStart=paypalReady&&qa&&!qa.productActive&&!qa.variantActive&&qa.stockQuantity===1&&!pending&&!paid;
 return <section className="rh-admin-panel-card" style={{marginTop:20}}>
  <div className="rh-admin-card-title"><div><span>PAYPAL LIVE / NUR ADMIN</span><h2>1,00 € Testzahlung und PDF-Rechnung</h2></div><CreditCard size={23}/></div>
  <p style={{fontSize:13,lineHeight:1.75,marginTop:14}}>
   Die folgende Testbestellung ist ausschließlich für Ruby-Hair-Administratoren. Bei PayPal wird bevorzugt <strong>Debit- oder Kreditkartenzahlung ohne PayPal-Konto</strong> angezeigt, sofern PayPal diese Option für den Vorgang anbietet. Nach der Freigabe kann mit einem zweiten Klick eine <strong>echte Zahlung von 1,00 €</strong> ausgelöst werden. Es erfolgt <strong>keine Warenlieferung</strong>. Die Rechnung wird nur nach verifizierter Zahlung erstellt.
  </p>
  {params.qaError&&<p role="alert" className="rh-admin-warning" style={{marginTop:14}}>
   Der Test wurde nicht abgeschlossen ({params.qaError.replaceAll("_"," ").slice(0,95)}). Bestellstatus kontrollieren, bevor du erneut testest.
  </p>}
  {params.paid&&orders.some(o=>o.id===params.paid&&o.status==="payment_confirmed")&&<p role="status" className="rh-admin-success" style={{marginTop:14}}>
   Die 1-€-Zahlung wurde mit PayPal abgeglichen; die PDF-Testrechnung ist gesichert. Es wurde keine Ware verschickt.
  </p>}
  <div style={{border:"1px solid #e6d9df",padding:19,borderRadius:5,marginTop:20,fontSize:13}}>
   <strong>Rechnungssteller laut altem Ruby-Hair-Impressum (bitte bestätigen)</strong>
   <p style={{marginTop:9,lineHeight:1.8}}>{RUBY_TEST_SELLER.name}<br/>{RUBY_TEST_SELLER.street}<br/>
    {RUBY_TEST_SELLER.postalCode} {RUBY_TEST_SELLER.city}, {RUBY_TEST_SELLER.country}<br/>USt-ID: {RUBY_TEST_SELLER.vatId}</p>
   <p style={{fontSize:12,color:"#725762",lineHeight:1.7}}>Der interne Kleinbetrags-Test ist auf 1,00 € inkl. 19 % USt. (0,16 €) eingestellt. Bestätige vor der Zahlung Anschrift, USt-ID und steuerliche Behandlung. Allgemeine Kundenrechnungen sind noch nicht freigeschaltet.</p>
  </div>
  {orders.length>0&&<div style={{marginTop:22}}>
   <p style={{fontSize:13,fontWeight:700}}>Bisherige interne Testaufträge</p>
   {orders.map(order=><div key={order.id} style={{padding:"12px 0",borderBottom:"1px solid #eadde2",fontSize:13}}>
    <strong>#{order.orderNumber.toString()}</strong> · {order.status} · {(order.totalCents/100).toFixed(2)} € · {new Date(order.createdAt).toLocaleString("de-DE",{timeZone:"Europe/Berlin"})}
    {order.invoice&&<p style={{marginTop:7}}><a href={`/api/admin/qa-invoice?orderId=${order.id}`}><FileText size={15} style={{verticalAlign:"middle"}}/> PDF-Rechnung {order.invoice.invoiceNumber}</a></p>}
    {order.status==="pending_payment"&&<form action={cancelPendingOneEuroQaPaymentAction} style={{marginTop:8}}>
      <input type="hidden" name="orderId" value={order.id}/>
      <button type="submit" className="rh-admin-mail-test-button">Unbezahlte PayPal-Bestellung kontrollieren und ggf. abbrechen</button>
    </form>}
   </div>)}
  </div>}
  {approved&&<form action={captureOneEuroQaPaymentAction} style={{border:"1px solid #b58a9d",borderRadius:5,padding:20,marginTop:22}}>
   <strong>Zurück von PayPal: echten Testbetrag bestätigen</strong>
   <p style={{fontSize:12,lineHeight:1.7,marginTop:8}}>Dieser Schritt kann 1,00 € vom PayPal-Konto abbuchen. Danach wird der verifizierte Zahlungseingang gespeichert und einmalig eine Rechnung erzeugt.</p>
   <input type="hidden" name="paypalOrderId" value={params.paypalToken}/>
   <label style={{display:"flex",gap:10,fontSize:12,alignItems:"flex-start",margin:"14px 0"}}><input type="checkbox" required name="confirmCapture"/> Ich bestätige die echte Abbuchung von 1,00 €.</label>
   <button type="submit" className="rh-admin-mail-test-button">1,00 € abbuchen und PDF-Rechnung erzeugen</button>
  </form>}
  {canStart&&<form action={startOneEuroQaPaymentAction} style={{display:"grid",gap:16,marginTop:23,maxWidth:610}}>
   <label style={{fontSize:13}}>Käufername
    <input required name="buyerName" minLength={2} maxLength={100} autoComplete="name" placeholder="Vor- und Nachname" style={{display:"block",marginTop:7,width:"100%",padding:12,border:"1px solid #d9cdd1"}}/>
   </label>
   <label style={{fontSize:13}}>E-Mail für die Rechnung
    <input required name="buyerEmail" type="email" maxLength={254} autoComplete="email" placeholder="name@beispiel.de" style={{display:"block",marginTop:7,width:"100%",padding:12,border:"1px solid #d9cdd1"}}/>
   </label>
   <label style={{display:"flex",gap:10,fontSize:12,lineHeight:1.5}}><input required type="checkbox" name="confirmSeller"/> Rechnungsanschrift und USt-ID oben sind korrekt und aktuell.</label>
   <label style={{display:"flex",gap:10,fontSize:12,lineHeight:1.5}}><input required type="checkbox" name="confirmTax"/> 19 % Umsatzsteuer für diesen Testvorgang ist bestätigt.</label>
   <label style={{display:"flex",gap:10,fontSize:12,lineHeight:1.5}}><input required type="checkbox" name="confirmCharge"/> Ich verstehe, dass der live PayPal-Test 1,00 € kostet. Es erfolgt keine Lieferung.</label>
   <button type="submit" className="rh-admin-mail-test-button">PayPal-Testbestellung über 1,00 € starten</button>
  </form>}
  {!canStart&&!pending&&!paid&&<p style={{fontSize:12,color:"#985e70",marginTop:20}}>Die Testzahlung kann erst gestartet werden, wenn der versteckte 1-€-Artikel verfügbar und PayPal eingerichtet ist.</p>}
  {pending&&!approved&&<p style={{fontSize:12,color:"#985e70",marginTop:20}}>Eine Testbestellung wartet auf die PayPal-Freigabe. Bitte aus Sicherheitsgründen nicht einfach eine zweite Bestellung starten.</p>}
  {paid&&<p style={{fontSize:12,color:"#448052",marginTop:20}}>Ein echter 1-€-Test wurde bereits abgeschlossen. Weitere Abbuchungen sind standardmäßig gesperrt.</p>}
 </section>;
}
