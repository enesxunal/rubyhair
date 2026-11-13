import type {DailyCounts} from "@/lib/admin-analytics-report";

/**
 * Server-rendered grouped columns avoid third-party chart hydration and keep
 * every data point accessible via the built-in title/figure description.
 */
export default function AdminActivityChart({daily}:{daily:DailyCounts[]}){
 const max=Math.max(1,...daily.map(d=>Math.max(d.views,d.added)));
 const step=Math.max(1,Math.ceil(daily.length/7));
 const width=Math.max(470,daily.length*21);
 return <figure className="rh-admin-chart-figure" aria-label="Tägliche Seitenaufrufe und Warenkorb-Aktionen">
  <div className="rh-admin-chart-y" aria-hidden="true">
   <span>{max}</span><span>{Math.round(max*.75)}</span><span>{Math.round(max*.5)}</span><span>{Math.round(max*.25)}</span><span>0</span>
  </div>
  <div className="rh-admin-chart-bars-scroll">
   <div className="rh-admin-chart-bars" style={{minWidth:width}}>
    {daily.map((d,i)=><div key={d.day} className="rh-admin-chart-bar-day"
      title={d.label+": "+d.views+" Seitenaufrufe, "+d.added+" Warenkorb-Aktionen"}>
      <div className="rh-admin-chart-bar-pair">
       <span className="rh-admin-chart-bar-views" style={{height:(d.views/max*100)+"%"}}/>
       <span className="rh-admin-chart-bar-carts" style={{height:(d.added/max*100)+"%"}}/>
      </div>
      <small>{(i%step===0||i===daily.length-1)?d.label:""}</small>
    </div>)}
   </div>
  </div>
  <figcaption className="rh-admin-chart-caption">Tagesereignisse in UTC. Die Säulen zeigen Ereigniszahlen, nicht individuelle Besucher oder Bestellungen.</figcaption>
 </figure>;
}
