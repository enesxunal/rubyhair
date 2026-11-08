import type {Metadata} from "next";
import {redirect} from "next/navigation";
import {isAdmin} from "@/lib/admin-auth";
import {getPrisma} from "@/lib/prisma";
import AdminShell from "../admin-shell";
export const metadata:Metadata={title:"Statistik | Ruby Hair Verwaltung",robots:{index:false,follow:false}};
export const runtime="nodejs";export const dynamic="force-dynamic";
export default async function AdminAnalytics(){
 if(!await isAdmin())redirect("/admin/login");
 const enabled=process.env.RUBY_ANALYTICS_ENABLED==="APPROVED";
 const since=new Date();since.setUTCHours(0,0,0,0);since.setUTCDate(since.getUTCDate()-27);
 const rows=await getPrisma().analyticsAggregate.findMany({where:{day:{gte:since}},take:1000});
 const count=(event:string)=>rows.filter(r=>r.event===event).reduce((sum,r)=>sum+r.count,0);
 const pageCounts=new Map<string,number>();
 for(const r of rows.filter(r=>r.event==="page_view"))pageCounts.set(r.path,(pageCounts.get(r.path)||0)+r.count);
 const sources=new Map<string,number>();
 for(const r of rows.filter(r=>r.event==="page_view"))sources.set(r.source,(sources.get(r.source)||0)+r.count);
 return <AdminShell current="analytics" title="Besucherstatistik." description="Nur freiwillige, anonym aggregierte Ereignisse der letzten 28 Tage. Keine personenbezogenen Profile oder tatsächlichen Verkäufe.">
   {!enabled&&<p className="rh-admin-warning">Tracking deaktiviert. Keine Analysedaten werden im Vercel-Preview erfasst. Vor Aktivierung Datenschutzhinweis und Einwilligung abnehmen lassen.</p>}
   <div className="rh-admin-kpi-grid">
    {[{label:"Seitenaufrufe",value:count("page_view")},{label:"Zum Warenkorb",value:count("add_to_cart")},
      {label:"Kasse aufgerufen",value:count("begin_checkout")},{label:"Bestätigte Verkäufe",value:"—"}].map(item=><article key={item.label} className="rh-admin-kpi"><div className="rh-admin-kpi-top">{item.label}</div><strong>{item.value}</strong><small>Nur Ereignisse mit Einwilligung</small></article>)}
   </div>
   <div className="rh-admin-overview-columns">
    <section className="rh-admin-panel-card"><h2>Seiten</h2><p className="rh-admin-muted">Aufrufe, keine einzelnen Nutzer</p>
      {[...pageCounts].sort((a,b)=>b[1]-a[1]).map(([path,count])=><div key={path} className="rh-admin-analytics-row"><span>{path}</span><strong>{count}</strong></div>)}
      {!pageCounts.size&&<p className="rh-admin-muted">Noch keine Daten</p>}</section>
    <section className="rh-admin-panel-card"><h2>Quellen</h2><p className="rh-admin-muted">Grobe Quellkategorien ohne Referrer-URL oder Personenbezug</p>
      {[...sources].sort((a,b)=>b[1]-a[1]).map(([source,count])=><div key={source} className="rh-admin-analytics-row"><span>{source}</span><strong>{count}</strong></div>)}
      {!sources.size&&<p className="rh-admin-muted">Noch keine Daten</p>}</section>
   </div>
 </AdminShell>;
}
