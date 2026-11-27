import {loadMetaDelivery} from "@/lib/admin-meta-delivery";
const labels:Record<string,string>={pending:"Wartend / Zahlung oder erneuter Versuch",sending:"Versandstatus unklar",sent:"Von Meta angenommen",failed:"Versand fehlgeschlagen",revoked:"Einwilligung widerrufen",closed:"Nicht versandfähig",expired:"Abgelaufen"};
export default async function AdminMetaDeliveryPanel(){
 const {config,rows,consent}=await loadMetaDelivery();
 return <section className="rh-admin-panel-card" style={{marginTop:22}}><div className="rh-ops-section-head"><div><span>META · CONVERSIONS API</span><h2>Übermittlung bestätigter Käufe</h2><p>Serverseitige Versandaufträge der letzten 7 Tage, keine Meta-Werbeattribution.</p></div></div>
 <p><strong>{config.enabled?"Serverkonfiguration aktiv":"Serverkonfiguration nicht vollständig aktiv"}</strong> · Browserfreigabe: {config.browser?"aktiv":"inaktiv"} · Serverfreigabe: {config.server?"aktiv":"inaktiv"} · Zugangsdaten: {config.token&&config.secret?"vorhanden":"unvollständig"}</p>
 <p>Aktive CAPI-Einwilligungen: {consent===null?"Nicht verfügbar":consent}</p>
 {rows===null?<p role="status">Versanddaten derzeit nicht verfügbar.</p>:rows.length===0?<p>Keine gespeicherten Versandaufträge im Zeitraum. Ohne Einwilligung wird kein Auftrag angelegt.</p>:<div className="rh-admin-table-wrap"><table><thead><tr><th>Status</th><th>Anzahl</th></tr></thead><tbody>{rows.map(r=><tr key={r.status}><td>{labels[r.status]||"Sonstiger Status"}</td><td>{r.count}</td></tr>)}</tbody></table></div>}
 <p className="rh-admin-muted">„Von Meta angenommen“ bedeutet API-Annahme, nicht Zuordnung zu einer Anzeige. Browser-Ereignisse und Funnel-Übermittlungen werden hier nicht als Verkäufe gezählt.</p><a href="https://business.facebook.com/events_manager2/list/dataset/1157620659939392/overview?act=1672571907574765" target="_blank" rel="noopener noreferrer">Meta Events Manager öffnen ↗</a></section>
}
