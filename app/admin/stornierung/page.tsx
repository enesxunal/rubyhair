import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {Search,PackageX,ClipboardX,Wallet,ChevronDown,CheckCircle2} from "lucide-react";
import {isAdmin} from "@/lib/admin-auth";
import {inspectCancellation} from "@/lib/admin-order-cancellation";
import {cancelOrderDhlLabelAction} from "../dhl-order-actions";
import {cancelOrderAction} from "./actions";
import AdminShell from "../admin-shell";

export const metadata:Metadata={title:"Bestellung stornieren | Ruby Hair",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export const runtime="nodejs";
const euros=(n:number)=>new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(n/100);
const reasons:Record<string,string>={
 NOT_UNCAPTURED_KLARNA:"Bereits bezahlte Bestellungen über die Erstattungsprüfung bearbeiten.",
 PAYMENT_OR_GIFT_REVIEW:"Zahlung oder Gutschein muss separat geprüft werden.",
 SHIPPING_REVIEW:"Versandstatus muss zuerst geklärt werden.",
 review:"Klarna-Status nicht eindeutig bestätigt.",
 provider_unavailable:"Klarna derzeit nicht erreichbar. Bitte erneut prüfen."
};
export default async function CancelPage({searchParams}:{searchParams:Promise<{order?:string;result?:string;dhl?:string}>}){
 if(!await isAdmin())redirect("/admin/login");
 const q=await searchParams,number=q.order?.replace(/^RH-|^#/i,"").trim()||"";
 const valid=/^[1-9][0-9]{0,12}$/.test(number);
 const audit=valid?await inspectCancellation(BigInt(number)):null;
 const order=audit?.order;
 const terminal=order?.status==="cancelled"||order?.status==="refunded";
 const labelCanCancel=Boolean(order&&!order.shippedAt&&!order.deliveredAt&&["payment_authorized","payment_confirmed","preparing"].includes(order.status)&&order.trackingNumber&&order.shippingJob?.trackingNumber===order.trackingNumber&&["label_created","awaiting_handover"].includes(order.shippingJob.status));
 const canCancel=Boolean(order&&["authorized","cancelled"].includes(audit?.state||""));
 const hasLabel=Boolean(order?.trackingNumber||order?.shippingJob?.trackingNumber||order?.shippingJob?.hasLabel);
 const hasShipment=Boolean(order?.shippedAt||order?.deliveredAt||order?.status==="shipped"||order?.status==="delivered");
 const hasPayment=Boolean(order?.invoice||order?.payments.length);
 const provider=order?.paymentReference?.startsWith("KLARNA-HPP:")?"Klarna":hasPayment?"PayPal / Zahlungsanbieter":"Nicht bestätigt";
 const status=terminal?(order?.status==="refunded"?"Erstattet":"Storniert"):order?.status==="payment_authorized"||hasPayment?"Bestätigt":"Nicht bestätigt";
 const shipping=hasShipment?"Übergeben / versendet":hasLabel?"Etikett erstellt":order?.shippingJob?.status==="canceled"?"Etikett storniert":order?.shippingJob?.status==="order_cancel_review"?"Prüfsperre":"Kein aktives Etikett";
 const dhlReason=hasShipment?"Paket bereits übergeben.":terminal?"Bestellung bereits abgeschlossen.":hasLabel?"DHL-Status muss geprüft werden.":"Kein aktives DHL-Etikett.";
 const orderReason=terminal?"Bestellung bereits abgeschlossen.":labelCanCancel?"Zuerst DHL-Etikett stornieren.":hasShipment?"Paket bereits versendet.":reasons[audit?.state||""]||"Keine bestätigte Stornierung möglich.";
 return <AdminShell current="orders" title="Bestellung stornieren" description="Bestellnummer eingeben und verfügbare Aktionen auswählen.">
 <div className="rh-cancel-layout">
 <section className="rh-admin-panel-card rh-cancel-search">
 <form action="/admin/stornierung" method="GET"><label htmlFor="cancel-order-number">Bestellnummer</label><div><input id="cancel-order-number" name="order" required inputMode="numeric" placeholder="z. B. 21" defaultValue={number}/><button className="rh-cancel-primary" type="submit"><Search size={17}/> Bestellung suchen</button></div></form>
 {q.order&&!valid&&<p role="alert">Bitte eine gültige Bestellnummer eingeben.</p>}
 {audit&&!order&&<p role="status">Keine passende Kundenbestellung gefunden.</p>}
 </section>
 {order&&<section className="rh-admin-panel-card rh-cancel-result">
 <div className="rh-cancel-heading"><div><span>BESTELLUNG</span><h2>#{String(order.orderNumber)}</h2></div><strong>{euros(order.totalCents)}</strong></div>
 <div className="rh-cancel-facts">
 <div><small>Status</small><strong>{status}</strong></div>
 <div><small>Zahlung</small><strong>{provider}</strong></div>
 <div><small>Versand</small><strong>{shipping}</strong></div>
 </div>
 {q.result==="success"&&order.status==="cancelled"&&<p className="rh-cancel-notice is-success" role="status"><CheckCircle2 size={18}/> Bestellung erfolgreich storniert.</p>}
 {q.dhl==="canceled"&&!hasLabel&&<p className="rh-cancel-notice is-success" role="status"><CheckCircle2 size={18}/> DHL-Etikett storniert. Jetzt kann die Bestellung geprüft werden.</p>}
 {(q.dhl==="review"||q.result==="review")&&<p className="rh-cancel-notice" role="alert">Aktion nicht abgeschlossen. Anbieterstatus erneut prüfen; keine unbestätigte Stornierung wird als Erfolg verbucht.</p>}
 <h3 className="rh-cancel-section-title">Verfügbare Aktionen</h3>
 <div className="rh-cancel-actions">
 <article className="rh-cancel-action"><div className="rh-cancel-action-top"><PackageX size={23}/><div><h4>DHL-Etikett stornieren</h4><p>{labelCanCancel?"Versandetikett entfernen, bevor das Paket übergeben wurde.":dhlReason}</p></div></div>
 {labelCanCancel?<details className="rh-cancel-confirm"><summary className="rh-cancel-primary">DHL-Etikett stornieren <ChevronDown size={16}/></summary>
 <form action={cancelOrderDhlLabelAction}>
 <input type="hidden" name="id" value={order.id}/><input type="hidden" name="returnTo" value="stornierung"/>
 <label><input type="checkbox" name="confirmed" required/> Paket wurde noch nicht an DHL übergeben.</label>
 <button type="submit" className="rh-cancel-danger">Etikett endgültig stornieren</button></form></details>:<button type="button" disabled className="rh-cancel-primary">Nicht verfügbar</button>}
 </article>
 <article className="rh-cancel-action"><div className="rh-cancel-action-top"><ClipboardX size={23}/><div><h4>Bestellung stornieren</h4><p>{canCancel?(audit?.state==="cancelled"?"Klarna-Stornierung im Shop übernehmen.":"Klarna-Freigabe aufheben und Bestand zurückbuchen."):orderReason}</p></div></div>
 {canCancel?<details className="rh-cancel-confirm"><summary className="rh-cancel-primary">{audit?.state==="cancelled"?"Stornierung übernehmen":"Bestellung stornieren"} <ChevronDown size={16}/></summary>
 <form action={cancelOrderAction}><input type="hidden" name="number" value={number}/><label><input type="checkbox" name="confirm" required/> Ware wurde nicht übergeben. Bestellung vollständig stornieren.</label><button className="rh-cancel-danger" type="submit">Stornierung verbindlich bestätigen</button></form></details>:<button type="button" disabled className="rh-cancel-primary">Nicht verfügbar</button>}
 </article>
 <article className="rh-cancel-action"><div className="rh-cancel-action-top"><Wallet size={23}/><div><h4>Zahlung erstatten</h4><p>{hasPayment&&!terminal?"Zahlung beim Anbieter prüfen. Keine automatische Rückzahlung.":terminal?"Bestellung bereits abgeschlossen.":"Noch keine bestätigte Abbuchung."}</p></div></div>
 {hasPayment&&!terminal?<Link className="rh-cancel-secondary" href={"/admin/erstattungen?order="+number}>Erstattung prüfen</Link>:<button type="button" className="rh-cancel-primary" disabled>Nicht verfügbar</button>}
 </article>
 </div>
 </section>}
 <Link className="rh-cancel-back" href="/admin/bestellungen">← Zur Bestellübersicht</Link>
 </div></AdminShell>
}
