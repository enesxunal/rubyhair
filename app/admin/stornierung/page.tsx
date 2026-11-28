import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {isAdmin} from "@/lib/admin-auth";
import {inspectCancellation} from "@/lib/admin-order-cancellation";
import {cancelOrderDhlLabelAction} from "../dhl-order-actions";
import {cancelOrderAction} from "./actions";
import AdminShell from "../admin-shell";
export const metadata:Metadata={title:"Bestellung stornieren | Ruby Hair",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export const runtime="nodejs";
const euros=(n:number)=>new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(n/100);
const reasons:Record<string,string>={NOT_UNCAPTURED_KLARNA:"Nur noch nicht eingezogene Klarna-Bestellungen können hier storniert werden. Für bereits bezahlte Bestellungen ist eine Erstattungsprüfung erforderlich.",PAYMENT_OR_GIFT_REVIEW:"Zahlung oder Gutschein muss separat geprüft werden.",SHIPPING_REVIEW:"Versand prüfen. Ein vorhandenes DHL-Etikett zuerst in der Bestellübersicht stornieren; bereits übergebene Pakete nicht stornieren.",review:"Anbieterstatus oder Betrag nicht eindeutig. Keine Stornierung möglich.",provider_unavailable:"Klarna-Prüfung derzeit nicht verfügbar. Bitte erneut prüfen.",not_found:"Keine passende Kundenbestellung gefunden."};
export default async function CancelPage({searchParams}:{searchParams:Promise<{order?:string;result?:string;dhl?:string}>}){
 if(!await isAdmin())redirect("/admin/login");
 const q=await searchParams,number=q.order?.replace(/^RH-|^#/i,"").trim()||"";
 const audit=/^[1-9][0-9]{0,12}$/.test(number)?await inspectCancellation(BigInt(number)):null;
 const order=audit?.order;
 const labelCanCancel=Boolean(order&&audit?.state==="SHIPPING_REVIEW"&&!order.shippedAt&&!order.deliveredAt&&order.trackingNumber&&order.shippingJob?.trackingNumber===order.trackingNumber&&["label_created","awaiting_handover"].includes(order.shippingJob.status));
 return <AdminShell current="orders" title="Bestellung stornieren" description="Geschützter Bereich für die Stornierung noch nicht eingezogener Klarna-Bestellungen.">
 <section className="rh-admin-panel-card" style={{padding:24,maxWidth:760}}>
 <form action="/admin/stornierung" method="GET" className="rh-admin-fulfillment-form"><label>Bestellnummer<input name="order" required placeholder="z. B. 21" defaultValue={number}/></label><button type="submit">Bestellung prüfen</button></form>
 {q.result==="success"&&order?.status==="cancelled"&&<p role="status"><strong>Stornierung bei Klarna bestätigt und im Shop verbucht.</strong></p>}
 {q.dhl==="canceled"&&<p role="status"><strong>DHL-Etikett storniert. Du kannst nun die Bestellung prüfen und stornieren.</strong></p>}
 {q.dhl==="review"&&<p role="alert">DHL-Stornierung nicht bestätigt. Bitte Versandstatus prüfen; keine Bestellung wurde storniert.</p>}
 {q.result==="review"&&<p role="alert">Vorgang nicht abgeschlossen. Bitte Anbieterstatus erneut prüfen. Eine unklare Stornierung wird nicht als Erfolg verbucht; Versand bleibt bei gesetzter Prüfsperre blockiert.</p>}
 {order&&<div style={{marginTop:20}}><h2>Bestellung #{String(order.orderNumber)} · {euros(order.totalCents)}</h2><p>Shopstatus: {order.status==="cancelled"?"Storniert":order.status==="payment_authorized"?"Bestätigt · Klarna":order.status}</p></div>}
 {audit&&order?.status!=="cancelled"&&<p>{audit.state==="authorized"?"Klarna-Freigabe geprüft, noch kein Einzug.":audit.state==="cancelled"?"Bei Klarna bereits storniert. Im Shop noch nicht verbucht.":reasons[audit.state]||"Nicht verfügbar."}</p>}
 {labelCanCancel&&order&&<form action={cancelOrderDhlLabelAction} className="rh-admin-fulfillment-form">
 <h3>1. DHL-Etikett stornieren</h3><p>Ein Versandetikett wurde erstellt, die Paketübergabe ist nicht im Shop bestätigt. Erst das Etikett stornieren, danach die Klarna-Bestellung.</p>
 <input type="hidden" name="id" value={order.id}/><input type="hidden" name="returnTo" value="stornierung"/>
 <label><input type="checkbox" name="confirmed" required/> Ich bestätige, dass das Paket noch nicht an DHL übergeben wurde und das Etikett storniert werden soll.</label>
 <button type="submit">DHL-Etikett stornieren</button></form>}
 {order&&["authorized","cancelled"].includes(audit?.state||"")&&<form action={cancelOrderAction} className="rh-admin-fulfillment-form">
 <h3>Bestellung stornieren</h3><input type="hidden" name="number" value={number}/><label><input type="checkbox" name="confirm" required/> Ich bestätige, dass die Ware nicht an DHL übergeben wurde und diese Bestellung vollständig storniert werden soll.</label><button type="submit">{audit?.state==="cancelled"?"Stornierung im Shop übernehmen":"Bestellung verbindlich stornieren"}</button></form>}
 <p><Link href="/admin/bestellungen">Zur Bestellübersicht</Link> · <Link href="/admin/erstattungen">Erstattungsprüfung</Link></p>
 </section></AdminShell>
}
