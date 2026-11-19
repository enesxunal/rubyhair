import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {
 BarChart3,CalendarDays,Download,Eye,Info,MousePointer2,ShoppingBag,
 ShoppingCart,Sparkles,ShieldCheck,TrendingUp
} from "lucide-react";
import {isAdmin} from "@/lib/admin-auth";
import {
 parseAnalyticsRange,analyticsPathLabel,analyticsSourceLabels,analyticsDeviceLabels,
 isoDay,addUtcDays,type AnalyticsReport
} from "@/lib/admin-analytics-report";
import {loadAnalyticsReport} from "@/lib/admin-analytics-server";
import AdminActivityChart from "@/components/admin-activity-chart";
import AdminShell from "../admin-shell";

export const metadata:Metadata={title:"Statistik | Ruby Hair Verwaltung",robots:{index:false,follow:false}};
export const runtime="nodejs";
export const dynamic="force-dynamic";
const number=(n:number)=>new Intl.NumberFormat("de-DE").format(n);
const enabledValue=(enabled:boolean,n:number)=>enabled?number(n):"—";
const date=(d:Date)=>d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"UTC"});
const pct=(n:number)=>n.toLocaleString("de-DE",{maximumFractionDigits:1,minimumFractionDigits:1})+" %";

function OverviewCard({label,value,note,icon,highlight=false}:{label:string;value:string;note:string;icon:React.ReactNode;highlight?:boolean}){
 return <article className={"rh-ops-metric"+(highlight?" is-featured":"")}>
  <div className="rh-ops-metric-heading"><span>{label}</span>{icon}</div>
  <strong>{value}</strong><small>{note}</small>
 </article>;
}

function EventFunnel({report,enabled}:{report:AnalyticsReport;enabled:boolean}){
 const items=[
  {name:"Shop aufgerufen",n:report.current.views,description:"Alle gezählten Seitenansichten"},
  {name:"Produkte angesehen",n:report.funnel.productViews,description:"Produktseiten-Aufrufe"},
  {name:"Zum Warenkorb hinzugefügt",n:report.current.added,description:"Klicks auf Warenkorb hinzufügen"},
  {name:"Kasse geöffnet",n:report.current.checkouts,description:"Aufrufe des Checkouts"}
 ];
 const max=Math.max(1,...items.map(x=>x.n));
 return <section className="rh-admin-panel-card rh-ops-funnel" aria-labelledby="rh-ops-funnel-title">
  <div className="rh-ops-section-head"><div><span>02 / SHOPPING FUNNEL</span><h2 id="rh-ops-funnel-title">Wo entsteht Kaufinteresse?</h2>
   <p>Vom Seitenaufruf bis zur Kasse – als einfache Übersicht der erfassten Aktionen.</p></div></div>
  <div className="rh-ops-funnel-steps">
   {items.map((item,i)=><div className="rh-ops-funnel-step" key={item.name}>
    <div className="rh-ops-funnel-step-title"><span><b>{String(i+1).padStart(2,"0")}</b>{item.name}</span><strong>{enabledValue(enabled,item.n)}</strong></div>
    <div className="rh-ops-funnel-track"><span style={{width:enabled?Math.max(item.n?2:0,item.n/max*100)+"%":"0%"}}/></div>
    <small>{item.description}</small>
   </div>)}
  </div>
  <p className="rh-ops-funnel-disclaimer"><Info size={16}/><span><strong>Wichtig:</strong> Dies sind unabhängige Ereigniszahlen, kein Verlauf einzelner Personen. Derselbe Besucher kann mehrfach klicken. Daher ist daraus <strong>keine Conversion-Rate</strong>, Nutzerzahl oder Abbruchquote ableitbar. Umsatz wird hier nicht aus anonymen Klicks geschätzt.</span></p>
 </section>;
}

function Breakdown({title,items,labels}:{title:string;items:AnalyticsReport["sources"];labels:Record<string,string>}){
 return <div className="rh-ops-breakdown"><h3>{title}</h3>
  {items.length?items.map(({key,count,share})=><div className="rh-ops-breakdown-row" key={key}>
    <span>{labels[key]||key}</span><strong>{number(count)} <small>· {pct(share)}</small></strong>
   </div>):<p>Noch keine passenden Seitenaufrufe.</p>}
 </div>;
}

