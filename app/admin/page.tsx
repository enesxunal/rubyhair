import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {ArrowUpRight,AlertTriangle,Boxes,ClipboardList,Package,ShieldCheck,Clock3} from "lucide-react";
import {isAdmin} from "@/lib/admin-auth";
import {getPrisma} from "@/lib/prisma";
import {orderStates,isKnownOrderState} from "@/lib/order-lifecycle";
import AdminShell from "./admin-shell";

export const metadata:Metadata={title:"Übersicht | Ruby Hair Verwaltung",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export const runtime="nodejs";

export default async function AdminHome(){
 if(!await isAdmin())redirect("/admin/login");
 const db=getPrisma();
 const [products,variants,recentOrders,realOrders,testOrders,testHolds]=await Promise.all([
  db.product.findMany({select:{id:true,name:true,active:true,_count:{select:{variants:true}}},orderBy:{name:"asc"}}),
  db.variant.findMany({select:{stockQuantity:true,active:true}}),
  db.order.findMany({select:{id:true,orderNumber:true,status:true,testOnly:true,createdAt:true},orderBy:{createdAt:"desc"},take:5}),
  db.order.count({where:{testOnly:false}}),
  db.order.count({where:{testOnly:true}}),
  db.order.count({where:{testOnly:true,status:"test_reserved"}})
 ]);
 const unknown=variants.filter(v=>v.stockQuantity===null).length;
 const soldOut=variants.filter(v=>v.stockQuantity===0).length;
 const low=variants.filter(v=>v.stockQuantity!==null&&v.stockQuantity>0&&v.stockQuantity<=5).length;
 const verified=variants.length-unknown;
 const stats=[
  {label:"Produkte",value:products.length,note:products.filter(p=>p.active).length+" aktiv",icon:Boxes},
  {label:"Varianten",value:variants.length,note:variants.filter(v=>v.active).length+" aktiv",icon:Package},
  {label:"Bestand ungeprüft",value:unknown,note:"Nicht mit 0 Bestand verwechseln",icon:AlertTriangle},
  {label:"Bestelldatensätze",value:realOrders,note:"Keine bestätigten Verkäufe",icon:ClipboardList}
 ];
 return <AdminShell current="dashboard" title="Guten Überblick." description="Sortiment, Bestandsprüfung und technischer Bestellstatus an einem Ort.">
  <section className="rh-admin-intro-banner">
   <div><span>SHOPSTATUS / VORSCHAU</span><h2>Erst prüfen. Dann verkaufen.</h2>
    <p>Der neue Shop zeigt derzeit einen importierten Produktkatalog. Reale Zahlungen und Bestellungen sind gesperrt; unbekannte Bestände gelten nicht als verkaufsbereit.</p></div>
   <ShieldCheck size={38} strokeWidth={1.3}/>
  </section>
  <section className="rh-admin-kpi-grid" aria-label="Shop-Kennzahlen">
   {stats.map(s=><article key={s.label} className="rh-admin-kpi">
    <div className="rh-admin-kpi-top"><span>{s.label}</span><s.icon size={20} strokeWidth={1.5}/></div>
    <strong>{s.value}</strong><small>{s.note}</small>
   </article>)}
  </section>
  <div className="rh-admin-overview-columns">
   <section className="rh-admin-panel-card">
    <div className="rh-admin-card-title"><div><span>BESTAND / ÜBERSICHT</span><h2>Inventarprüfung</h2></div><Link href="/admin/produkte">Varianten <ArrowUpRight size={15}/></Link></div>
    <p className="rh-admin-muted">Gezählt werden ausschließlich Mengen aus der eigenen PostgreSQL-Datenbank.</p>
    <div className="rh-admin-inventory-bar" role="img" aria-label={verified+" von "+variants.length+" Varianten haben eine eingetragene Stückzahl"}>
     <span style={{width:variants.length?(verified/variants.length*100)+"%":"0%"}}/>
    </div>
    <div className="rh-admin-inventory-figures"><b>{verified}/{variants.length}</b><span>mit eingetragener Stückzahl</span></div>
    <div className="rh-admin-inventory-list">
     <div><span><i className="rh-admin-dot unknown"/>Unbekannt</span><b>{unknown}</b></div>
     <div><span><i className="rh-admin-dot zero"/>Ausverkauft (0)</span><b>{soldOut}</b></div>
     <div><span><i className="rh-admin-dot low"/>Wenig Bestand (1–5)</span><b>{low}</b></div>
    </div>
    <Link className="rh-admin-primary-link" href="/admin/produkte">Produkte & Bestand prüfen <ArrowUpRight size={17}/></Link>
   </section>
   <section className="rh-admin-panel-card">
    <div className="rh-admin-card-title"><div><span>BESTELLSTATUS / SYSTEM</span><h2>Bestellübersicht</h2></div><Link href="/admin/bestellungen">Zur Liste <ArrowUpRight size={15}/></Link></div>
    <p className="rh-admin-muted">Keine echten Umsatzdaten verfügbar. Testreservierungen werden separat gezählt.</p>
    <div className="rh-admin-order-metrics">
     <div><strong>{realOrders}</strong><span>Ohne Testkennzeichen</span></div>
     <div><strong>{testOrders}</strong><span>Testdatensätze</span></div>
     <div><strong>{testHolds}</strong><span>Offene Testreservierungen</span></div>
    </div>
    {recentOrders.length?<div className="rh-admin-recent-list">
     {recentOrders.map(o=><div key={o.id}>
      <div><strong>#{o.orderNumber.toString()}</strong><small>{o.testOnly?"TEST / ":"UNBESTÄTIGT / "}{isKnownOrderState(o.status)?orderStates[o.status]:o.status}</small></div>
      <span>{o.createdAt.toLocaleDateString("de-DE",{timeZone:"Europe/Berlin"})}</span>
     </div>)}
    </div>:<div className="rh-admin-empty"><Clock3 size={21}/><p>Noch keine Bestelldatensätze vorhanden.</p></div>}
   </section>
  </div>
  <section className="rh-admin-panel-card rh-admin-catalog-section">
   <div className="rh-admin-card-title"><div><span>SORTIMENT / DATENBANK</span><h2>Produktkategorien</h2></div><Link href="/admin/produkte">Bearbeiten <ArrowUpRight size={15}/></Link></div>
   <div className="rh-admin-catalog-list">
    {products.map(p=><Link key={p.id} href={"/admin/produkte#produkt-"+p.id}>
     <div><strong>{p.name}</strong><small>{p._count.variants} Varianten</small></div><span>{p.active?"Aktiv":"Inaktiv"} <ArrowUpRight size={15}/></span>
    </Link>)}
   </div>
  </section>
 </AdminShell>;
}
