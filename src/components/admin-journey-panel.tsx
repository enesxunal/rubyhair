import {loadRecentJourneys} from "@/lib/admin-journey";
import {diagnosticLabels} from "@/lib/checkout-diagnostic-policy";
const labels:Record<string,string>={product_view:"Produkt angesehen",add_to_cart:"Zum Warenkorb hinzugefügt",cart_view:"Warenkorb geöffnet",begin_checkout:"Kasse geöffnet",address_ready:"Adresse vollständig",payment_selected:"Zahlungsart gewählt",payment_attempt:"Zahlung gestartet",error:"Browser-Hinweis",server_error:"Server-Fehler",order_created:"Bestellung angelegt"};
const sources:Record<string,string>={direct:"Direkt / unbekannt",search:"Suche",social:"Social Media",referral:"Verweis",meta_paid:"Meta-Anzeige",meta_post:"Instagram Post",meta_reels:"Elaine Reels"};
const time=(d:Date)=>d.toLocaleString("de-DE",{timeZone:"Europe/Berlin",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"});
export default async function AdminJourneyPanel(){
 const sessions=await loadRecentJourneys();
 return <section className="rh-admin-panel-card"><div className="rh-ops-section-head"><div><span>KAUFVERLAUF · 7 TAGE</span><h2>Wo endet der Einkauf?</h2><p>Nur freiwillig erfasste pseudonyme Tab-Sitzungen. Letzte 30 Sitzungen, je bis zu 40 Ereignisse. Keine rückwirkende Zuordnung.</p></div></div>
 {sessions===null?<p>Verlaufsdaten momentan nicht verfügbar.</p>:sessions.length===0?<p>Noch keine neuen Sitzungen mit Einwilligung erfasst.</p>:sessions.map((events,i)=>{
 const last=events[events.length-1];const orderEvents=events.filter(e=>e.orderStatus);const paid=orderEvents.some(e=>e.captured);const authorized=orderEvents.some(e=>e.orderStatus==="payment_authorized");
 const source=events.find(e=>e.source&&sources[e.source]&&e.source!=="direct")?.source||events.find(e=>e.source&&sources[e.source])?.source;
 const state=paid?"Zahlung bestätigt":authorized?"Autorisiert – Einzug offen":orderEvents.length?"Bestellung vorhanden · "+orderEvents[orderEvents.length-1].orderStatus:Date.now()-last.createdAt.getTime()<30*60000?"Noch aktiv / Ausgang offen":"Keine Bestellung beobachtet";
 return <details key={i} style={{padding:"12px 0",borderTop:"1px solid #eadfe4"}}><summary><strong>{time(last.createdAt)} · {state}</strong> · {labels[last.event]||last.event} · {source?sources[source]:"Herkunft unbekannt"}</summary><div className="rh-admin-table-wrap"><table><thead><tr><th>Zeit (Berlin)</th><th>Schritt</th><th>Zahlungsart</th><th>Hinweis</th></tr></thead><tbody>{events.map((e,j)=><tr key={j}><td>{time(e.createdAt)}</td><td>{labels[e.event]||e.event}</td><td>{e.method||"—"}</td><td>{e.code?(diagnosticLabels[e.code]||e.code):e.device||"—"}</td></tr>)}</tbody></table></div></details>
 })}
 <p>Eine ausbleibende Bestellung beweist keinen technischen Fehler. Ohne Einwilligung oder bei verlorenen Ereignissen ist der Verlauf unvollständig.</p></section>
}
