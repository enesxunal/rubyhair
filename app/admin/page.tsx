import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {ArrowRight,ArrowUpRight,Boxes,Package,AlertCircle,ShoppingCart,Clock3,CheckCircle2} from "lucide-react";
import {isAdmin} from "@/lib/admin-auth";
import {getPrisma} from "@/lib/prisma";
import {isKnownOrderState,orderStates} from "@/lib/order-lifecycle";
import AdminShell from "./admin-shell";

export const metadata:Metadata={title:"Übersicht | Ruby Hair Verwaltung",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export const runtime="nodejs";
const number=(n:number)=>n.toLocaleString("de-DE");

export default async function AdminHome(){
 if(!await isAdmin())redirect("/admin/login");
 const db=getPrisma();
 // Never mix hidden QA products or technical test orders into merchant KPIs.
 const [products,variants,recentOrders,realOrders]=await Promise.all([
  db.product.findMany({where:{active:true},select:{id:true,name:true}}),
  db.variant.findMany({where:{product:{active:true}},select:{stockQuantity:true,active:true}}),
  db.order.findMany({where:{testOnly:false},select:{id:true,orderNumber:true,status:true,createdAt:true},orderBy:{createdAt:"desc"},take:5}),
  db.order.count({where:{testOnly:false}})
 ]);
 const unknown=variants.filter(v=>v.active&&v.stockQuantity===null).length;
 const soldOut=variants.filter(v=>v.active&&v.stockQuantity===0).length;
 const low=variants.filter(v=>v.active&&v.stockQuantity!==null&&v.stockQuantity>0&&v.stockQuantity<=5).length;
 const activeVariants=variants.filter(v=>v.active);
 const known=activeVariants.length-unknown;
 const progress=activeVariants.length?Math.round(known/activeVariants.length*100):0;
 const metrics=[
  {label:"Aktive Produkte",value:number(products.length),note:"Im Live-Shop sichtbar",icon:Package},
  {label:"Ausverkaufte Varianten",value:number(soldOut),note:"Bestand 0 · nicht kaufbar",icon:AlertCircle},
  {label:"Wenig Bestand",value:number(low),note:"1 bis 5 Stück verfügbar",icon:Boxes},
  {label:"Kundenbestellungen",value:number(realOrders),note:"Ohne interne Testbestellungen",icon:ShoppingCart}
 ];
 return <AdminShell current="dashboard" title="Shop-Übersicht." description="Bestellungen und Bestände auf einen Blick. Interne Testdaten werden nicht mitgezählt.">
  <section className="rh-studio-hero rh-studio-hero-live">
   <div className="rh-studio-hero-copy">
    <span className="rh-studio-eyebrow"><CheckCircle2 size={14}/> SHOP STATUS</span>
    <h2>Ruby Hair ist live.</h2>
    <p>PayPal und Klarna sind für Kunden verfügbar. DHL-Sendungen werden bis zur API-Freigabe manuell bearbeitet.</p>
    <Link href="/admin/bestellungen">Bestellungen öffnen <ArrowUpRight size={17}/></Link>
   </div>
   <div className="rh-studio-live-summary" aria-label={realOrders+" Kundenbestellungen"}>
    <strong>{number(realOrders)}</strong><span>Kundenbestellungen</span><small>Technische Testkäufe nicht enthalten</small>
   </div>
  </section>
  <section className="rh-admin-kpi-grid rh-studio-kpis" aria-label="Shop-Kennzahlen">
   {metrics.map(item=><article className="rh-admin-kpi" key={item.label}>
    <div className="rh-admin-kpi-top"><span>{item.label}</span><item.icon size={19}/></div>
    <strong>{item.value}</strong><small>{item.note}</small>
   </article>)}
  </section>
  <div className="rh-admin-overview-columns rh-studio-overview-bottom">
   <section className="rh-admin-panel-card">
    <div className="rh-admin-card-title"><div><span>LAGER / BESTAND</span><h2>Bestandsübersicht</h2></div><Link href="/admin/produkte">Bearbeiten <ArrowUpRight size={15}/></Link></div>
    <div className="rh-studio-stock-score"><strong>{progress}%</strong><span>Aktive Varianten mit bekannter Stückzahl</span></div>
    <div className="rh-admin-inventory-bar" aria-label={known+" von "+activeVariants.length+" aktiven Varianten mit bekannter Menge"}><span style={{width:progress+"%"}}/></div>
    <div className="rh-admin-inventory-list">
     <div><span><i className="rh-admin-dot unknown"/>Menge unbekannt</span><b>{unknown}</b></div>
     <div><span><i className="rh-admin-dot zero"/>Ausverkauft (0)</span><b>{soldOut}</b></div>
     <div><span><i className="rh-admin-dot low"/>Niedriger Bestand (1–5)</span><b>{low}</b></div>
    </div>
    <Link className="rh-admin-primary-link" href="/admin/produkte">Bestände und Preise bearbeiten <ArrowRight size={17}/></Link>
   </section>
   <section className="rh-admin-panel-card">
    <div className="rh-admin-card-title"><div><span>BESTELLUNGEN</span><h2>Letzte Kundenbestellungen</h2></div><Link href="/admin/bestellungen">Alle anzeigen <ArrowUpRight size={15}/></Link></div>
    {recentOrders.length?<div className="rh-admin-recent-list">{recentOrders.map(o=><div key={o.id}>
      <div><strong>#{o.orderNumber.toString()}</strong><small>{isKnownOrderState(o.status)?orderStates[o.status]:o.status}</small></div>
      <span>{o.createdAt.toLocaleDateString("de-DE",{timeZone:"Europe/Berlin"})}</span>
    </div>)}</div>:<div className="rh-admin-empty"><Clock3 size={24}/><strong>Noch keine Kundenbestellungen</strong><p>Technische Tests werden separat geführt.</p></div>}
    <Link className="rh-admin-primary-link" href="/admin/bestellungen">Bestellungen verwalten <ArrowRight size={17}/></Link>
   </section>
  </div>
 </AdminShell>;
}
