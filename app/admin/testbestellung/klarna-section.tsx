import {CreditCard,FileText} from "lucide-react";
import {RUBY_TEST_SELLER} from "@/lib/qa-invoice";
import {prepareKlarnaQaProductAction,startKlarnaQaPaymentAction,captureKlarnaQaPaymentAction,cancelKlarnaQaPaymentAction} from "../qa-klarna-actions";
import type {getKlarnaQaProduct} from "@/lib/qa-live-klarna";

type Product=Awaited<ReturnType<typeof getKlarnaQaProduct>>;
type Order={id:string;orderNumber:bigint;status:string;totalCents:number;paymentReference:string|null;createdAt:Date;reservationKey:string|null;invoice:{invoiceNumber:string}|null};
type Props={
 qa:Product;klarnaReady:boolean;orders:Order[];
 params:{klarnaReturn?:string;klarnaError?:string;klarnaPaid?:string;klarnaStatus?:string};
 approval:{approved:boolean;reason?:string;orderNumber?:string}|null;
};
export default function KlarnaQaTestSection({qa,klarnaReady,orders,params,approval}:Props){
 const pending=orders.find(x=>x.status==="pending_payment");
 const paid=orders.find(x=>x.status==="payment_confirmed");
 const returned=pending?.reservationKey&&pending.reservationKey===params.klarnaReturn?pending:null;
 const canStart=klarnaReady&&!!qa&&!qa.active&&!qa.variantActive&&qa.priceCents===100&&qa.stockQuantity===1&&!pending&&!paid;
 return <section className="rh-admin-panel-card" style={{marginTop:22}}>
  <div className="rh-admin-card-title"><div><span>KLARNA LIVE / NUR ADMIN</span><h2>1,00 € Klarna-Test per Karte</h2></div><CreditCard size={23}/></div>
  <p style={{marginTop:15,fontSize:13,lineHeight:1.75}}>Der Test führt zur <strong>offiziellen Klarna-Zahlungsseite</strong>. Dort kannst du die angezeigten Methoden wählen; Kreditkarte ist nur verfügbar, wenn Klarna sie für diesen Vorgang anbietet. Nach Klarna-Freigabe wird eine Bestellung angelegt, aber <strong>noch keine endgültige Abbuchung</strong> vorgenommen. Erst eine zweite ausdrückliche Bestätigung zieht 1,00 € ein und erstellt die PDF-Rechnung. Keine Warenlieferung. Der öffentliche Shop bleibt geschlossen.</p>
  {params.klarnaError&&<p role="alert" className="rh-admin-warning" style={{marginTop:15}}>Klarna-Test nicht abgeschlossen: {params.klarnaError.replaceAll("_"," ").slice(0,85)}. Vor einem erneuten Start bitte den Status prüfen.</p>}
  {params.klarnaStatus==="prepared"&&<p className="rh-admin-success">Versteckter Klarna-Testartikel vorbereitet. Keine Zahlung gestartet.</p>}
  {params.klarnaStatus==="cancelled"&&<p className="rh-admin-success">Unbezahlte Klarna-Testsitzung nach Anbieterprüfung freigegeben.</p>}
  {params.klarnaPaid&&orders.some(x=>x.id===params.klarnaPaid&&x.status==="payment_confirmed")&&<p className="rh-admin-success">Klarna-Einzug bestätigt. PDF-Testrechnung ist gespeichert.</p>}
  <div style={{border:"1px solid #e6d9df",padding:17,marginTop:15,fontSize:13}}>
   <strong>Test-Rechnungssteller (vor Zahlung bestätigen)</strong>
   <p style={{lineHeight:1.7,marginTop:9}}>{RUBY_TEST_SELLER.name}<br/>{RUBY_TEST_SELLER.street}<br/>{RUBY_TEST_SELLER.postalCode} {RUBY_TEST_SELLER.city}, Deutschland<br/>USt-ID: {RUBY_TEST_SELLER.vatId}</p>
   <p style={{fontSize:12}}>Nur 1,00 € inkl. 19 % USt. (0,16 €). Keine physische Lieferung.</p>
  </div>
  {!qa&&klarnaReady&&<form action={prepareKlarnaQaProductAction} style={{marginTop:18}}><button type="submit" className="rh-admin-mail-test-button">Versteckten Klarna-Testartikel vorbereiten</button></form>}
  {orders.length>0&&<div style={{marginTop:20}}>
   <strong style={{fontSize:13}}>Klarna-Testaufträge</strong>
   {orders.map(x=><div key={x.id} style={{borderBottom:"1px solid #eadde2",padding:"12px 0",fontSize:13}}>
    <strong>#{x.orderNumber.toString()}</strong> · {x.status} · {(x.totalCents/100).toFixed(2)} €
    {x.invoice&&<p style={{marginTop:6}}><a href={"/api/admin/qa-invoice?orderId="+x.id}><FileText size={15} style={{verticalAlign:"middle"}}/> PDF-Rechnung {x.invoice.invoiceNumber}</a></p>}
    {x.status==="pending_payment"&&<form action={cancelKlarnaQaPaymentAction} style={{marginTop:7}}><input type="hidden" name="orderId" value={x.id}/><button className="rh-admin-mail-test-button" type="submit">Klarna-Status prüfen und nur ohne Zahlung abbrechen</button></form>}
   </div>)}
  </div>}
  {returned&&approval?.approved&&<form action={captureKlarnaQaPaymentAction} style={{border:"1px solid #b58a9d",padding:20,marginTop:20}}>
   <strong>Klarna-Freigabe geprüft: Bestellung #{approval.orderNumber}</strong>
   <p style={{fontSize:12,lineHeight:1.75,marginTop:9}}>Klarna hat die Bestellung bestätigt. Erst nach deinem nächsten Klick wird einmalig eine echte Zahlung von 1,00 € eingezogen. Anschließend wird die PDF-Rechnung erstellt. Bitte nicht zweimal klicken.</p>
   <input type="hidden" name="reservationKey" value={returned.reservationKey||""}/>
   <label style={{display:"flex",gap:10,fontSize:12,margin:"12px 0"}}><input type="checkbox" name="confirmKlarnaCapture" required/> Ich stimme dem echten einmaligen Klarna-Einzug über 1,00 € zu.</label>
   <button type="submit" className="rh-admin-mail-test-button">1,00 € mit Klarna einziehen und PDF-Rechnung erstellen</button>
  </form>}
  {returned&&approval&&!approval.approved&&<p className="rh-admin-warning" style={{marginTop:14}}>Die Klarna-Rückkehr allein ist keine Zahlungsbestätigung. Status: {approval.reason?.replaceAll("_"," ")||"unbekannt"}. Kein Einzug möglich.</p>}
  {canStart&&<form action={startKlarnaQaPaymentAction} style={{display:"grid",gap:14,marginTop:20,maxWidth:610}}>
   <label style={{fontSize:13}}>Käufername<input required minLength={2} maxLength={100} name="buyerName" autoComplete="name" style={{display:"block",marginTop:7,width:"100%",padding:12,border:"1px solid #d9cdd1"}}/></label>
   <label style={{fontSize:13}}>E-Mail für die Testrechnung<input required type="email" name="buyerEmail" maxLength={254} autoComplete="email" style={{display:"block",marginTop:7,width:"100%",padding:12,border:"1px solid #d9cdd1"}}/></label>
   <label style={{display:"flex",gap:10,fontSize:12}}><input type="checkbox" name="confirmSeller" required/> Rechnungssteller, Anschrift und USt-ID sind korrekt.</label>
   <label style={{display:"flex",gap:10,fontSize:12}}><input type="checkbox" name="confirmTax" required/> 19 % Umsatzsteuer für diesen Test sind bestätigt.</label>
   <label style={{display:"flex",gap:10,fontSize:12}}><input type="checkbox" name="confirmCharge" required/> Klarna Live-Test kann eine echte Zahlung von 1,00 € auslösen. Keine Lieferung.</label>
   <button type="submit" className="rh-admin-mail-test-button">1,00 € Klarna-Kartentest starten</button>
  </form>}
  {!klarnaReady&&<p className="rh-admin-warning" style={{marginTop:18}}>Klarna Live-Zugangsdaten fehlen. Keine Zahlung möglich.</p>}
  {pending&&!returned&&<p style={{marginTop:16,fontSize:12,color:"#985e70"}}>Eine Klarna-Testbestellung ist bereits offen. Keine zweite Zahlung beginnen; erst den vorhandenen Auftrag prüfen.</p>}
  {paid&&<p style={{marginTop:16,fontSize:12,color:"#448052"}}>Klarna-Test bereits bezahlt. Weitere Abbuchungen gesperrt.</p>}
 </section>;
}
