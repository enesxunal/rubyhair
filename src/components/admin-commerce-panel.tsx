import {Banknote,ClipboardCheck,PackageCheck,ShoppingBasket,TrendingUp,AlertCircle} from "lucide-react";
import type {CommerceReport} from "@/lib/admin-commerce-report";
const euros=(cents:number)=>new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(cents/100);
const number=(x:number)=>new Intl.NumberFormat("de-DE").format(x);
function Compare({current,previous}:{current:number;previous:number}){
 if(previous===0)return <small className="rh-adv-change">{current?"Im Vergleichszeitraum noch kein Wert":"Keine Veränderung"}</small>;
 const delta=(current-previous)/previous*100;
 return <small className={"rh-adv-change "+(delta>0?"is-positive":delta<0?"is-negative":"")}>{delta>0?"+":""}{delta.toLocaleString("de-DE",{maximumFractionDigits:1})} % zum Vergleichszeitraum</small>;
}
export default function AdminCommercePanel({data}:{data:CommerceReport|null}){
 const max=Math.max(1,...(data?.daily||[]).map(d=>d.orderCents));
 return <section className="rh-adv-commerce" aria-label="Bestätigte Bestellungen und Umsatz">
  <header className="rh-adv-section-title"><div><span>02 / SHOP PERFORMANCE</span><h2>Bestätigte Bestellungen. Bestellumsatz.</h2>
   <p>Klarna-Autorisierungen zählen sofort als Bestellung. Abgebrochene, stornierte und erstattete Bestellungen sowie Testkäufe zählen nicht.</p></div></header>
  {!data?<div className="rh-adv-unavailable" role="alert"><AlertCircle size={18}/> Bestell- und Zahlungsdaten konnten nicht geladen werden. Werte werden nicht als 0 ausgegeben.</div>:<>
   {data.truncated&&<p className="rh-adv-unavailable">Der gewählte Zeitraum enthält zu viele Bestell- oder Zahlungseinträge. Bitte kürzer filtern; die angezeigten Werte sind nicht vollständig.</p>}
   <div className="rh-adv-commerce-kpis">
    <article className="rh-adv-commerce-card is-featured"><span><PackageCheck size={18}/> Bestätigte Bestellungen</span><strong>{number(data.confirmedOrders)}</strong>
     <Compare current={data.confirmedOrders} previous={data.previousConfirmedOrders}/><small>Verifizierte Zahlungsfreigabe oder Zahlungseingang</small></article>
    <article className="rh-adv-commerce-card"><span><Banknote size={18}/> Bestellumsatz</span><strong>{euros(data.orderCents)}</strong>
     <Compare current={data.orderCents} previous={data.previousOrderCents}/><small>Bestellwert inkl. MwSt. und Versand, auch vor Einzug</small></article>
    <article className="rh-adv-commerce-card"><span><TrendingUp size={18}/> Ø Bestellwert</span><strong>{euros(data.avgOrderCents)}</strong>
     <small>Durchschnitt je bestätigter Bestellung</small></article>
    <article className="rh-adv-commerce-card"><span><ShoppingBasket size={18}/> Nicht bestätigte Bestellversuche</span><strong>{number(data.pendingOrders)}</strong>
     <small>Zahlung noch nicht freigegeben; nicht als Bestellung gezählt</small></article>
      </div>
   <div className="rh-adv-two-col">
    <article className="rh-admin-panel-card rh-adv-revenue-card"><div className="rh-adv-mini-head"><div><span>BESTELLVERLAUF</span><h3>Täglicher Bestellumsatz</h3></div><b>{euros(data.orderCents)}</b></div>
     <div className="rh-adv-revenue-scroll"><div className="rh-adv-revenue-chart" role="img" aria-label="Bestätigte tägliche Bestellwerte" style={{minWidth:Math.max(310,data.daily.length*19)}}>
      {data.daily.map((d,i)=><div className="rh-adv-revenue-day" key={d.day} title={`${d.day}: ${euros(d.orderCents)} · ${number(d.confirmedOrders)} bestätigte Bestellungen`}>
       <div className="rh-adv-revenue-track"><span style={{height:(d.orderCents/max*100)+"%"}}/></div>
       <small>{i===0||i===data.daily.length-1||i%Math.max(1,Math.ceil(data.daily.length/6))===0?d.label:""}</small>
      </div>)}
     </div></div>
     <p className="rh-ops-muted">Nach Bestelldatum in Europe/Berlin. Tatsächlicher Zahlungseingang im gewählten Zeitraum: {euros(data.collectedCents)} (separat, nicht zum Bestellumsatz addiert).</p>
    </article>
    <article className="rh-admin-panel-card rh-adv-products-card"><div className="rh-adv-mini-head"><div><span>PRODUKTUMSATZ</span><h3>Verkaufte Extensions</h3></div><b>{number(data.topProducts.reduce((a,r)=>a+r.units,0))} Stk.</b></div>
     {data.topProducts.length?<div className="rh-adv-table-scroll"><table className="rh-adv-table"><thead><tr><th>Artikel</th><th>Menge</th><th>Positionswert</th></tr></thead>
      <tbody>{data.topProducts.map(p=><tr key={p.name}><td>{p.name}</td><td>{number(p.units)}</td><td>{euros(p.lineCents)}</td></tr>)}</tbody></table></div>:
      <p className="rh-adv-empty">Noch keine bestätigten Produktverkäufe in diesem Zeitraum.</p>}
     <p className="rh-ops-muted">Positionswerte sind Warenpreise, nicht identisch mit ausgezahltem Umsatz oder Warenkorb-Margen.</p>
    </article>
   </div>
   <section className="rh-adv-inventory" aria-label="Lager und Varianten"><div><span>BESTAND / AKTIVE VARIANTEN</span><strong>{number(data.stock.verifiedUnits)}</strong><small>Bestätigte verfügbare Einheiten</small></div>
    <div><span>NICHT VORRÄTIG</span><strong>{number(data.stock.outOfStock)}</strong><small>Varianten mit Bestand 0</small></div>
    <div><span>KNAPPER BESTAND</span><strong>{number(data.stock.lowStock)}</strong><small>Varianten mit 1–5 Stück</small></div>
    <div><span>UNGEPRÜFTER BESTAND</span><strong>{number(data.stock.unknownStock)}</strong><small>Bestand unbekannt, nicht ausverkauft</small></div>
   </section>
  </>}
 </section>;
}
