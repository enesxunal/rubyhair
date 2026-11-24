import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {ClipboardList,Clock3,ArrowUpRight,ShieldCheck,WalletCards} from "lucide-react";
import {isAdmin} from "@/lib/admin-auth";
import {getPrisma} from "@/lib/prisma";
import {isKnownOrderState,orderStates} from "@/lib/order-lifecycle";
import {publicCheckoutMode} from "@/lib/customer-checkout";
import AdminShell from "../admin-shell";
import {updateFulfillmentAction} from "../actions";
import {confirmManualKlarnaHandoverAction} from "../klarna-manual-actions";
import {createOrderDhlLabelAction,cancelOrderDhlLabelAction} from "../dhl-order-actions";

export const metadata:Metadata={title:"Bestellungen | Ruby Hair Verwaltung",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export const runtime="nodejs";
const filters=["alle","tests","ohne-testkennzeichen","offen"] as const;
const euro=(cents:number)=>new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(cents/100);
const date=(value:Date)=>new Intl.DateTimeFormat("de-DE",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Berlin"}).format(value);
const addressText=(value:unknown)=>{
 if(!value||typeof value!=="object"||Array.isArray(value))return null;
 const a=value as Record<string,unknown>;
 return ["firstName","lastName","street","address1","address2","postalCode","postcode","city","country"]
   .map(key=>typeof a[key]==="string"?a[key]:"").filter(Boolean).join(", ")||null;
};

export default async function AdminOrders({searchParams}:{searchParams:Promise<{filter?:string;seite?:string;manualKlarna?:string;dhl?:string}>}){
 if(!await isAdmin())redirect("/admin/login");
 const params=await searchParams;
 const filter=filters.find(f=>f===params.filter)||"ohne-testkennzeichen";
 const requestedPage=Number(params.seite);
 const page=Number.isSafeInteger(requestedPage)&&requestedPage>0?Math.min(requestedPage,10000):1;
 const where=filter==="tests"?{testOnly:true}:filter==="ohne-testkennzeichen"?{testOnly:false}:
    filter==="offen"?{testOnly:true,status:"test_reserved"}:{};
 const db=getPrisma();
 // One grouped count and sequential reads keep the single-connection pool free.
 const groups=await db.order.groupBy({by:["testOnly","status"],_count:{_all:true}});
 const realCount=groups.filter(g=>!g.testOnly).reduce((n,g)=>n+g._count._all,0);
 const testCount=groups.filter(g=>g.testOnly).reduce((n,g)=>n+g._count._all,0);
 const count=filter==="alle"?realCount+testCount:filter==="tests"?testCount:filter==="offen"?groups.filter(g=>g.testOnly&&g.status==="test_reserved").reduce((n,g)=>n+g._count._all,0):realCount;
 const orders=await db.order.findMany({where,orderBy:[{createdAt:"desc"},{id:"asc"}],skip:(page-1)*20,take:20,include:{
   lines:{select:{quantity:true,unitPriceCents:true,lineTotalCents:true,variant:{select:{colorLabel:true,lengthLabel:true,product:{select:{name:true}}}}}},
   giftPurchases:{select:{id:true,amountCents:true,recipientName:true,delivery:true,recipientEmail:true,status:true,buyerMailStatus:true,recipientMailStatus:true}},
   payments:{select:{eventType:true,provider:true,providerEventId:true}},
   invoice:{select:{invoiceNumber:true}},
   shippingJob:{select:{status:true,trackingNumber:true}},
   notifications:{select:{stage:true,status:true}},
   statusEvents:{orderBy:{createdAt:"asc"},select:{createdAt:true,fromStatus:true,toStatus:true,reason:true}}
  }});
 // PDF bytes are fetched only by the protected download endpoint.
 const labels=orders.length?await db.shippingJob.findMany({where:{orderId:{in:orders.map(o=>o.id)},labelPdf:{not:null}},select:{orderId:true}}):[];
 const labelOrderIds=new Set(labels.map(l=>l.orderId));
 const totalPages=Math.max(1,Math.ceil(count/20));
 const link=(p:number)=>"/admin/bestellungen?filter="+filter+"&seite="+p;
 return <AdminShell current="orders" title="Bestellübersicht." description="Bestellungen, Sendungsnummern und Statusverlauf. Klarna-Einzug bei manuellem DHL-Versand nur nach bestätigter physischer Paketübergabe.">
  <div className="rh-admin-warning"><strong>Checkout-Modus: {publicCheckoutMode()==="disabled"?"Nur Vorbereitung":publicCheckoutMode()==="admin_test"?"Admin-Test":publicCheckoutMode()==="klarna_public"?"Klarna live / DHL manuell":publicCheckoutMode()==="payments_public"?"PayPal + Klarna live / DHL manuell":"Kunden"}.</strong> Nur durch den Zahlungsanbieter verifizierte Transaktionen zählen als bezahlt. Testreservierungen zählen nicht als Umsatz.</div>
  <details className="rh-admin-advanced-tools"><summary>Erweiterte Zahlungs- und Versandprüfung</summary><nav aria-label="Weitere Prüfwerkzeuge">
   <Link href="/admin/klarna-durum">Klarna-Zahlung prüfen (nur lesen)</Link>
   <Link href="/admin/dhl">DHL-Verbindung einrichten</Link>
   <Link href="/admin/erstattungen">Erstattungsstatus prüfen (nur lesen)</Link>
  </nav></details>
  {params.dhl&&<div className="rh-admin-warning">{params.dhl==="created"?"DHL-Versandetikett erstellt. PDF in der Bestellung herunterladen.":params.dhl==="canceled"?"DHL-Versandetikett storniert.": "DHL-Vorgang nicht abgeschlossen. Bitte Status prüfen; nicht erneut buchen, solange das Ergebnis unklar ist."}</div>}
  <div className="rh-admin-pill-row">
   <span className="rh-admin-stat-pill">{realCount} Kundenbestellungen</span>
   <span className="rh-admin-stat-pill">{testCount} Testdatensätze</span>
  </div>
  <nav className="rh-admin-filters" aria-label="Bestellfilter">
   {[
    {value:"ohne-testkennzeichen",label:"Kundenbestellungen"},
    {value:"tests",label:"Testbestellungen"},
    {value:"alle",label:"Alle anzeigen"}
   ].map(item=><Link key={item.value} href={"/admin/bestellungen?filter="+item.value}
       aria-current={filter===item.value?"page":undefined} className={filter===item.value?"is-active":undefined}>{item.label}</Link>)}
  </nav>
  {filter==="tests"&&<p className="rh-admin-muted"><Link href="/admin/bestellungen?filter=offen">Nur offene Testreservierungen</Link></p>}
  {orders.length===0?<div className="rh-admin-panel-card rh-admin-empty rh-studio-orders-empty">
      <span className="rh-studio-orders-empty-icon"><ClipboardList size={27}/></span><h2>Noch keine Bestelldatensätze</h2>
      <p>In diesem Filter liegen keine Bestellungen vor. Testdaten und Kundenbestellungen werden getrennt angezeigt.</p>
      <div className="rh-studio-orders-next">
       <Link href="/admin/zahlungen"><WalletCards size={16}/> Zahlungsintegration vorbereiten <ArrowUpRight size={15}/></Link>
       <Link href="/admin/produkte"><ShieldCheck size={16}/> Bestände prüfen <ArrowUpRight size={15}/></Link>
      </div>
     </div>:
   <section className="rh-admin-panel-card rh-admin-orders-card">
    <div className="rh-admin-card-title"><div><span>DATENBANK / LESEN</span><h2>{count} Einträge</h2></div><span>Seite {page} von {totalPages}</span></div>
    <div className="rh-admin-orders-list">
     {orders.map(order=><details key={order.id} className="rh-admin-order-item">
      <summary><span className="rh-admin-order-number">#{order.orderNumber.toString()} <small>{order.testOnly?"TESTDATENSATZ":order.payments.some(p=>p.eventType==="PAYMENT.CAPTURE.COMPLETED")?"BEZAHLT":order.status==="payment_authorized"?"AUTORISIERT":"OFFEN"}</small></span>
       <span className="rh-admin-order-status">{isKnownOrderState(order.status)?orderStates[order.status]:order.status}</span>
       <span>{date(order.createdAt)}</span>
       <strong>{euro(order.totalCents)}</strong>
      </summary>
      <div className="rh-admin-order-expanded">
       <div className="rh-admin-order-meta"><p><strong>Datensatz-ID:</strong> {order.id}</p>
        <p><strong>Reservierung bis:</strong> {order.reservationExpiresAt?date(order.reservationExpiresAt):"Keine"}</p>
        <p><strong>Artikelwert:</strong> {euro(order.subtotalCents)} · <strong>Erfasster Versand:</strong> {euro(order.shippingCents)}</p>
        <p><strong>Kunde:</strong> {order.customerEmail||"Nicht erfasst"}</p>
        <p><strong>Rechnungsadresse:</strong> {addressText(order.billingAddress)||"Nicht erfasst"}</p>
        <p><strong>Lieferadresse:</strong> {addressText(order.shippingAddress)||"Nicht erfasst"}</p>
        <p><strong>Versand:</strong> {order.lines.length?`${order.trackingCarrier||"Noch nicht versendet"} ${order.trackingNumber||""}`:"Rein digital – kein DHL-Paket"}</p>
        {order.invoice&&<p><a href={`/api/admin/customer-document?orderId=${order.id}&type=invoice`} target="_blank" rel="noopener noreferrer">Rechnung {order.invoice.invoiceNumber} herunterladen</a></p>}
        {order.shippingJob&&<p><strong>DHL Automatik:</strong> {order.shippingJob.status} {order.shippingJob.trackingNumber||""}</p>}
        {labelOrderIds.has(order.id)&&<p><a href={`/api/admin/customer-document?orderId=${order.id}&type=label`} target="_blank" rel="noopener noreferrer">DHL Paketlabel PDF herunterladen</a></p>}
        {order.notifications.length>0&&<p><strong>Automatische E-Mails:</strong> {order.notifications.map(n=>n.stage+": "+n.status).join(" · ")}</p>}
        {order.fulfillmentNote&&<p><strong>Interne Notiz:</strong> {order.fulfillmentNote}</p>}</div>
       {!order.testOnly&&order.lines.length>0&&["payment_confirmed","preparing"].includes(order.status)&&order.paymentReference&&order.payments.some(p=>p.eventType==="PAYMENT.CAPTURE.COMPLETED"&&p.provider!=="manual"&&p.providerEventId.length>0)&&!order.trackingNumber&&["waiting_credentials","canceled"].includes(order.shippingJob?.status||"")&&<form action={createOrderDhlLabelAction} className="rh-admin-fulfillment-form">
        <h3>DHL Versandetikett erstellen</h3><p>500 g, GoGreen Plus gemäß DHL-Vertrag. Kostenpflichtige Buchung; noch keine Versandbestätigung.</p>
        <input type="hidden" name="id" value={order.id}/><label><input type="checkbox" name="confirmed" required/> Kostenpflichtiges DHL-Etikett erstellen</label><button type="submit">Versandetikett erstellen</button>
       </form>}
       {!order.testOnly&&["payment_confirmed","preparing"].includes(order.status)&&["label_created","awaiting_handover"].includes(order.shippingJob?.status||"")&&order.shippingJob?.trackingNumber&&<form action={cancelOrderDhlLabelAction} className="rh-admin-fulfillment-form">
        <h3>DHL Versandetikett stornieren</h3><p>Nur vor Tagesabschluss und tatsächlicher Paketübergabe. Stornierung wird bei DHL geprüft.</p><input type="hidden" name="id" value={order.id}/><label><input type="checkbox" name="confirmed" required/> Dieses Etikett stornieren</label><button type="submit">Versandetikett stornieren</button>
       </form>}
       {!order.testOnly&&order.status==="payment_authorized"&&order.paymentReference?.startsWith("KLARNA-HPP:")&&
         <form action={confirmManualKlarnaHandoverAction} className="rh-admin-fulfillment-form">
          <h3>{["label_created","awaiting_handover"].includes(order.shippingJob?.status||"")?"DHL-Label vorhanden – reale Paketübergabe bestätigen":"Klarna: DHL-Versand manuell abschließen"}</h3>
          <p>Nur wenn du das echte Paket bereits bei DHL abgegeben hast. Bei Klarna wird ein noch nicht eingezogener Betrag erst nach der bestätigten Übergabe eingezogen und verifiziert. Niemals nur wegen eines gedruckten Labels bestätigen.</p>
          <input type="hidden" name="id" value={order.id}/>
          <label>DHL-Sendungsnummer<input name="tracking" required minLength={8} maxLength={60} placeholder="DHL Tracking-Nummer" defaultValue={order.shippingJob?.trackingNumber||""} readOnly={["label_created","awaiting_handover"].includes(order.shippingJob?.status||"")}/></label>
          <label style={{display:"flex",gap:9,alignItems:"center"}}>
           <input name="parcelHandedOver" type="checkbox" required/>
           Ich bestätige, dass das Paket tatsächlich an DHL übergeben wurde und die Sendungsnummer korrekt ist.
          </label>
          <button type="submit">Paketübergabe bestätigen und Klarna-Einzug prüfen</button>
         </form>}
       <h3>Positionen</h3>
       <div className="rh-admin-table-wrap"><table><thead><tr><th>Artikel</th><th>Variante</th><th>Menge</th><th>Einzelpreis</th><th>Summe</th></tr></thead>
        <tbody>{order.lines.map((line,i)=><tr key={i}>
         <td>{line.variant.product.name}</td>
         <td>{line.variant.colorLabel} · {line.variant.lengthLabel}</td>
         <td>{line.quantity}</td><td>{euro(line.unitPriceCents)}</td><td>{euro(line.lineTotalCents)}</td>
        </tr>)}
        {order.giftPurchases.map(gift=><tr key={gift.id}><td>Digitaler Geschenkgutschein</td>
          <td>Für {gift.recipientName} · {gift.delivery==="email"?"E-Mail":"Download"} · {gift.status}</td>
          <td>1</td><td>{euro(gift.amountCents)}</td><td>{euro(gift.amountCents)}</td></tr>)}
        </tbody>
       </table></div>
       {order.giftPurchases.length>0&&<p className="rh-admin-muted">Gutscheinversand: {order.giftPurchases.map(g=>`${g.recipientName}: ${g.buyerMailStatus}${g.delivery==="email"?` / Empfänger ${g.recipientMailStatus}`:""}`).join(" · ")}</p>}
       {(()=>{
        const paid= !order.testOnly&&Boolean(order.paymentReference)&&order.payments.some(p=>p.eventType==="PAYMENT.CAPTURE.COMPLETED"&&p.provider!=="manual"&&p.providerEventId.length>0);
        const next=order.status==="payment_confirmed"&&(!order.shippingJob||order.shippingJob.status!=="label_created")?"preparing":order.status==="preparing"?"shipped":order.status==="shipped"?"delivered":null;
        return paid&&next&&order.lines.length>0&&!["submitting","canceling","needs_review"].includes(order.shippingJob?.status||"")?<form action={updateFulfillmentAction} className="rh-admin-fulfillment-form">
          <h3>Versandstatus bearbeiten</h3><p>Nur nach verifiziertem Zahlungseingang. Statusänderungen werden protokolliert.</p>
          <input type="hidden" name="id" value={order.id}/>
          <input type="hidden" name="next" value={next}/>
          {next==="shipped"&&<><label>Versanddienst<input name="carrier" required maxLength={65} placeholder="z. B. DHL"/></label>
            <label>Sendungsnummer<input name="tracking" required minLength={4} maxLength={120} placeholder="Tracking-Code"/></label></>}
          {next==="shipped"&&<label style={{display:"flex",gap:9,alignItems:"center"}}><input type="checkbox" name="parcelHandedOver" required/> Ich bestätige die tatsächliche Übergabe an DHL und die richtige Sendungsnummer. Die Versandbestätigung geht an den Kunden.</label>}
                    <label>Interne Notiz (optional)<input name="note" maxLength={200} placeholder="Versandhinweis"/></label>
          <button type="submit">{next==="preparing"?"In Bearbeitung setzen":next==="shipped"?"Als versendet markieren":"Als zugestellt markieren"}</button>
        </form>:null;
       })()}
       <h3>Statusverlauf</h3>
       {order.statusEvents.length?<ol className="rh-admin-status-timeline">{order.statusEvents.map((event,i)=><li key={i}><Clock3 size={15}/>
          <span>{date(event.createdAt)} — {isKnownOrderState(event.toStatus)?orderStates[event.toStatus]:event.toStatus}
           <small>{event.reason}</small></span></li>)}</ol>:<p className="rh-admin-muted">Kein Statusverlauf aufgezeichnet.</p>}
      </div>
     </details>)}
    </div>
   </section>}
  {totalPages>1&&<nav className="rh-admin-pagination" aria-label="Bestellseiten">
   {page>1&&<Link href={link(page-1)}>Vorherige Seite</Link>}
   <span>Seite {page} / {totalPages}</span>
   {page<totalPages&&<Link href={link(page+1)}>Nächste Seite <ArrowUpRight size={13}/></Link>}
  </nav>}
 </AdminShell>;
}
