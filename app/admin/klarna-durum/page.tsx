import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {isAdmin} from "@/lib/admin-auth";
import {getPrisma} from "@/lib/prisma";
import {inspectLiveKlarnaOrder} from "@/lib/klarna-live-reconciliation";
import AdminShell from "../admin-shell";
import {reconcileAlreadyCapturedKlarnaAction} from "./actions";

export const metadata:Metadata={title:"Klarna Live-Status | Ruby Hair",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
const euro=(cents:number|null)=>cents===null?"Nicht gemeldet":new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(cents/100);
export default async function KlarnaStatus({searchParams}:{searchParams:Promise<{status?:string}>}){
 if(!await isAdmin())redirect("/admin/login");
 const params=await searchParams;
 const order=await getPrisma().order.findFirst({where:{testOnly:false,paymentReference:{startsWith:"KLARNA-HPP:"}},orderBy:{createdAt:"desc"},select:{id:true,orderNumber:true,status:true,totalCents:true,invoice:{select:{invoiceNumber:true}},payments:{select:{eventType:true,provider:true}},notifications:{select:{stage:true,status:true}}}});
 const result=order?await inspectLiveKlarnaOrder(order.id):null;
 return <AdminShell current="orders" title="Klarna Zahlung abgleichen" description="Direkte Live-API-Abfrage mit den im Ruby Hair Server verschlüsselt gespeicherten Klarna-Zugangsdaten. Die Statusabfrage erzeugt niemals eine Abbuchung.">
  <section className="rh-admin-panel-card" style={{padding:25}}>
   {params.status==="reconciled"&&<p role="status" className="rh-admin-success">Klarna-Capture war bereits vollständig. Bestellung und PDF-Rechnung wurden ohne neue Abbuchung abgeglichen; E-Mail-Versand ist eingeplant.</p>}
   {params.status==="review"&&<p role="alert" className="rh-admin-warning">Abgleich noch nicht abgeschlossen. Keine neue Zahlung ausgelöst. Bitte Zahlungsstatus erneut prüfen.</p>}
   <p><strong>Ruby Hair Bestellung:</strong> {order?"RH-"+String(order.orderNumber):"Keine Kundenbestellung gefunden"}</p>
   <p><strong>Lokaler Status:</strong> {order?.status||"–"}</p>
   <p><strong>Ruby Hair Bestellbetrag:</strong> {order?euro(order.totalCents):"–"}</p>
   <p><strong>Klarna API Status:</strong> {result?.providerStatus||"Nicht verfügbar"}</p>
   <p><strong>Von Klarna als eingezogen gemeldeter Betrag:</strong> {result?euro(result.providerCapturedCents):"–"}</p>
   <p><strong>Bestätigte Capture-Datensätze:</strong> {result?.captureCount??"–"}</p>
   <p><strong>Prüfergebnis:</strong> {result?.status||"–"} ({result?.reason||"–"})</p>
   <p><strong>PDF-Rechnung:</strong> {order?.invoice?.invoiceNumber||"Noch nicht erstellt"}</p>
   <p><strong>Lokale Zahlungsnachweise:</strong> {order?.payments.filter(x=>x.provider==="klarna"&&x.eventType==="PAYMENT.CAPTURE.COMPLETED").length||0}</p>
   {result?.status==="authorized_only"&&<p className="rh-admin-warning">Klarna bestätigt aktuell keine Abbuchung. Autorisierung nicht mit Einzug verwechseln. Kein automatischer Einzug.</p>}
   {result?.status==="not_reconciled"&&<p className="rh-admin-warning">Klarna meldet widersprüchliche Beträge oder Capture-Daten. Nicht automatisch abrechnen; manuell prüfen.</p>}
   {result?.status==="unavailable"&&<p className="rh-admin-warning">Klarna kann gerade nicht abgefragt werden. Die lokale Bestellung bleibt unverändert.</p>}
   {result?.status==="captured_verified"&&order?.status==="payment_authorized"&&<form action={reconcileAlreadyCapturedKlarnaAction} style={{marginTop:22,padding:20,background:"#edf7ef"}}>
    <input type="hidden" name="orderId" value={order.id}/>
    <strong>Vollständig eingezogene Zahlung bestätigt.</strong>
    <p>Der Betrag wurde bei Klarna bereits eingezogen. Nur lokale Zahlung, PDF-Rechnung und E-Mail-Benachrichtigungen abgleichen. KEIN neuer Capture.</p>
    <label style={{display:"flex",gap:10,alignItems:"center"}}><input required type="checkbox" name="confirmNoNewCharge"/> Ich bestätige den Abgleich ohne erneute Abbuchung.</label>
    <button type="submit" className="rh-admin-mail-test-button" style={{marginTop:15}}>Bereits bezahlte Bestellung und Rechnung abgleichen</button>
   </form>}
   <p style={{marginTop:22}}><Link href="/admin/klarna-durum">Status erneut von Klarna abrufen</Link> · <Link href="/admin/bestellungen">Zurück zu Bestellungen</Link></p>
  </section>
 </AdminShell>;
}
