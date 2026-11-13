import type {Metadata} from "next";
import {redirect} from "next/navigation";
import {isAdmin} from "@/lib/admin-auth";
import AdminShell from "../admin-shell";

export const metadata:Metadata={title:"Zahlungen | Ruby Hair Verwaltung",robots:{index:false,follow:false}};
export const runtime="nodejs";export const dynamic="force-dynamic";
// The legacy WooCommerce Store API exposes these IDs, but NOT proof that
// transactions work or that WooCommerce plugin credentials are reusable.
const methods=[
  {name:"WooPayments",ids:"woocommerce_payments",target:"Kartenzahlungen (Visa / Mastercard)",need:"Eigenständiger PSP-Zugang und Webhook-Bestätigung"},
  {name:"Klarna",ids:"woocommerce_payments_klarna · klarna_payments",target:"Klarna",need:"Entscheidung: eine Klarna-Integration, Zugang & Callback"},
  {name:"PayPal",ids:"ppcp-gateway · ppcp-credit-card-gateway",target:"PayPal / PayPal-Kartenzahlung",need:"PayPal Developer Client-ID/Secret und Webhook"},
  {name:"Trustly",ids:"ppcp-trustly",target:"Bankbasierte Zahlung",need:"Im verwendeten Zahlungsanbieter freischalten und testen"},
  {name:"Banküberweisung",ids:"bacs",target:"Vorkasse / Ueberweisung",need:"IBAN, Zahlungshinweis und manuelle Bankbestaetigung"}
] as const;
export default async function PaymentsReadiness(){
  if(!await isAdmin())redirect("/admin/login");
  return <AdminShell current="payments" title="Zahlungen & Integrationen." description="Vorbereitung auf das Kundengespräch. Bestehende WooCommerce-Zahlungsarten werden nicht ungeprueft als aktiv übernommen.">
    <section className="rh-admin-intro-banner"><div><span>PAYMENTS / SICHERER VORBEREITUNGSMODUS</span><h2>Checkout ist noch gesperrt.</h2>
      <p>Es gibt keine aktiven Zahlungsauftraege oder Auszahlungen ueber die neue Website. Aktivierung erst nach Provider-Zugang, Testzahlung, Signaturpruefung, Storno und Refund-Test.</p>
    </div></section>
    <section className="rh-admin-panel-card">
      <div className="rh-admin-card-title"><div><span>BESTEHENDER WOOCOMMERCE STORE API STAND</span><h2>Zahlungsmethoden</h2></div><span>5 Gruppen / 7 Gateway-IDs</span></div>
      <div className="rh-admin-table-wrap"><table className="rh-admin-payment-table">
        <thead><tr><th>System</th><th>Alte Gateway-ID</th><th>Neue Zahlungsart</th><th>Zur Freigabe erforderlich</th><th>Status</th></tr></thead>
        <tbody>{methods.map(m=><tr key={m.name}><td><strong>{m.name}</strong></td><td><code>{m.ids}</code></td><td>{m.target}</td><td>{m.need}</td><td><span className="rh-admin-payment-wait">Nicht angebunden</span></td></tr>)}</tbody>
      </table></div>
      <p className="rh-admin-muted">Die Store API listet Gateways ohne Zahlungsabschluss. WooPayments ist kein direkt uebertragbarer Stripe-Secret-Key. Keine Provider-Zugangsdaten im Git-Repository speichern.</p>
    </section>
    <div className="rh-admin-overview-columns">
      <section className="rh-admin-panel-card"><div className="rh-admin-card-title"><div><span>PROVIDER</span><h2>Kundentermin</h2></div></div>
        <p className="rh-admin-muted">PayPal Developer, WooPayments-Konto, Klarna Merchant Portal, Bankverbindung sowie aktive Zahlarten gemeinsam prüfen. Nur sichere Server-Secrets im Hosting hinterlegen.</p>
      </section>
      <section className="rh-admin-panel-card"><div className="rh-admin-card-title"><div><span>ABNAHME</span><h2>Test-Checkliste</h2></div></div>
        <p className="rh-admin-muted">Checkout, Webhook-Signatur, idempotente Buchung, Abbruch, Fehlzahlung, Refund, Bestell-E-Mail, Lagerreservierung und DHL-Versand vor Echtverkauf prüfen.</p>
      </section>
    </div>
  </AdminShell>;
}
