import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {
 ArrowUpRight,BarChart3,CheckCircle2,Clock3,Boxes,Package,ShieldCheck,
 ArrowRight,AlertCircle,ShoppingCart,WalletCards,ClipboardList,Eye
} from "lucide-react";
import {isAdmin} from "@/lib/admin-auth";
import {getPrisma} from "@/lib/prisma";
import {loadAnalyticsReport} from "@/lib/admin-analytics-server";
import {isKnownOrderState,orderStates} from "@/lib/order-lifecycle";
import AdminActivityChart from "@/components/admin-activity-chart";
import AdminShell from "./admin-shell";

export const metadata:Metadata={title:"Übersicht | Ruby Hair Verwaltung",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export const runtime="nodejs";
const number=(value:number)=>value.toLocaleString("de-DE");
export default async function AdminHome(){
 if(!await isAdmin())redirect("/admin/login");
 const db=getPrisma();
 const [products,variants,recentOrders,realOrders,testOrders,providerFields,analytics]=await Promise.all([
  db.product.findMany({select:{id:true,name:true,active:true,_count:{select:{variants:true}}},orderBy:{name:"asc"}}),
  db.variant.findMany({select:{stockQuantity:true,active:true}}),
  db.order.findMany({select:{id:true,orderNumber:true,status:true,testOnly:true,createdAt:true},orderBy:{createdAt:"desc"},take:4}),
  db.order.count({where:{testOnly:false}}),
  db.order.count({where:{testOnly:true}}),
  db.paymentIntegrationSetting.count(),
  loadAnalyticsReport(7)
 ]);
 const unknown=variants.filter(v=>v.stockQuantity===null).length;
 const soldOut=variants.filter(v=>v.stockQuantity===0).length;
 const low=variants.filter(v=>v.stockQuantity!==null&&v.stockQuantity>0&&v.stockQuantity<=5).length;
 const verified=variants.length-unknown;
 const progress=variants.length?Math.round(verified/variants.length*100):0;
 const analyticsOn=process.env.RUBY_ANALYTICS_ENABLED==="APPROVED";
 const onboarding=[
  {name:"Produktkatalog importiert",description:products.length+" Produkte · "+variants.length+" Varianten",ready:products.length>0,href:"/admin/produkte"},
  {name:"Bestände vollständig geprüft",description:unknown?unknown+" Mengen noch unbekannt":"Alle Bestände sind eingetragen",ready:variants.length>0&&unknown===0,href:"/admin/produkte?bestand=unbekannt"},
  {name:"Einwilligungsbasierte Analyse",description:analyticsOn?"Erfassung freigeschaltet":"Erfassung noch nicht freigeschaltet",ready:analyticsOn,href:"/admin/analytics"},
  {name:"Zahlungsanbieter technisch angebunden",description:providerFields?providerFields+" gespeicherte Felder, Checkout weiterhin aus":"API-Daten und Provider-Anbindung noch ausstehend",ready:false,href:"/admin/zahlungen"},
  {name:"Checkout und Zahlung end-to-end getestet",description:"Freigabe erst nach Testzahlung und signiertem Webhook",ready:false,href:"/admin/zahlungen"}
 ];
 const complete=onboarding.filter(s=>s.ready).length;
 const quick=[
  {href:"/admin/analytics",label:"Analyse öffnen",desc:"Tagesverlauf, Quellen und Artikelinteresse",icon:BarChart3},
  {href:"/admin/produkte?bestand=unbekannt",label:"Bestände prüfen",desc:unknown+" Varianten ohne verifizierte Menge",icon:Boxes},
  {href:"/admin/zahlungen",label:"Zahlungen vorbereiten",desc:"Providerdaten, Sandbox und Freigaben",icon:WalletCards}
 ];
 return <AdminShell current="dashboard" title="Dein Shop. Im Blick."
  description="Die wichtigsten Signale und nächsten Aufgaben auf einer Seite. Keine geschätzten Umsätze oder erfundenen Käuferzahlen.">
  <section className="rh-studio-hero">
   <div className="rh-studio-hero-copy">
    <span className="rh-studio-eyebrow"><ShieldCheck size={14}/> SHOP HEALTH / STARTKLARHEIT</span>
    <h2>Erst vorbereiten.<br/><em>Dann verkaufen.</em></h2>
    <p>Der neue Ruby Hair Shop läuft als Vorschau. Produkt- und Besuchsdaten sind verfügbar; der echte Checkout bleibt absichtlich gesperrt.</p>
    <Link href="/admin/produkte?bestand=unbekannt">Nächste Aufgabe ansehen <ArrowUpRight size={17}/></Link>
   </div>
   <div className="rh-studio-hero-progress">
    <div className="rh-studio-hero-progress-ring" style={{"--rh-progress":Math.round(complete/onboarding.length*100)+"%"} as React.CSSProperties}>
     <span><b>{complete}</b><small>/ {onboarding.length}</small></span>
    </div>
    <strong>Einrichtungsschritte</strong><small>{onboarding.length-complete} Schritte bis zur technischen Freigabe offen</small>
   </div>
  </section>
  <div className="rh-admin-kpi-grid rh-studio-kpis">
   {[
    {label:"Aktive Produkte",value:number(products.filter(p=>p.active).length),note:products.length+" im Katalog",icon:Package},
    {label:"Varianten ohne Menge",value:number(unknown),note:variants.length+" Varianten insgesamt",icon:AlertCircle},
    {label:"Seitenaufrufe · 7 Tage",value:analyticsOn?number(analytics.current.views):"—",note:"Zustimmungsbasierte Ereignisse",icon:Eye},
    {label:"Verifizierter Umsatz",value:"—",note:"Keine Live-Zahlungen aktiviert",icon:ShoppingCart}
   ].map(card=><article className="rh-admin-kpi" key={card.label}>
    <div className="rh-admin-kpi-top"><span>{card.label}</span><card.icon size={19}/></div>
    <strong>{card.value}</strong><small>{card.note}</small>
   </article>)}
  </div>
  <div className="rh-studio-content-grid">
   <section className="rh-admin-panel-card rh-studio-setup-panel">
    <div className="rh-admin-card-title"><div><span>CHECKLISTE / PRIORITÄTEN</span><h2>Was ist noch offen?</h2></div><span>{complete}/{onboarding.length} erledigt</span></div>
    <div className="rh-studio-checklist">{onboarding.map((step,i)=><Link href={step.href} key={step.name} className={"rh-studio-checklist-step "+(step.ready?"completed":"todo")}>
      <div className="rh-studio-check-number">{step.ready?<CheckCircle2 size={20}/>:String(i+1).padStart(2,"0")}</div>
      <div><strong>{step.name}</strong><small>{step.description}</small></div>
      <span className={"rh-studio-step-status "+(step.ready?"done":"pending")}>{step.ready?"Erledigt":"Offen"}</span>
      <ArrowRight size={16}/>
    </Link>)}</div>
   </section>
   <section className="rh-admin-panel-card rh-studio-traffic-panel">
    <div className="rh-admin-card-title"><div><span>ANALYTICS / 7 TAGE</span><h2>Aktivität im Shop</h2></div><Link href="/admin/analytics?tage=7">Alle Reports <ArrowUpRight size={15}/></Link></div>
    <div className="rh-studio-traffic-totals">
     <div><strong>{analyticsOn?number(analytics.current.views):"—"}</strong><span>Seitenaufrufe</span></div>
     <div><strong>{analyticsOn?number(analytics.current.added):"—"}</strong><span>Warenkorb-Aktionen</span></div>
    </div>
    {analyticsOn&&analytics.current.views>0?<AdminActivityChart daily={analytics.daily}/>:<div className="rh-insight-chart-empty"><BarChart3 size={28}/><strong>Noch kein Verlauf</strong><p>Die Kurve entsteht aus freigegebenen Seitenaufrufen.</p></div>}
    <p className="rh-admin-muted">Gezählte Ereignisse, keine eindeutigen Besucher oder Käufe.</p>
   </section>
  </div>
  <div className="rh-admin-overview-columns rh-studio-overview-bottom">
   <section className="rh-admin-panel-card">
    <div className="rh-admin-card-title"><div><span>LAGER / BESTAND</span><h2>Inventarqualität</h2></div><Link href="/admin/produkte">Bearbeiten <ArrowUpRight size={15}/></Link></div>
    <div className="rh-studio-stock-score"><strong>{progress}%</strong><span>Varianten mit bekannter Menge</span></div>
    <div className="rh-admin-inventory-bar"><span style={{width:progress+"%"}}/></div>
    <div className="rh-admin-inventory-list">
     <div><span><i className="rh-admin-dot unknown"/>Unbekannter Bestand</span><b>{unknown}</b></div>
     <div><span><i className="rh-admin-dot zero"/>Ausverkauft (0)</span><b>{soldOut}</b></div>
     <div><span><i className="rh-admin-dot low"/>Niedriger Bestand (1–5)</span><b>{low}</b></div>
    </div>
    <Link className="rh-admin-primary-link" href="/admin/produkte?bestand=unbekannt">Unbekannte Bestände bearbeiten <ArrowRight size={17}/></Link>
   </section>
   <section className="rh-admin-panel-card">
    <div className="rh-admin-card-title"><div><span>ORDERS / DATABASE</span><h2>Bestellstatus</h2></div><Link href="/admin/bestellungen">Zur Liste <ArrowUpRight size={15}/></Link></div>
    <div className="rh-admin-order-metrics">
     <div><strong>{realOrders}</strong><span>Datensätze ohne Testkennzeichen</span></div>
     <div><strong>{testOrders}</strong><span>Technische Testdatensätze</span></div>
    </div>
    {recentOrders.length?<div className="rh-admin-recent-list">{recentOrders.map(o=><div key={o.id}>
      <div><strong>#{o.orderNumber.toString()}</strong><small>{o.testOnly?"TEST · ":"NICHT VERIFIZIERT · "}{isKnownOrderState(o.status)?orderStates[o.status]:o.status}</small></div>
      <span>{o.createdAt.toLocaleDateString("de-DE",{timeZone:"Europe/Berlin"})}</span>
    </div>)}</div>:<div className="rh-admin-empty"><Clock3 size={24}/><strong>Noch keine Bestellungen</strong><p>Der Checkout ist nicht freigeschaltet. Es werden keine Verkäufe oder Umsätze vorgetäuscht.</p></div>}
   </section>
  </div>
  <section className="rh-studio-quick-section">
   <div className="rh-studio-section-title"><span>DEINE NÄCHSTEN SCHRITTE</span><h2>Direkt weiterarbeiten</h2></div>
   <div className="rh-studio-quick-grid">{quick.map(item=><Link href={item.href} key={item.href} className="rh-studio-quick-link">
    <item.icon size={21}/><div><strong>{item.label}</strong><small>{item.desc}</small></div><ArrowUpRight size={18}/>
   </Link>)}</div>
  </section>
 </AdminShell>;
}
