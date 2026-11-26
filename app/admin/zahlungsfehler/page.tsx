import {redirect} from "next/navigation";
import {isAdmin} from "@/lib/admin-auth";
import {getPrisma} from "@/lib/prisma";
import {diagnosticLabels} from "@/lib/checkout-diagnostic-policy";
import AdminShell from "../admin-shell";
export const dynamic="force-dynamic";
export const metadata={title:"Zahlungsfehler | Ruby Hair",robots:{index:false,follow:false}};
const methods:Record<string,string>={paypal:"PayPal",klarna:"Klarna",card:"Kreditkarte",apple_pay:"Apple Pay",google_pay:"Google Pay",unknown:"Noch nicht gewählt"};
const stages:Record<string,string>={address:"Adresse",cart:"Warenkorb",setup:"Zahlungsart laden",create:"Bestellstart",redirect:"Weiterleitung",merchant_validation:"Händlerprüfung",authorization:"Zahlungsbestätigung",capture:"Zahlungseinzug",return:"Rückmeldung"};
const format=(d:Date)=>new Intl.DateTimeFormat("de-DE",{dateStyle:"short",timeStyle:"medium",timeZone:"Europe/Berlin"}).format(d);
export default async function PaymentDiagnostics(){
 if(!await isAdmin())redirect("/admin/login");
 const db=getPrisma();
 const since=new Date(Date.now()-30*86400000);
 const rows=await db.checkoutDiagnostic.findMany({where:{createdAt:{gte:since}},orderBy:{createdAt:"desc"},take:200}).catch(()=>null);
 const orderIds=Array.from(new Set((rows||[]).flatMap(r=>r.orderId?[r.orderId]:[])));
 const orders=orderIds.length?await db.order.findMany({where:{id:{in:orderIds}},select:{id:true,orderNumber:true}}):[];
 const numbers=new Map(orders.map(o=>[o.id,String(o.orderNumber)]));
 return <AdminShell current="diagnostics" title="Zahlungsfehler" description="Technische Checkout-Ereignisse der letzten 30 Tage. Browser-Meldungen sind Hinweise, kein Zahlungsnachweis.">
 <section style={{background:"#fff",padding:20,border:"1px solid #e4dadd",overflowX:"auto"}}>
 <p>Keine Kartennummern, Sicherheitscodes, Adresswerte oder Zahlungs-Tokens. Eine Bestellung wird nur bei serverseitig bestätigter Zuordnung angezeigt.</p>
 {rows===null?<p role="alert">Fehlerprotokoll vorübergehend nicht erreichbar.</p>:rows.length===0?<p>Keine Fehler erfasst.</p>:<table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr>{["Zeit (Berlin)","Zahlungsart","Schritt","Grund","Bestellung","Quelle"].map(x=><th key={x} style={{textAlign:"left",padding:10,borderBottom:"1px solid #ddd"}}>{x}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}>{[format(r.createdAt),methods[r.method]||r.method,stages[r.stage]||r.stage,diagnosticLabels[r.code]||"Technischer Fehler",r.orderId?numbers.get(r.orderId)?"RH-"+numbers.get(r.orderId):r.orderId.slice(0,8):"–",r.origin==="server"?"Server":"Browser (Hinweis)"].map((x,i)=><td key={i} style={{padding:10,borderBottom:"1px solid #eee",verticalAlign:"top"}}>{x}{i===3&&<small style={{display:"block",color:"#86747e"}}>{r.code}</small>}</td>)}</tr>)}</tbody></table>}
 </section></AdminShell>;
}
