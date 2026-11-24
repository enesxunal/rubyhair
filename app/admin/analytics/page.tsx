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
import {loadCommerceReportSafely} from "@/lib/admin-commerce-server";
import AdminCommercePanel from "@/components/admin-commerce-panel";
import AdminAnalyticsRefresh from "@/components/admin-analytics-refresh";
import AdminAnalyticsTrend from "@/components/admin-analytics-trend";
import AdminAnalyticsChannels from "@/components/admin-analytics-channels";
import {berlinDateKey} from "@/lib/analytics-calendar";
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
  <div className="rh-ops-section-head"><div><span>SHOPPING EVENTS</span><h2 id="rh-ops-funnel-title">Wo entsteht Kaufinteresse?</h2>
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
 // Finish the analytics query before commerce to avoid exhausting the Vercel pool.
 const report=await loadAnalyticsReport(range);
 const commerce=await loadCommerceReportSafely(range);
 const {current,previous}=report;
 const storyDailyMax=Math.max(1,...report.daily.map(day=>day.storyViews));
 const exportQuery=new URLSearchParams({zeitraum:range.mode});
 if(range.mode==="frei"){exportQuery.set("von",isoDay(range.start));exportQuery.set("bis",isoDay(range.end));}
 const presets=[
  {value:"heute",label:"Heute"},{value:"gestern",label:"Gestern"},
  {value:"7",label:"7 Tage"},{value:"30",label:"30 Tage"},{value:"90",label:"90 Tage"}
 ];
 const dateLimit=isoDay(addUtcDays(berlinDateKey(),-179));
 return <AdminShell current="analytics" title="Statistik im Überblick."
  description="Umsatz, Anzeigenquellen, Nachfrage, Warenkorb und Produkte: die operative Sicht auf echte Shop-Daten.">
  <section className="rh-ops-filters" aria-label="Zeitraum der Statistik">
   <div className="rh-ops-presets" role="group" aria-label="Schnellauswahl">
    {presets.map(item=><Link key={item.value} prefetch={false}
     className={range.mode===item.value?"is-active":""}
     aria-current={range.mode===item.value?"page":undefined}
     href={"/admin/analytics?zeitraum="+item.value}>{item.label}</Link>)}
   </div>
   <form className="rh-ops-custom" action="/admin/analytics" method="GET">
    <input type="hidden" name="zeitraum" value="frei"/>
    <label>Von <input type="date" name="von" required min={dateLimit} max={isoDay(berlinDateKey())}
      defaultValue={isoDay(range.start)}/></label>
    <label>Bis <input type="date" name="bis" required min={dateLimit} max={isoDay(berlinDateKey())}
      defaultValue={isoDay(range.end)}/></label>
    <button type="submit">Anwenden</button>
   </form>
   <Link className="rh-ops-export" prefetch={false} href={"/admin/analytics/export?"+exportQuery.toString()}>
    <Download size={15}/> CSV exportieren
   </Link>
   <p className="rh-ops-filter-caption"><CalendarDays size={14}/> {range.label}: {date(report.start)} – {date(report.end)} · {range.days} {range.days===1?"Tag":"Tage"} · Europe/Berlin · ältere Einträge wurden vor der Umstellung in UTC gezählt</p>
  </section>
  <section className="rh-adv-hero" aria-label="Kennzahlen-Übersicht">
   <div><span>RUBY HAIR · PERFORMANCE STUDIO</span><h2>Alle Zahlen. Ein klarer Überblick.</h2>
    <p>Black Friday 2026 · Anzeigen, Kundeninteresse und bezahlte Bestellungen auf einen Blick.</p>
    <div className="rh-adv-hero-tags"><span>Europe/Berlin</span><span>{enabled?"Statistik mit Einwilligung aktiv":"Besucherstatistik deaktiviert"}</span><span>Bezahlte Bestellungen aus verifizierten Zahlungen</span><a href="#story-analytics">Story-Statistiken</a></div>
   </div>
   <AdminAnalyticsRefresh trafficAt={report.loadedAt} commerceAt={commerce?.loadedAt}/>
  </section>
  <section className="rh-ops-kpis" aria-label="Wichtigste Kennzahlen">
   <OverviewCard label="Seitenaufrufe" icon={<Eye size={19}/>} value={enabledValue(enabled,current.views)}
    note={"Aufrufe, keine eindeutigen Besucher · zuvor "+(enabled?number(previous.views):"—")} highlight/>
   <OverviewCard label="Produktansichten" icon={<TrendingUp size={19}/>} value={enabledValue(enabled,report.funnel.productViews)}
    note="Aufrufe der Produktseiten; kein Besucherzähler"/>
   <OverviewCard label="Zum Warenkorb" icon={<ShoppingCart size={19}/>} value={enabledValue(enabled,current.added)}
    note={"Warenkorb-Aktionen · zuvor "+(enabled?number(previous.added):"—")}/>
   <OverviewCard label="Kassenaufrufe" icon={<ShoppingBag size={19}/>} value={enabledValue(enabled,current.checkouts)}
    note={"Kassenbesuche, keine Käufe · zuvor "+(enabled?number(previous.checkouts):"—")}/>
  </section>
  <AdminCommercePanel data={commerce}/>
  <section className="rh-adv-story-dashboard" id="story-analytics" aria-labelledby="rh-adv-story-title">
   <div className="rh-adv-section-title"><div><span>04 / COMMUNITY PERFORMANCE</span><h2 id="rh-adv-story-title">Story-Statistiken</h2>
    <p>Wiedergaben, täglicher Verlauf und Leistung jeder einzelnen Ruby Hair Community-Story – direkt sichtbar, ohne Untermenü.</p></div>
    <a href="/" target="_blank" rel="noopener noreferrer" className="rh-adv-story-shop-link">Community ansehen</a>
   </div>
   <div className="rh-adv-story-period"><span>Ausgewählter Zeitraum: <strong>{range.label}</strong></span><span>Vorheriger Zeitraum: <strong>{enabledValue(enabled,report.previousEngagement.storyViews)} Aufrufe</strong></span></div>
  {report.end>=new Date("2026-11-24T00:00:00Z")&&
   <p className="rh-ops-muted" style={{marginBottom:14}}>Story-Bereich tatsächlich im Sichtfeld (mindestens 50 % für 1 Sekunde, mit Statistik-Einwilligung): <strong>{enabledValue(enabled,report.engagement.storySectionSeen)}</strong>. Diese Messung beginnt am 24.11.2026 und zählt keine Story-Wiedergaben.</p>}
  <div className="rh-ops-community-kpis">
   <OverviewCard label="Story-Aufrufe" value={enabledValue(enabled,report.engagement.storyViews)} icon={<Eye size={17}/>}
    note="Nur Wiedergaben nach Statistik-Einwilligung" highlight/>
   <OverviewCard label="KI gestartet" value={enabledValue(enabled,report.engagement.aiStarts)} icon={<Sparkles size={17}/>}
    note="Begonnene Versuche"/>
   <OverviewCard label="KI-Ergebnisse" value={enabledValue(enabled,report.engagement.aiTryons)} icon={<Sparkles size={17}/>}
    note="Erfolgreich erstellt"/>
   <OverviewCard label="KI → Warenkorb" value={enabledValue(enabled,report.engagement.aiAdds)} icon={<ShoppingBag size={17}/>}
    note="Aus dem Ergebnis zum Warenkorb"/>
  </div>
  {enabled&&report.engagement.storyViews===0&&current.views>0&&
   <p className="rh-ops-muted" role="status">{number(current.views)} erfasste Seitenaufrufe, aber keine Story-Wiedergabe mit Statistik-Einwilligung in diesem Zeitraum. 0 erfasste Aufrufe sind kein Nachweis für 0 tatsächliche Zuschauer.</p>}
  {enabled&&report.engagement.aiStarts===0&&report.funnel.aiViews>0&&
   <p className="rh-ops-muted" role="status">Die KI-Anprobe-Seite wurde {number(report.funnel.aiViews)}-mal mit Einwilligung geöffnet, aber kein KI-Versuch gestartet. Ein Seitenaufruf ist noch kein KI-Start.</p>}
  <section className="rh-admin-panel-card rh-adv-story-trend" aria-labelledby="rh-adv-story-trend-title">
   <div className="rh-ops-section-head"><div><span>STORY PERFORMANCE / TÄGLICH</span><h2 id="rh-adv-story-trend-title">Story-Aufrufe im Zeitverlauf</h2>
    <p>Die Werte zählen abgespielte Storys, nicht eindeutige Besucher.</p></div></div>
   <div className="rh-adv-story-chart-scroll">
    <div className="rh-adv-story-chart" style={{minWidth:Math.max(350,report.daily.length*17)}} role="img" aria-label={`Tägliche Story-Aufrufe im Zeitraum ${range.label}: ${enabledValue(enabled,report.engagement.storyViews)} insgesamt`}>
     {report.daily.map((day,i)=>{
      const fraction=enabled?day.storyViews/storyDailyMax:0;
      return <div className="rh-adv-story-chart-column" key={day.day} title={`${day.day}: ${enabledValue(enabled,day.storyViews)} Story-Aufrufe`}>
       <div className="rh-adv-story-chart-bartrack"><span style={{height:`${fraction*100}%`}}/></div>
       <small>{i===0||i===report.daily.length-1||i%Math.max(1,Math.ceil(report.daily.length/7))===0?day.label:""}</small>
      </div>;
     })}
    </div>
   </div>
   <p className="rh-ops-muted">Story-Events werden nur nach Einwilligung gezählt. Ein Story-Wechsel kann ein weiteres Ereignis auslösen.</p>
  </section>
  <section className="rh-admin-panel-card rh-ops-stories" aria-labelledby="rh-ops-stories-title">
   <div className="rh-ops-section-head"><div><span>COMMUNITY-STORYS</span><h2 id="rh-ops-stories-title">Welche Story wird angesehen?</h2></div></div>
   <div className="rh-ops-story-grid">
    {report.stories.map((story,i)=><div className="rh-ops-story-item" key={story.path}>
     <img src={story.image} width="54" height="68" alt="" loading="lazy"/>
     <div><strong>{story.name}</strong><small>Story {String(i+1).padStart(2,"0")}</small></div>
     <div className="rh-ops-story-count"><strong>{enabledValue(enabled,story.views)}</strong><small>Aufrufe</small><span className="rh-adv-story-share">{enabled&&report.engagement.storyViews>0?pct(100*story.views/report.engagement.storyViews):"—"}</span></div>
    </div>)}
   </div>
   <p className="rh-ops-muted">Die Storys sind nach Aufrufen sortiert. Prozente beziehen sich auf alle im Zeitraum erfassten Story-Wiedergaben – keine eindeutigen Nutzer.</p>
  </section>
  </section>
  <section className="rh-ops-paid-overview" aria-label="Meta Black Friday Werbeanzeigen">
   <div className="rh-ops-section-head"><div><span>BLACK FRIDAY / META ADS</span><h2>Werbe-Traffic nach Herkunft</h2>
    <p>Nur Seitenansichten nach Zustimmung zur internen Statistik. Keine eindeutigen Besucher und nicht mit den Meta-Klicks gleichzusetzen.</p></div></div>
   <div className="rh-ops-paid-kpis">
    <OverviewCard label="Instagram-Post" icon={<Eye size={18}/>} value={enabledValue(enabled,report.sources.find(x=>x.key==="meta_post")?.count||0)} note="Mit dem Instagram-Post verknüpfte Ansichten"/>
    <OverviewCard label="Elaine Reels" icon={<Eye size={18}/>} value={enabledValue(enabled,report.sources.find(x=>x.key==="meta_reels")?.count||0)} note="Mit der Elaine-Reels-Anzeige verknüpfte Ansichten"/>
    <OverviewCard label="Weitere Meta Ads" icon={<Eye size={18}/>} value={enabledValue(enabled,report.sources.find(x=>x.key==="meta_paid")?.count||0)} note="Meta-Anzeigen ohne eindeutige Creative-Zuordnung"/>
   </div>
  </section>
  <div className="rh-ops-analytics-note"><ShieldCheck size={16}/><span>
   {enabled?"Erfassung aktiv – nur mit Einwilligung.":"Erfassung deaktiviert."}
   {" "}Anonyme Tageswerte, keine Kundenprofile. Aktualisierung spätestens nach ca. 30 Sekunden.
   </span></div>
  <div className="rh-ops-primary">
   <section className="rh-admin-panel-card rh-ops-activity">
    <div className="rh-ops-section-head"><div><span>03 / ENTWICKLUNG</span><h2>Traffic & Nachfrage im Zeitverlauf</h2>
     <p>Wie oft wurden Seiten angesehen und Produkte zum Warenkorb hinzugefügt?</p></div></div>
    {enabled&&report.current.views>0?<AdminAnalyticsTrend daily={report.daily} previousDaily={report.previousDaily}/>:<div className="rh-insight-empty">Noch keine freigegebenen Daten für diesen Zeitraum.</div>}
    <p className="rh-ops-muted">Vorherige {range.days} {range.days===1?"Tag":"Tage"}: {enabledValue(enabled,previous.views)} Seitenaufrufe. Keine eindeutigen Besucher.</p>
   </section>
   <EventFunnel report={report} enabled={enabled}/>
  </div>
  <AdminAnalyticsChannels report={report} enabled={enabled}/>
  <section className="rh-adv-audit" aria-label="Datenqualität und Messmethode">
   <h2>Messqualität & Daten-Grenzen</h2>
   <div className="rh-adv-audit-list">
    <div><b>Werbeanzeigen</b><span>Meta Ads unterscheidet Klicks von Landing-Page-Views. Anzeigenausgaben kommen ausschließlich aus dem Meta Ads Manager, nicht aus internen Klickschätzungen.</span></div>
    <div><b>Web-Traffic</b><span>Nur zugestimmte, anonym aggregierte Ereignisse. Keine Nutzer-IDs, personenbezogenen Pfade, Sessions oder künstliche Absprungrate.</span></div>
    <div><b>Umsatz</b><span>Nur bestätigte, nicht erstattete Captures. Gutschein-Einlösungen und offene/autorisierten Zahlungen zählen nicht als eingenommenes Geld.</span></div>
    <div><b>Vergleich</b><span>Der heutige Tag ist unvollständig. Früher erfasste tägliche Events wurden in UTC zusammengefasst; neue Einträge verwenden Europe/Berlin.</span></div>
   </div>
  </section>
  <p className="rh-ops-privacy-footer"><BarChart3 size={15}/> Neue Ereignisse werden nach Europe/Berlin-Tagen gezählt; ältere Werte wurden nach UTC erfasst. Quellen zählen nur Einwilligungen, keine Meta-Klicks oder eindeutigen Sitzungen. Bezahlter Umsatz wird hier nicht aus anonymen Klicks geschätzt. Bestätigte Zahlungen und Rechnungen findest du unter Bestellungen/Zahlungen. Eine echte, personenbezogene Funnel- oder Conversion-Rate-Analyse findet nicht statt.</p>
 </AdminShell>;
}
