import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {ClipboardList,Clock3,ArrowUpRight,ShieldCheck,WalletCards} from "lucide-react";
import {isAdmin} from "@/lib/admin-auth";
import {getPrisma} from "@/lib/prisma";
import {isKnownOrderState,orderStates} from "@/lib/order-lifecycle";
import AdminShell from "../admin-shell";
import {updateFulfillmentAction} from "../actions";

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

export default async function AdminOrders({searchParams}:{searchParams:Promise<{filter?:string;seite?:string}>}){
 if(!await isAdmin())redirect("/admin/login");
 const params=await searchParams;
 const filter=filters.find(f=>f===params.filter)||"alle";
 const requestedPage=Number(params.seite);
 const page=Number.isSafeInteger(requestedPage)&&requestedPage>0?Math.min(requestedPage,10000):1;
 const where=filter==="tests"?{testOnly:true}:filter==="ohne-testkennzeichen"?{testOnly:false}:
    filter==="offen"?{testOnly:true,status:"test_reserved"}:{};
 const db=getPrisma();
 const [count,orders,realCount,testCount]=await Promise.all([
  db.order.count({where}),
  db.order.findMany({where,orderBy:[{createdAt:"desc"},{id:"asc"}],skip:(page-1)*20,take:20,include:{
   lines:{select:{quantity:true,unitPriceCents:true,lineTotalCents:true,variant:{select:{colorLabel:true,lengthLabel:true,product:{select:{name:true}}}}}},
   payments:{select:{eventType:true,provider:true,providerEventId:true}},
   statusEvents:{orderBy:{createdAt:"asc"},select:{createdAt:true,fromStatus:true,toStatus:true,reason:true}}
  }}),
  db.order.count({where:{testOnly:false}}),
  db.order.count({where:{testOnly:true}})
 ]);
 const totalPages=Math.max(1,Math.ceil(count/20));
 const link=(p:number)=>"/admin/bestellungen?filter="+filter+"&seite="+p;
 return <AdminShell current="orders" title="Bestellübersicht." description="Bestellungen, Sendungsnummern und Statusverlauf. Versandbearbeitung nur nach verifiziertem Zahlungseingang; keine Zahlungserfassung im Admin.">
  <div className="rh-admin-warning"><strong>Bestellannahme deaktiviert.</strong> Ein Eintrag ohne Testkennzeichen ist kein Nachweis für eine Zahlung. Testreservierungen zählen nicht als Verkauf oder Umsatz.</div>
  <div className="rh-admin-pill-row">
   <span className="rh-admin-stat-pill">{realCount} ohne Testkennzeichen</span>
   <span className="rh-admin-stat-pill">{testCount} technische Testdatensätze</span>
  </div>
  <nav className="rh-admin-filters" aria-label="Bestellfilter">
   {[
    {value:"alle",label:"Alle"},
    {value:"tests",label:"Tests"},
    {value:"ohne-testkennzeichen",label:"Ohne Testkennzeichen"},
    {value:"offen",label:"Offene Testreservierungen"}
   ].map(item=><Link key={item.value} href={"/admin/bestellungen?filter="+item.value}
       aria-current={filter===item.value?"page":undefined} className={filter===item.value?"is-active":undefined}>{item.label}</Link>)}
  </nav>
  {orders.length===0?<div className="rh-admin-panel-card rh-admin-empty rh-studio-orders-empty">
      <span className="rh-studio-orders-empty-icon"><ClipboardList size={27}/></span><h2>Noch keine Bestelldatensätze</h2>
      <p>In diesem Filter liegen keine Bestellungen vor. Live-Verkäufe sind noch deaktiviert – dies ist kein Umsatzbericht.</p>
      <div className="rh-studio-orders-next">
       <Link href="/admin/zahlungen"><WalletCards size={16}/> Zahlungsintegration vorbereiten <ArrowUpRight size={15}/></Link>
       <Link href="/admin/produkte"><ShieldCheck size={16}/> Bestände prüfen <ArrowUpRight size={15}/></Link>
      </div>
     </div>:
   <section className="rh-admin-panel-card rh-admin-orders-card">
    <div className="rh-admin-card-title"><div><span>DATENBANK / LESEN</span><h2>{count} Einträge</h2></div><span>Seite {page} von {totalPages}</span></div>
    <div className="rh-admin-orders-list">
     {orders.map(order=><details key={order.id} className="rh-admin-order-item">
      <summary><span className="rh-admin-order-number">#{order.orderNumber.toString()} <small>{order.testOnly?"TESTDATENSATZ":"NICHT VERIFIZIERT"}</small></span>
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
        <p><strong>Versand:</strong> {order.trackingCarrier||"Nicht versendet"} {order.trackingNumber||""}</p>
        {order.fulfillmentNote&&<p><strong>Interne Notiz:</strong> {order.fulfillmentNote}</p>}</div>
       <h3>Positionen</h3>
       <div className="rh-admin-table-wrap"><table><thead><tr><th>Artikel</th><th>Variante</th><th>Menge</th><th>Einzelpreis</th><th>Summe</th></tr></thead>
        <tbody>{order.lines.map((line,i)=><tr key={i}>
         <td>{line.variant.product.name}</td>
         <td>{line.variant.colorLabel} · {line.variant.lengthLabel}</td>
         <td>{line.quantity}</td><td>{euro(line.unitPriceCents)}</td><td>{euro(line.lineTotalCents)}</td>
        </tr>)}</tbody>
       </table></div>
       {(()=>{
        const paid= !order.testOnly&&Boolean(order.paymentReference)&&order.payments.some(p=>p.eventType==="payment_confirmed"&&p.provider!=="manual"&&p.providerEventId.length>0);
        const next=order.status==="payment_confirmed"?"preparing":order.status==="preparing"?"shipped":order.status==="shipped"?"delivered":null;
        return paid&&next?<form action={updateFulfillmentAction} className="rh-admin-fulfillment-form">
          <h3>Versandstatus bearbeiten</h3><p>Nur nach verifiziertem Zahlungseingang. Statusänderungen werden protokolliert.</p>
          <input type="hidden" name="id" value={order.id}/>
          <input type="hidden" name="next" value={next}/>
          {next==="shipped"&&<><label>Versanddienst<input name="carrier" required maxLength={65} placeholder="z. B. DHL"/></label>
            <label>Sendungsnummer<input name="tracking" required minLength={4} maxLength={120} placeholder="Tracking-Code"/></label></>}
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
