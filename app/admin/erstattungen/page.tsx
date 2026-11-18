import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {isAdmin} from "@/lib/admin-auth";
import {getPrisma} from "@/lib/prisma";
import {readCustomerRefundStatus} from "@/lib/refund-readonly-audit";
import AdminShell from "../admin-shell";

export const metadata:Metadata={title:"Erstattungsprüfung | Ruby Hair",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
const euros=(v:number|null)=>v===null?"Nicht verfügbar":new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(v/100);
export default async function RefundReadiness({searchParams}:{searchParams:Promise<{order?:string}>}){
 if(!await isAdmin())redirect("/admin/login");
 const q=await searchParams;
 const recent=await getPrisma().order.findMany({where:{testOnly:false},orderBy:{createdAt:"desc"},take:15,
  select:{id:true,orderNumber:true,status:true,totalCents:true,invoice:{select:{invoiceNumber:true}}}});
 const selected=recent.find(o=>String(o.orderNumber)===q.order);
 const status=selected?await readCustomerRefundStatus(selected.id):null;
 return <AdminShell current="orders" title="Erstattungen – sicher prüfen" description="Nur Leserechte beim Zahlungsanbieter. Es wird keine PayPal- oder Klarna-Erstattung ausgelöst.">
  <section className="rh-admin-panel-card" style={{padding:24}}>
   <h2>Bestellung zur Prüfung auswählen</h2>
   <p>Alle Refund- und Stornoentscheidungen erfordern eine Prüfung der Ware, Rücksendung, gesetzlichen Voraussetzungen und eine ausdrückliche Kaufmannsfreigabe. Diese Ansicht führt keine Erstattung aus.</p>
   <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>{recent.map(o=><Link key={o.id} href={'/admin/erstattungen?order='+o.orderNumber.toString()} aria-current={selected?.id===o.id?"page":undefined}>#{o.orderNumber.toString()} · {euros(o.totalCents)} · {o.status}</Link>)}</div>
   {selected&&status&&<div style={{marginTop:22}} role="status">
     <h3>Bestellung #{selected.orderNumber.toString()}</h3>
     <p><strong>Lokal:</strong> {selected.status} · Rechnung: {selected.invoice?.invoiceNumber||"Keine"}</p>
     <p><strong>Zahlungsanbieter:</strong> {status.provider||"Nicht verifiziert"} · {status.providerStatus||"Keine Statusauskunft"}</p>
     <p><strong>Erfasster Betrag:</strong> {euros(status.capturedCents)} · <strong>Erstattungsangabe:</strong> {euros(status.refundedCents)}</p>
     <p><strong>Bewertung:</strong> {status.state} / {status.reason}</p>
     <p>Ohne abgeschlossene und betragsgenaue Anbieterprüfung niemals „Erstattet“ als Bestellstatus setzen. Teil- und Vollerstattungen getrennt prüfen; Buchhaltung und Rechnungskorrektur beachten.</p>
   </div>}
   <p><Link href="/admin/bestellungen">Zur Bestellübersicht</Link></p>
  </section>
 </AdminShell>;
}
