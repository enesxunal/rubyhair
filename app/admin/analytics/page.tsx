import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {isAdmin} from "@/lib/admin-auth";
import {getPrisma} from "@/lib/prisma";
import AdminShell from "../admin-shell";

export const metadata:Metadata={title:"Statistik | Ruby Hair Verwaltung",robots:{index:false,follow:false}};
export const runtime="nodejs";export const dynamic="force-dynamic";
const rangeOptions=[7,28,90] as const;
type Range=typeof rangeOptions[number];

export default async function AdminAnalytics({searchParams}:{searchParams:Promise<{tage?:string}>}){
  if(!await isAdmin())redirect("/admin/login");
  const params=await searchParams;
  const parsed=Number(params.tage);
  const period:Range=rangeOptions.includes(parsed as Range)?parsed as Range:28;
  const enabled=process.env.RUBY_ANALYTICS_ENABLED==="APPROVED";
  const today=new Date();
  const start=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate()-period+1));
  const db=getPrisma();
  const filter={day:{gte:start}};
  const [dayRows,pageRows,sourceRows,deviceRows]=await Promise.all([
    db.analyticsAggregate.groupBy({by:["day","event"],where:filter,_sum:{count:true}}),
    db.analyticsAggregate.groupBy({by:["path"],where:{...filter,event:"page_view"},_sum:{count:true}}),
    db.analyticsAggregate.groupBy({by:["source"],where:{...filter,event:"page_view"},_sum:{count:true}}),
    db.analyticsAggregate.groupBy({by:["device"],where:{...filter,event:"page_view"},_sum:{count:true}})
  ]);
  const count=(event:string)=>dayRows.filter(r=>r.event===event).reduce((sum,r)=>sum+(r._sum.count||0),0);
  const views=count("page_view"),added=count("add_to_cart"),checkouts=count("begin_checkout");
  const fmt=(value:number)=>enabled?value.toLocaleString("de-DE"):"—";
  const eventRatio=(part:number)=>enabled&&views?((part/views)*100).toFixed(1)+"%":"—";
  const days=Array.from({length:period},(_,index)=>{
    const date=new Date(start);date.setUTCDate(start.getUTCDate()+index);
    const views=dayRows.filter(r=>r.event==="page_view"&&r.day.toISOString().slice(0,10)===date.toISOString().slice(0,10))
      .reduce((n,r)=>n+(r._sum.count||0),0);
    return {label:date.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",timeZone:"UTC"}),views};
  });
  const maxView=Math.max(1,...days.map(d=>d.views));
  const ranking=<T extends { _sum:{count:number|null} }>(rows:T[])=>[...rows].sort((a,b)=>(b._sum.count||0)-(a._sum.count||0)).slice(0,8);
  return <AdminShell current="analytics" title="Besucherstatistik." description="Nach Elmas-Triko-Vorbild: Zeitverlauf, Warenkorb-Funnel, Top-Seiten, Quellen und Geräte. Nur anonyme Ereignisse mit Einwilligung.">
    {!enabled&&<p className="rh-admin-warning">Die Statistik-Erfassung ist in dieser Demo deaktiviert. Anzeigen sind keine Umsatzwerte oder Besucherzahlen. Vor Aktivierung Datenschutz und Einwilligung freigeben.</p>}
    <nav className="rh-admin-stock-filters" aria-label="Auswertungszeitraum">
      {rangeOptions.map(n=><Link key={n} href={"/admin/analytics?tage="+n} aria-current={period===n?"page":undefined} className={period===n?"is-active":undefined}>Letzte {n} Tage</Link>)}
    </nav>
    <div className="rh-admin-kpi-grid">
      {[
        {label:"Seitenaufrufe",value:fmt(views),note:"Keine eindeutigen Besucher"},
        {label:"Warenkorb-Ereignisse",value:fmt(added),note:"Keine eindeutigen Bestellungen"},
        {label:"Kassenaufrufe",value:fmt(checkouts),note:"Zahlungen sind deaktiviert"},
        {label:"Bezahlter Umsatz",value:"—",note:"Noch keine verifizierte PSP-Integration"}
      ].map(item=><article key={item.label} className="rh-admin-kpi"><div className="rh-admin-kpi-top">{item.label}</div><strong>{item.value}</strong><small>{item.note}</small></article>)}
    </div>
    <section className="rh-admin-panel-card rh-admin-trend">
      <div className="rh-admin-card-title"><div><span>TRAFFIC / ZEITVERLAUF</span><h2>Seitenaufrufe pro Tag</h2></div><span>UTC-Tage · {period} Tage</span></div>
      {enabled&&views>0?<div className="rh-admin-trend-scroll"><div className="rh-admin-trend-plot" role="img" aria-label={"Seitenaufrufe der letzten "+period+" Tage"} style={{minWidth:Math.max(530,period*16)}}>
        {days.map((d,i)=><div key={i} className="rh-admin-trend-day" title={d.label+": "+d.views+" Aufrufe"}>
          <span className="rh-admin-trend-column"><i style={{height:Math.max(2,d.views/maxView*100)+"%"}}/></span>
          {(period===7||i%Math.ceil(period/7)===0)&&<small>{d.label}</small>}
        </div>)}
      </div></div>:<p className="rh-admin-muted">Noch keine freigegebenen, anonymen Seitenaufrufe für diesen Zeitraum.</p>}
    </section>
    <section className="rh-admin-panel-card">
      <div className="rh-admin-card-title"><div><span>EVENTS / KAUFPFAD</span><h2>Shopping-Funnel</h2></div><span>Ereignisse, keine Sessions</span></div>
      <div className="rh-admin-funnel">
        {[
          {label:"Seitenansicht",value:views},
          {label:"Zum Warenkorb hinzugefügt",value:added},
          {label:"Kasse geöffnet",value:checkouts}
        ].map(item=><div key={item.label}>
          <div className="rh-admin-funnel-label"><span>{item.label}</span><strong>{fmt(item.value)} <small>{eventRatio(item.value)}</small></strong></div>
          <div className="rh-admin-funnel-bar"><span style={{width:enabled&&views?Math.min(100,item.value/views*100)+"%":"0%"}}/></div>
        </div>)}
      </div>
      <p className="rh-admin-muted">Die Zahlen messen einzelne Ereignisse. Ohne Sitzungskennung dürfen sie nicht als eindeutige Conversion-Rate interpretiert werden.</p>
    </section>
    <div className="rh-admin-reports-grid">
      {[
        {title:"Meistgesehene Seiten",desc:"Seitenpfade",items:ranking(pageRows).map(row=>({label:row.path,n:row._sum.count||0}))},
        {title:"Traffic-Quellen",desc:"Grobe Kategorien",items:ranking(sourceRows).map(row=>({label:row.source,n:row._sum.count||0}))},
        {title:"Geräte",desc:"Nur Mobil / Desktop",items:ranking(deviceRows).map(row=>({label:row.device,n:row._sum.count||0}))}
      ].map(table=><section className="rh-admin-panel-card" key={table.title}><div className="rh-admin-card-title"><div><span>{table.desc}</span><h2>{table.title}</h2></div></div>
        {enabled&&table.items.length?table.items.map(row=><div key={row.label} className="rh-admin-analytics-row"><span>{row.label}</span><strong>{fmt(row.n)}</strong></div>):<p className="rh-admin-muted">Keine freigegebenen Daten.</p>}
      </section>)}
    </div>
  </AdminShell>;
}
