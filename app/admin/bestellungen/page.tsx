import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {ClipboardList,Clock3,ArrowUpRight} from "lucide-react";
import {isAdmin} from "@/lib/admin-auth";
import {getPrisma} from "@/lib/prisma";
import {isKnownOrderState,orderStates} from "@/lib/order-lifecycle";
import AdminShell from "../admin-shell";

export const metadata:Metadata={title:"Bestellungen | Ruby Hair Verwaltung",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export const runtime="nodejs";
const filters=["alle","tests","ohne-testkennzeichen","offen"] as const;
const euro=(cents:number)=>new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(cents/100);
const date=(value:Date)=>new Intl.DateTimeFormat("de-DE",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Berlin"}).format(value);

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
   statusEvents:{orderBy:{createdAt:"asc"},select:{createdAt:true,fromStatus:true,toStatus:true,reason:true}}
  }}),
  db.order.count({where:{testOnly:false}}),
  db.order.count({where:{testOnly:true}})
 ]);
 const totalPages=Math.max(1,Math.ceil(count/20));
 const link=(p:number)=>"/admin/bestellungen?filter="+filter+"&seite="+p;
 return <AdminShell current="orders" title="Bestellübersicht." description="Sicherer Lesezugriff auf Bestelldatensätze, Warenpositionen und Statusverlauf. Keine Buchung oder Zahlung wird hier ausgelöst.">
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
  {orders.length===0?<div className="rh-admin-panel-card rh-admin-empty"><ClipboardList size={29}/><h2>Keine Bestelldatensätze</h2><p>Für diesen Filter sind noch keine Datensätze vorhanden. Das ist normal, solange der Checkout gesperrt ist.</p></div>:
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
        <p><strong>Artikelwert:</strong> {euro(order.subtotalCents)} · <strong>Erfasster Versand:</strong> {euro(order.shippingCents)}</p></div>
       <h3>Positionen</h3>
       <div className="rh-admin-table-wrap"><table><thead><tr><th>Artikel</th><th>Variante</th><th>Menge</th><th>Einzelpreis</th><th>Summe</th></tr></thead>
        <tbody>{order.lines.map((line,i)=><tr key={i}>
         <td>{line.variant.product.name}</td>
         <td>{line.variant.colorLabel} · {line.variant.lengthLabel}</td>
         <td>{line.quantity}</td><td>{euro(line.unitPriceCents)}</td><td>{euro(line.lineTotalCents)}</td>
        </tr>)}</tbody>
       </table></div>
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
