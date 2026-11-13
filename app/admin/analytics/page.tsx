import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {
 ArrowDownRight,ArrowRight,ArrowUpRight,BarChart3,CalendarDays,CheckCircle2,
 Download,Info,MousePointer2,ShoppingBag,ShoppingCart,Eye,ShieldCheck
} from "lucide-react";
import {isAdmin} from "@/lib/admin-auth";
import {
 analyticsPeriods,parseAnalyticsPeriod,analyticsSourceLabels,analyticsDeviceLabels,analyticsPathLabel,
 type AnalyticsReport
} from "@/lib/admin-analytics-report";
import {loadAnalyticsReport} from "@/lib/admin-analytics-server";
import AdminActivityChart from "@/components/admin-activity-chart";
import AdminShell from "../admin-shell";

export const metadata:Metadata={title:"Analytics | Ruby Hair Verwaltung",robots:{index:false,follow:false}};
export const runtime="nodejs";
export const dynamic="force-dynamic";
const number=(n:number)=>n.toLocaleString("de-DE");
const percent=(n:number)=>n.toLocaleString("de-DE",{maximumFractionDigits:1,minimumFractionDigits:1})+" %";
const date=(d:Date)=>d.toLocaleDateString("de-DE",{day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"});
const numeral=(enabled:boolean,value:number)=>enabled?number(value):"—";
function Change({value,prior,current}:{value:number|null;prior:number;current:number}){
 if(value===null)return <span className="rh-delta is-neutral">{prior===0&&current>0?"Neu im Zeitraum":"Ohne Vergleichsbasis"}</span>;
 if(value===0)return <span className="rh-delta is-neutral">0 % zum Vorzeitraum</span>;
 const Up=value>0;
 return <span className={"rh-delta "+(Up?"is-up":"is-down")}>
  {Up?<ArrowUpRight size={13}/>:<ArrowDownRight size={13}/>}
  {Up?"+":""}{percent(value)} <em>zum Vorzeitraum</em>
 </span>;
}
function MetricCard({title,value,note,change,prior,current,icon}:{
 title:string;value:string;note:string;change?:number|null;prior?:number;current?:number;
 icon:React.ReactNode
}){
 return <article className="rh-insight-metric">
  <div className="rh-insight-metric-label"><span>{title}</span>{icon}</div>
  <div className="rh-insight-metric-value">{value}</div>
  <div className="rh-insight-metric-foot">
   {change!==undefined&&prior!==undefined&&current!==undefined?<Change value={change} prior={prior} current={current}/>:null}
   <small>{note}</small>
  </div>
 </article>;
}
function Distribution({title,subtitle,items,label}:{
 title:string;subtitle:string;items:AnalyticsReport["sources"];label:(key:string)=>string
}){
 return <section className="rh-admin-panel-card rh-insight-distribution">
  <div className="rh-admin-card-title"><div><span>{subtitle}</span><h2>{title}</h2></div></div>
  {items.length?<div className="rh-insight-distribution-list">{items.map((item,i)=><div className="rh-insight-distribution-row" key={item.key}>
   <div className="rh-insight-distribution-title"><span><i className={"rh-insight-chart-dot tone-"+(i%5)}/>{label(item.key)}</span><strong>{number(item.count)}</strong></div>
   <div className="rh-insight-distribution-progress"><span style={{width:item.share+"%"}}/></div>
   <small>{percent(item.share)} der gemessenen Seitenaufrufe</small>
  </div>)}</div>:<div className="rh-insight-empty">Noch keine freigegebenen Seitenaufrufe für diese Auswertung.</div>}
 </section>;
}
export default async function AdminAnalytics({searchParams}:{searchParams:Promise<{tage?:string}>}){
 if(!await isAdmin())redirect("/admin/login");
 const params=await searchParams;
 const period=parseAnalyticsPeriod(params.tage);
 const enabled=process.env.RUBY_ANALYTICS_ENABLED==="APPROVED";
 const report=await loadAnalyticsReport(period);
 const {current,previous}=report;
 const trackable=enabled&&current.views>0;
 const topInterest=report.pages.filter(p=>p.views>0||p.cartActions>0).slice(0,9);
 const totalActions=current.views+current.added+current.checkouts;
 const steps=[
  {label:"Seitenaufrufe",value:current.views,help:"Jedes geladene, einwilligte Seitenereignis"},
  {label:"In den Warenkorb",value:current.added,help:"Klick-Ereignisse, keine einzelnen Käufer"},
  {label:"Kasse aufgerufen",value:current.checkouts,help:"Kassen-Seitenereignisse, keine Bestellungen"}
 ];
 return <AdminShell current="analytics" title="Analytics & Insights."
  description="Bewegungen verstehen, Artikelinteresse erkennen und Maßnahmen ableiten – ausschließlich aus freigegebenen Ereignissen.">
  <div className="rh-insight-toolbar">
   <div className="rh-insight-toolbar-meta"><CalendarDays size={16}/><span>{date(report.start)} – {date(report.end)} · UTC</span></div>
   <nav className="rh-insight-periods" aria-label="Auswertungszeitraum">
    {analyticsPeriods.map(n=><Link key={n} href={"/admin/analytics?tage="+n}
     aria-current={period===n?"page":undefined} className={period===n?"is-active":undefined}>{n} Tage</Link>)}
   </nav>
   <Link className="rh-insight-export" href={"/admin/analytics/export?tage="+period}>
    <Download size={16}/> CSV exportieren
   </Link>
  </div>
  <div className="rh-insight-consent-bar">
   <div><span className={"rh-insight-signal "+(enabled?"enabled":"disabled")}/>
    <strong>{enabled?"Statistik-Erfassung aktiv":"Statistik-Erfassung deaktiviert"}</strong>
    <p>Nur nach ausdrücklicher Einwilligung · anonymisierte Tagesaggregate · 180 Tage Aufbewahrung</p>
   </div>
   <div className="rh-insight-consent-help"><ShieldCheck size={19}/><span>Keine Nutzerprofile oder einzelnen Sitzungen</span></div>
  </div>
  <div className="rh-insight-kpis">
   <MetricCard title="Seitenaufrufe" value={numeral(enabled,current.views)} icon={<Eye size={19}/>}
    current={current.views} prior={previous.views} change={enabled?report.viewChange:undefined}
    note="Keine eindeutigen Besucher"/>
   <MetricCard title="Warenkorb-Aktionen" value={numeral(enabled,current.added)} icon={<ShoppingCart size={19}/>}
    current={current.added} prior={previous.added} change={enabled?report.cartChange:undefined}
    note="Klicks, keine Sitzungen"/>
   <MetricCard title="Kassenaufrufe" value={numeral(enabled,current.checkouts)} icon={<ShoppingBag size={19}/>}
    current={current.checkouts} prior={previous.checkouts} change={enabled?report.checkoutChange:undefined}
    note="Kein bestätigter Kauf"/>
   <MetricCard title="Bezahlter Umsatz" value="—" icon={<BarChart3 size={19}/>}
    note="Checkout und PSP noch deaktiviert"/>
  </div>
  <div className="rh-insight-main-grid">
   <section className="rh-admin-panel-card rh-insight-trend-card">
    <div className="rh-admin-card-title">
     <div><span>VERLAUF / {period} TAGE</span><h2>Aktivität im Zeitverlauf</h2></div>
     <span>UTC · täglich</span>
    </div>
    <div className="rh-insight-legend">
     <span><i className="views"/>Seitenaufrufe</span>
     <span><i className="cart"/>Warenkorb-Aktionen</span>
    </div>
    {trackable?<><AdminActivityChart daily={report.daily}/>
      <div className="rh-insight-chart-footer"><span>{report.observedDays} Tage mit aufgezeichneten Seitenaufrufen</span><span>Höchster Tageswert: {number(Math.max(...report.daily.map(d=>d.views)))}</span></div>
     </>:<div className="rh-insight-chart-empty">
      <BarChart3 size={28}/>
      <strong>Noch keine auswertbare Verlaufskurve</strong>
      <p>Wenn Kundinnen zustimmen und Seiten aufrufen, erscheint hier der Tagesverlauf. Ohne Freigabe werden keine Daten gezählt.</p>
     </div>}
   </section>
   <section className="rh-admin-panel-card rh-insight-health-card">
    <div className="rh-admin-card-title"><div><span>INTERPRETATION</span><h2>Was zeigen die Daten?</h2></div></div>
    <div className="rh-insight-readout">
     <div><span>Erfasste Aktivität</span><strong>{enabled?number(totalActions):"—"}</strong><small>Event-Vorkommen im ausgewählten Zeitraum</small></div>
     <div><span>Vorzeitraum</span><strong>{enabled?number(previous.views):"—"}</strong><small>Seitenaufrufe in den vorangegangenen {period} Tagen</small></div>
     <div><span>Tage mit Seitenaufrufen</span><strong>{enabled?report.observedDays+" / "+period:"—"}</strong><small>Keine Aussage über aktive Nutzer pro Tag</small></div>
    </div>
    <div className="rh-insight-action-note"><Info size={18}/>
     <p>{current.views===0?"Für Entscheidungen ist noch mehr freigegebene Aktivität erforderlich.":"Bei geringen Datenmengen sind einzelne Schwankungen nicht aussagekräftig. Seitenaufrufe und Warenkorb-Klicks sind keine Besucher- oder Kaufquoten."}</p>
    </div>
   </section>
  </div>
  <div className="rh-insight-main-grid rh-insight-secondary-grid">
   <section className="rh-admin-panel-card">
    <div className="rh-admin-card-title"><div><span>SEITEN / NACHFRAGE</span><h2>Welche Inhalte werden genutzt?</h2></div><span>Top 9</span></div>
    <p className="rh-admin-muted">Seitenaufrufe und Warenkorb-Aktionen je Seitenpfad. Ein Klick kann mehrfach vorkommen.</p>
    {enabled&&topInterest.length?<div className="rh-insight-table-wrap"><table className="rh-insight-table">
     <thead><tr><th>Bereich</th><th>Aufrufe</th><th>Warenkorb-Klicks</th><th>Anteil an Aufrufen</th></tr></thead>
     <tbody>{topInterest.map(p=><tr key={p.path}>
      <td><span className="rh-insight-path-name">{analyticsPathLabel(p.path)}</span><small>{p.path}</small></td>
      <td>{number(p.views)}</td><td>{number(p.cartActions)}</td>
      <td><div className="rh-insight-table-bar"><span style={{width:current.views?Math.min(100,p.views/current.views*100)+"%":"0%"}}/></div>
       <small>{current.views?percent(p.views/current.views*100):"—"}</small></td>
     </tr>)}</tbody></table></div>:<div className="rh-insight-empty">Noch keine passenden Seitenereignisse.</div>}
   </section>
   <section className="rh-admin-panel-card rh-insight-events-card">
    <div className="rh-admin-card-title"><div><span>SHOPPING / INTERAKTIONEN</span><h2>Ereignisfolge</h2></div></div>
    <p className="rh-admin-muted">Drei unabhängig gezählte Ereignistypen. Keine personengebundene Conversion-Funnel-Analyse.</p>
    <div className="rh-insight-event-steps">{steps.map((step,i)=><div key={step.label} className="rh-insight-event-step">
     <span className="rh-insight-event-index">0{i+1}</span>
     <div><strong>{step.label}</strong><small>{step.help}</small></div>
     <b>{numeral(enabled,step.value)}</b>
    </div>)}</div>
    <div className="rh-insight-not-a-conversion"><MousePointer2 size={16}/><p>Eine Person kann dieselbe Seite mehrfach öffnen oder den Warenkorb mehrfach anklicken. Deshalb berechnen wir daraus <strong>keine Conversion-Rate</strong>.</p></div>
   </section>
  </div>
  <div className="rh-insight-distributions">
   <Distribution title="Referrer-Kategorien" subtitle="AUFRUFQUELLEN / NICHT ATTRIBUTION" items={enabled?report.sources:[]} label={key=>analyticsSourceLabels[key]||key}/>
   <Distribution title="Gerätenutzung" subtitle="GERÄTE / SEITENAUFRUFE" items={enabled?report.devices:[]} label={key=>analyticsDeviceLabels[key]||key}/>
  </div>
  <section className="rh-admin-panel-card rh-insight-methodology">
   <div className="rh-insight-method-head"><CheckCircle2 size={20}/><div><strong>Datengrundlage und Grenzen</strong><p>Worauf du dich bei diesen Kennzahlen verlassen kannst – und worauf nicht.</p></div></div>
   <div className="rh-insight-method-grid">
    <div><span>01 / ERFASST</span><p>Seitenaufrufe, Warenkorb-Aktionen, Kassenaufrufe, kategorisierte Referrer und Mobil/Desktop. Nur mit Zustimmung.</p></div>
    <div><span>02 / NICHT ERFASST</span><p>Einzelne Besucher, Sitzungsdauer, eindeutige Nutzer, Abbruch- oder Checkout-Conversion-Rate, Suchbegriffe oder Warenkorbinhalte.</p></div>
    <div><span>03 / NICHT LIVE</span><p>Bezahlte Bestellungen, echte Umsätze und Marketing-ROI sind ohne freigeschalteten und verifizierten Checkout nicht auswertbar.</p></div>
   </div>
   <p className="rh-insight-method-foot">Referrer zeigen die Herkunft einzelner Seitenaufrufe und enthalten interne Navigation. Sie sind keine belastbare Marketingkanal-Zuordnung. Gespeicherte Tage sind UTC-Tage.</p>
  </section>
 </AdminShell>;
}
