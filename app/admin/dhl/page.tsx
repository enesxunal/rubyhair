import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {ChevronDown, CircleAlert, CircleCheck, PackageCheck, ShieldCheck} from "lucide-react";
import {isAdmin} from "@/lib/admin-auth";
import {getPrisma} from "@/lib/prisma";
import {getDhlIntegrationReadiness} from "@/lib/dhl-api";
import {verifyDhlCredentialsAction,validateDhlTemplateAction} from "./actions";
import AdminShell from "../admin-shell";

export const metadata:Metadata={title:"DHL Versandstatus | Ruby Hair",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
const labels:Record<string,string>={clientId:"API Client ID",clientSecret:"API Client Secret",username:"DHL Systembenutzer",password:"Systembenutzer-Passwort",accountNumber:"EKP / Kundennummer",billingNumber:"Abrechnungsnummer"};
const loginStatuses:Record<string,string>={
 authenticated:"Die Anmeldung bei DHL hat funktioniert. Ob die Versand-API freigegeben ist, wird separat geprüft.",
 unauthorized:"DHL hat die Anmeldedaten abgelehnt. Bitte Benutzerrechte und Zugangsdaten prüfen.",
 unavailable:"Der DHL-Anmeldeserver konnte nicht zuverlässig erreicht werden. Versuche es erneut.",
 credentials_missing:"Es sind noch nicht alle sechs Zugangsdaten gespeichert."
};
const validationStatuses:Record<string,string>={
 valid:"Die DHL Versand-API hat die 500-g-Testvorlage akzeptiert. Es wurde kein Etikett gekauft.",
 unauthorized:"DHL erlaubt derzeit keinen Zugriff auf die Versand-API (HTTP 401/403). Bitte die Freigabe für Parcel DE Shipping v2 prüfen.",
 rejected:"DHL hat die Versanddaten abgelehnt. Vertragsprodukt, Abrechnungsnummer und Absenderadresse prüfen.",
 unavailable:"Der Versand-API-Test konnte nicht abgeschlossen werden. Es wurde nichts gebucht."
};
const sandboxStatuses:Record<string,string>={
 unauthorized:"Das Sandbox-Etikett konnte nicht erstellt werden: DHL hat den Versandzugriff abgelehnt (HTTP 401/403). Keine Sendung und keine Gebühr.",
 missing:"Sandbox-Test konnte nicht starten: Zugangsdaten fehlen. Keine Sendung und keine Gebühr.",
 failed:"Der Sandbox-Test konnte nicht abgeschlossen werden. Es wurde kein echtes Etikett gebucht und nichts berechnet."
};

export default async function DhlStatus({searchParams}:{searchParams:Promise<{status?:string;validation?:string;sandbox?:string}>}){
 if(!await isAdmin())redirect("/admin/login");
 const params=await searchParams;
 const [readiness,order]=await Promise.all([
  getDhlIntegrationReadiness("live"),
  getPrisma().order.findFirst({where:{testOnly:false,invoice:{isNot:null}},orderBy:{createdAt:"desc"},select:{orderNumber:true,status:true,totalCents:true,trackingNumber:true,shippingJob:{select:{status:true,trackingNumber:true,labelPdf:true}},invoice:{select:{invoiceNumber:true}}}})
 ]);
 const liveEnabled=process.env.RUBY_DHL_LIVE_LABELS_ENABLED==="true";
 const weightGrams=Number(process.env.RUBY_DHL_WEIGHT_G||"0");
 const weightReady=Number.isSafeInteger(weightGrams)&&weightGrams>0&&weightGrams<=31500;
 const senderApproved=process.env.RUBY_DHL_SENDER_APPROVED==="true";
 const validated=params.validation==="valid";
 const validationText=params.validation?validationStatuses[params.validation]:undefined;
 const loginText=params.status?loginStatuses[params.status]:undefined;
 const sandboxText=params.sandbox?sandboxStatuses[params.sandbox]:undefined;
 return <AdminShell current="orders" title="DHL Versand" description="Verbindung prüfen, Versandstatus sehen und Testfunktionen nur bei Bedarf öffnen.">
  <section className="rh-admin-panel-card rh-dhl-overview">
   <div className="rh-dhl-topline">
    <div><span className="rh-dhl-eyebrow">RUBY HAIR / DHL PAKET</span><h2>Versandverbindung</h2><p>Hier prüfst du die DHL-Anbindung, bevor eine echte Versandmarke erstellt wird.</p></div>
    <span className={liveEnabled?"rh-dhl-pill is-ready":"rh-dhl-pill is-pending"}>{liveEnabled?"Automatik aktiviert":"Automatik pausiert"}</span>
   </div>
   <div className="rh-dhl-steps" aria-label="DHL Einrichtungsstatus">
    <div className="rh-dhl-step"><span className="rh-dhl-step-icon">{readiness.credentialsComplete?<CircleCheck size={19}/>:<CircleAlert size={19}/>}</span><div><strong>1. Zugangsdaten</strong><p>{readiness.credentialsComplete?"6 von 6 sicher gespeichert":"Noch nicht vollständig"}</p></div></div>
    <div className="rh-dhl-step"><span className="rh-dhl-step-icon">{validated?<CircleCheck size={19}/>:<CircleAlert size={19}/>}</span><div><strong>2. Versandfreigabe</strong><p>{validated?"Zuletzt erfolgreich geprüft":"Noch nicht bestätigt – Prüfung erforderlich"}</p></div></div>
    <div className="rh-dhl-step"><span className="rh-dhl-step-icon">{liveEnabled?<PackageCheck size={19}/>:<ShieldCheck size={19}/>}</span><div><strong>3. Live-Etiketten</strong><p>{liveEnabled?"Automatik-Schalter aktiviert":"Keine automatische Buchung"}</p></div></div>
   </div>
   {validationText&&<p role="status" className={validated?"rh-admin-success":"rh-admin-warning"}>{validationText}</p>}
   {loginText&&<p role="status" className={params.status==="authenticated"?"rh-admin-success":"rh-admin-warning"}>{loginText}</p>}
   {sandboxText&&<p role="status" className="rh-admin-warning">{sandboxText}</p>}
   <div className="rh-dhl-main-action">
    <form action={validateDhlTemplateAction}><button type="submit" className="rh-dhl-primary-btn" disabled={!readiness.credentialsComplete||!weightReady}>DHL-Versand prüfen</button></form>
    <p>Kostenloser Verbindungstest. Kein Versandlabel und keine Abbuchung.</p>
   </div>
   <nav className="rh-dhl-links" aria-label="DHL Weitere Aktionen"><Link href="/admin/zahlungen">Zugangsdaten bearbeiten</Link><Link href="/admin/bestellungen">Bestellungen öffnen</Link></nav>
  </section>

  <section className="rh-admin-panel-card rh-dhl-order-card">
   <div className="rh-dhl-order-heading"><h2>Letzte bezahlte Bestellung {order?`RH-${order.orderNumber}`:""}</h2><Link href="/admin/bestellungen">Alle Bestellungen ansehen</Link></div>
   {order?<div className="rh-dhl-order-facts">
    <div><span>Bestellstatus</span><strong>{order.status==="preparing"?"In Vorbereitung":order.status==="shipped"?"Als versendet markiert":order.status==="payment_confirmed"?"Bezahlt":order.status}</strong></div>
    <div><span>DHL-Bearbeitung</span><strong>{order.shippingJob?.status==="needs_review"?"Prüfung erforderlich":order.shippingJob?.status==="waiting_credentials"?"Wartet auf Freigabe":order.shippingJob?.status||"Nicht vorbereitet"}</strong></div>
    <div><span>DHL-Versandetikett</span><strong>{order.shippingJob?.labelPdf?"PDF vorhanden":"Noch nicht erstellt"}</strong></div>
    <div><span>Sendungsnummer</span><strong>{order.trackingNumber||"Noch nicht vergeben"}</strong></div>
   </div>:<p className="rh-dhl-muted">Noch keine bezahlte Bestellung vorhanden.</p>}
   <p className="rh-dhl-footnote">Ein Etikett oder eine Sendungsnummer bedeutet nicht, dass das Paket schon bei DHL abgegeben wurde. Den Versand erst nach der tatsächlichen Übergabe bestätigen.</p>
  </section>

  <details className="rh-admin-panel-card rh-dhl-advanced">
   <summary>Erweiterte Tests und technische Details <ChevronDown size={18} aria-hidden="true"/></summary>
   <div className="rh-dhl-advanced-body">
    <div className="rh-dhl-test-item"><div><strong>Nur DHL-Anmeldung testen</strong><p>Prüft Benutzername und Passwort. Eine erfolgreiche Anmeldung bestätigt noch keine Versandfreigabe.</p></div><form action={verifyDhlCredentialsAction}><button type="submit" className="rh-dhl-secondary-btn" disabled={!readiness.credentialsComplete}>Login testen</button></form></div>
    <div className="rh-dhl-test-item"><div><strong>Kostenloses Testetikett (Sandbox)</strong><p>Verwendet ausschließlich Testadressen, ohne Kundenauftrag. Die DHL-Sandbox kann den Test bei fehlender API-Freigabe ablehnen.</p></div><form action="/api/admin/dhl-test-label" method="post" target="_blank"><button type="submit" className="rh-dhl-secondary-btn" disabled={!readiness.credentialsComplete}>Test-PDF erstellen</button></form></div>
    <details className="rh-dhl-technical"><summary>Gespeicherte Einstellungen anzeigen <ChevronDown size={16}/></summary>
     <div className="rh-dhl-tech-grid"><div><strong>API-Zugang</strong><ul>{Object.keys(labels).map(field=><li key={field}>{labels[field]}: {readiness.missing.includes(field as typeof readiness.missing[number])?"Fehlt":"Gespeichert"}</li>)}</ul></div>
      <div><strong>Sendungsvorlage</strong><p>Standardgewicht: {weightReady?weightGrams+" g (Schätzwert)":"Fehlt"}</p><p>Absender-Schalter: {senderApproved?"Freigegeben":"Nicht freigegeben"}</p><p>Automatikbeginn: {process.env.RUBY_DHL_AUTOMATION_START_AT||"Nicht festgelegt"}</p></div></div>
     <p>Vorgesehener Absender: Ruby Hair, Klara Strasse 19, 45130 Essen. Tatsächliche Versand- und Retourenadresse vor realem Etikett bestätigen. API-Zugangsdaten bleiben verschlüsselt.</p>
     <p><a href="https://developer.dhl.com/" target="_blank" rel="noopener noreferrer">DHL Developer Portal</a> · <a href="https://geschaeftskunden.dhl.de/" target="_blank" rel="noopener noreferrer">Geschäftskundenportal</a></p>
    </details>
   </div>
  </details>
 </AdminShell>;
}