export default async function AdminAnalytics({searchParams}:{searchParams:Promise<{zeitraum?:string;von?:string;bis?:string;tage?:string}>}){
 if(!await isAdmin())redirect("/admin/login");
 const params=await searchParams;
 const range=parseAnalyticsRange(params);
 const enabled=process.env.RUBY_ANALYTICS_ENABLED==="APPROVED";
 const report=await loadAnalyticsReport(range);
 const {current,previous}=report;
 const exportQuery=new URLSearchParams({zeitraum:range.mode});
 if(range.mode==="frei"){exportQuery.set("von",isoDay(range.start));exportQuery.set("bis",isoDay(range.end));}
 const presets=[
  {value:"heute",label:"Heute"},{value:"gestern",label:"Gestern"},
  {value:"7",label:"7 Tage"},{value:"30",label:"30 Tage"},{value:"90",label:"90 Tage"}
 ];
 const dateLimit=isoDay(addUtcDays(new Date(new Date().toISOString().slice(0,10)+"T00:00:00Z"),-179));
 return <AdminShell current="analytics" title="Statistik im Überblick."
  description="Einfach sehen, was im Shop passiert: Aufrufe, Produktinteresse, Warenkorb und Storys.">
  <section className="rh-ops-filters" aria-label="Zeitraum der Statistik">
   <div className="rh-ops-presets" role="group" aria-label="Schnellauswahl">
    {presets.map(item=><Link key={item.value} prefetch={false}
     className={range.mode===item.value?"is-active":""}
     aria-current={range.mode===item.value?"page":undefined}
     href={"/admin/analytics?zeitraum="+item.value}>{item.label}</Link>)}
   </div>
   <form className="rh-ops-custom" action="/admin/analytics" method="GET">
    <input type="hidden" name="zeitraum" value="frei"/>
    <label>Von <input type="date" name="von" required min={dateLimit} max={isoDay(new Date())}
      defaultValue={isoDay(range.start)}/></label>
    <label>Bis <input type="date" name="bis" required min={dateLimit} max={isoDay(new Date())}
      defaultValue={isoDay(range.end)}/></label>
    <button type="submit">Anwenden</button>
   </form>
   <Link className="rh-ops-export" prefetch={false} href={"/admin/analytics/export?"+exportQuery.toString()}>
    <Download size={15}/> CSV exportieren
   </Link>
   <p className="rh-ops-filter-caption"><CalendarDays size={14}/> {range.label}: {date(report.start)} – {date(report.end)} · {range.days} {range.days===1?"Tag":"Tage"} · UTC-Tageswerte</p>
  </section>
  <section className="rh-ops-kpis" aria-label="Wichtigste Kennzahlen">
   <OverviewCard label="Seitenaufrufe" icon={<Eye size={19}/>} value={enabledValue(enabled,current.views)}
    note="Aufrufe, keine eindeutigen Besucher" highlight/>
   <OverviewCard label="Produktansichten" icon={<TrendingUp size={19}/>} value={enabledValue(enabled,report.funnel.productViews)}
    note="Aufrufe der Produktseiten"/>
   <OverviewCard label="Zum Warenkorb" icon={<ShoppingCart size={19}/>} value={enabledValue(enabled,current.added)}
    note="Warenkorb-Aktionen"/>
   <OverviewCard label="Kassenaufrufe" icon={<ShoppingBag size={19}/>} value={enabledValue(enabled,current.checkouts)}
    note="Kassenbesuche, keine Käufe"/>
  </section>
  <div className="rh-ops-analytics-note"><ShieldCheck size={16}/><span>
   {enabled?"Erfassung aktiv – nur mit Einwilligung.":"Erfassung deaktiviert."}
   {" "}Anonyme Tageswerte, keine Kundenprofile. Aktualisierung spätestens nach ca. 30 Sekunden.
   </span></div>
  <div className="rh-ops-primary">
   <section className="rh-admin-panel-card rh-ops-activity">
    <div className="rh-ops-section-head"><div><span>01 / ENTWICKLUNG</span><h2>Aktivität im Zeitverlauf</h2>
     <p>Wie oft wurden Seiten angesehen und Produkte zum Warenkorb hinzugefügt?</p></div></div>
    {enabled&&report.current.views>0?<AdminActivityChart daily={report.daily}/>:<div className="rh-insight-empty">Noch keine freigegebenen Daten für diesen Zeitraum.</div>}
    <p className="rh-ops-muted">Vorherige {range.days} {range.days===1?"Tag":"Tage"}: {enabledValue(enabled,previous.views)} Seitenaufrufe. Keine eindeutigen Besucher.</p>
   </section>
   <EventFunnel report={report} enabled={enabled}/>
  </div>
  <div className="rh-ops-community-head"><span>03 / COMMUNITY</span><h2>Storys & KI-Haaranprobe</h2>
   <p>Sieh auf einen Blick, welche Storys angeschaut und wie oft Haarfarben getestet werden.</p></div>
  <div className="rh-ops-community-kpis">
   <OverviewCard label="Story-Aufrufe" value={enabledValue(enabled,report.engagement.storyViews)} icon={<Eye size={17}/>}
    note="Alle Story-Wiedergaben"/>
   <OverviewCard label="KI gestartet" value={enabledValue(enabled,report.engagement.aiStarts)} icon={<Sparkles size={17}/>}
    note="Begonnene Versuche"/>
   <OverviewCard label="KI-Ergebnisse" value={enabledValue(enabled,report.engagement.aiTryons)} icon={<Sparkles size={17}/>}
    note="Erfolgreich erstellt"/>
   <OverviewCard label="KI → Warenkorb" value={enabledValue(enabled,report.engagement.aiAdds)} icon={<ShoppingBag size={17}/>}
    note="Aus dem Ergebnis zum Warenkorb"/>
  </div>
  <section className="rh-admin-panel-card rh-ops-stories" aria-labelledby="rh-ops-stories-title">
   <div className="rh-ops-section-head"><div><span>COMMUNITY-STORYS</span><h2 id="rh-ops-stories-title">Welche Story wird angesehen?</h2></div></div>
   <div className="rh-ops-story-grid">
    {report.stories.map((story,i)=><div className="rh-ops-story-item" key={story.path}>
     <img src={story.image} width="54" height="68" alt="" loading="lazy"/>
     <div><strong>{story.name}</strong><small>Story {String(i+1).padStart(2,"0")}</small></div>
     <div className="rh-ops-story-count"><strong>{enabledValue(enabled,story.views)}</strong><small>Aufrufe</small></div>
    </div>)}
   </div>
   <p className="rh-ops-muted">Die Werte zählen Wiedergaben nach Einwilligung; keine eindeutigen Nutzer oder einzelnen Personen.</p>
  </section>
  <details className="rh-admin-panel-card rh-ops-more">
   <summary><span><MousePointer2 size={18}/> Weitere Analysen</span><small>Beliebte Seiten, Herkunft und Geräte anzeigen</small></summary>
   <div className="rh-ops-more-content">
    <div className="rh-ops-top-pages"><h3>Beliebte Seiten</h3>
     {report.pages.filter(p=>p.views>0||p.cartActions>0).slice(0,10).map(p=><div key={p.path}>
      <span>{analyticsPathLabel(p.path)}<small>{p.path}</small></span>
      <strong>{number(p.views)} <small>Aufrufe</small></strong>
     </div>)}
     {!report.pages.length&&<p>Noch keine Seitenaufrufe verfügbar.</p>}
    </div>
    <Breakdown title="Referrer-Kategorien" items={enabled?report.sources:[]} labels={analyticsSourceLabels}/>
    <Breakdown title="Geräte" items={enabled?report.devices:[]} labels={analyticsDeviceLabels}/>
   </div>
  </details>
  <p className="rh-ops-privacy-footer"><BarChart3 size={15}/> Bezahlter Umsatz wird hier nicht aus anonymen Klicks geschätzt. Bestätigte Zahlungen und Rechnungen findest du unter Bestellungen/Zahlungen. Eine echte, personenbezogene Funnel- oder Conversion-Rate-Analyse findet nicht statt.</p>
 </AdminShell>;
}
