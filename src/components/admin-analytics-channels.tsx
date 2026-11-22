import {BarChart3,Smartphone,MousePointer2,Activity} from "lucide-react";
import type {AnalyticsReport} from "@/lib/admin-analytics-report";
import {analyticsPathLabel,analyticsDeviceLabels,analyticsSourceLabels} from "@/lib/admin-analytics-report";
const number=(n:number)=>new Intl.NumberFormat("de-DE").format(n);
const pct=(n:number,d:number)=>d?new Intl.NumberFormat("de-DE",{maximumFractionDigits:1}).format(n/d*100)+" %":"—";
export default function AdminAnalyticsChannels({report,enabled}:{report:AnalyticsReport;enabled:boolean}){
 const total=report.current.views;
 const top=report.pages.filter(p=>p.views||p.cartActions).slice(0,12);
 return <section className="rh-adv-channels" aria-label="Verkehrsquellen und Seitenauswertung">
  <header className="rh-adv-section-title"><div><span>04 / TRAFFIC INTELLIGENCE</span><h2>Kanäle, Geräte & beliebte Seiten</h2>
   <p>Aufschlüsselung der freigegebenen Ereignisse. Warenkorb- und Kassenaktionen sind keine nachverfolgten Sitzungen.</p></div></header>
  <div className="rh-adv-two-col">
   <article className="rh-admin-panel-card"><div className="rh-adv-mini-head"><div><span><MousePointer2 size={13}/> KANALANALYSE</span><h3>Woher kommen die Aufrufe?</h3></div><b>{enabled?number(total):"—"}</b></div>
    <div className="rh-adv-table-scroll"><table className="rh-adv-table"><thead><tr><th>Quelle</th><th>Seitenaufrufe</th><th>Warenkorb</th><th>Kasse</th></tr></thead><tbody>
     {enabled&&report.channels.length?report.channels.map(c=><tr key={c.key}><td><strong>{analyticsSourceLabels[c.key]||c.key}</strong><div className="rh-adv-meter"><span style={{width:pct(c.views,total)}}/></div></td><td>{number(c.views)}<small>{pct(c.views,total)}</small></td><td>{number(c.added)}</td><td>{number(c.checkouts)}</td></tr>):
      <tr><td colSpan={4} className="rh-adv-empty">Noch keine zustimmungsbasierten Kanaldaten.</td></tr>}
     </tbody></table></div>
   </article>
   <article className="rh-admin-panel-card"><div className="rh-adv-mini-head"><div><span><Smartphone size={13}/> GERÄTE</span><h3>Mobil oder Desktop?</h3></div><b>{enabled?number(total):"—"}</b></div>
    <div className="rh-adv-device-list">{enabled&&report.deviceMetrics.length?report.deviceMetrics.map(d=><div className="rh-adv-device" key={d.key}>
     <div><b>{analyticsDeviceLabels[d.key]||d.key}</b><strong>{number(d.views)} <small>{pct(d.views,total)}</small></strong></div>
     <div className="rh-adv-meter"><span style={{width:pct(d.views,total)}}/></div>
     <small>{number(d.added)} Warenkorb-Aktionen · {number(d.checkouts)} Kassenaufrufe</small>
    </div>):<p className="rh-adv-empty">Noch keine Gerätedaten.</p>}</div>
    <p className="rh-ops-muted">Erkannt anhand der Bildschirmbreite. Tablets werden der größeren Kategorie zugeordnet.</p>
   </article>
  </div>
  <article className="rh-admin-panel-card rh-adv-page-report"><div className="rh-adv-mini-head"><div><span><BarChart3 size={13}/> CONTENT PERFORMANCE</span><h3>Welche Shop-Seiten werden wirklich aufgerufen?</h3></div><b>{enabled?number(top.reduce((a,p)=>a+p.views,0)):"—"}</b></div>
   <div className="rh-adv-table-scroll"><table className="rh-adv-table"><thead><tr><th>Seite</th><th>Aufrufe</th><th>Anteil</th><th>Warenkorb-Aktionen</th></tr></thead><tbody>
    {enabled&&top.length?top.map(page=><tr key={page.path}><td><strong>{analyticsPathLabel(page.path)}</strong><small>{page.path}</small></td><td>{number(page.views)}</td><td><div className="rh-adv-meter"><span style={{width:pct(page.views,total)}}/></div><small>{pct(page.views,total)}</small></td><td>{number(page.cartActions)}</td></tr>):
     <tr><td className="rh-adv-empty" colSpan={4}>Keine erfassten Seitenaufrufe im ausgewählten Zeitraum.</td></tr>}
   </tbody></table></div>
  </article>
  <article className="rh-adv-measurement"><Activity size={18}/><div><strong>Was diese Zahlen nicht behaupten</strong><p>Kein eindeutiger Besucher, keine Sitzungsdauer, keine personenbezogene Customer Journey. Tracking erfolgt nur nach Einwilligung. Meta-Anzeigenklicks und Website-Seitenaufrufe sind verschiedene Messgrößen.</p></div></article>
 </section>;
}
