import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {isAdmin} from "@/lib/admin-auth";
import {getPrisma} from "@/lib/prisma";
import {getDhlIntegrationReadiness} from "@/lib/dhl-api";
import {verifyDhlCredentialsAction,validateDhlTemplateAction} from "./actions";
import AdminShell from "../admin-shell";

export const metadata:Metadata={title:"DHL Versandstatus | Ruby Hair",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
const labels:Record<string,string>={clientId:"DHL API Client ID",clientSecret:"DHL API Client Secret",username:"Geschäftskundenportal-Benutzer",password:"Geschäftskundenportal-Passwort",accountNumber:"EKP / 10-stellige Kundennummer",billingNumber:"14-stellige Abrechnungsnummer (01 + Teilnahme)"};
const statuses:Record<string,string>={authenticated:"DHL hat die Live-Zugangsdaten akzeptiert. Es wurde kein Versandschein erstellt.",unauthorized:"DHL hat die Live-Zugangsdaten nicht akzeptiert. API-Freigabe und GKP-Benutzerrechte prüfen.",unavailable:"DHL konnte derzeit nicht sicher erreicht werden; bitte erneut testen.",credentials_missing:"Noch nicht alle sechs DHL-API-Zugangsdaten gespeichert."};

export default async function DhlStatus({searchParams}:{searchParams:Promise<{status?:string;validation?:string}>}){
 if(!await isAdmin())redirect("/admin/login");
 const params=await searchParams;
 const [readiness,order]=await Promise.all([
  getDhlIntegrationReadiness("live"),
  getPrisma().order.findFirst({where:{testOnly:false,orderNumber:BigInt(5)},select:{status:true,totalCents:true,trackingNumber:true,shippingJob:{select:{status:true,trackingNumber:true}},invoice:{select:{invoiceNumber:true}}}})
 ]);
 const liveEnabled=process.env.RUBY_DHL_LIVE_LABELS_ENABLED==="true";
 const weightGrams=Number(process.env.RUBY_DHL_WEIGHT_G||"0");
 const weightReady=Number.isSafeInteger(weightGrams)&&weightGrams>0&&weightGrams<=31500;
 const senderApproved=process.env.RUBY_DHL_SENDER_APPROVED==="true";
 return <AdminShell current="orders" title="DHL Versand verbinden" description="DHL Paket DE Versenden v2. Geschützte Zugangsdaten, lesbarer Bereitschaftsstatus und Live-Authentifizierung ohne Versandlabel oder Zahlung.">
  {params.validation&&["valid","rejected","unavailable"].includes(params.validation)&&
    <p role="status" className={params.validation==="valid"?"rh-admin-success":"rh-admin-warning"}>{
      params.validation==="valid"?"DHL hat die 500-g-Testsendung erfolgreich validiert. Es wurde kein Label gekauft.":
      params.validation==="rejected"?"DHL hat die Testsendung abgelehnt. Absenderadresse, Abrechnungsnummer und DHL-Vertragsprodukt kontrollieren.":
      "Die DHL-Validierung war nicht verfügbar. Es wurde kein Label erstellt."}</p>}
  {params.status&&statuses[params.status]&&<p role="status" className={params.status==="authenticated"?"rh-admin-success":"rh-admin-warning"}>{statuses[params.status]}</p>}
  <section className="rh-admin-panel-card" style={{padding:24}}>
   <h2>DHL Live-Voraussetzungen</h2>
   <p>Nur im geschützten Ruby Hair Admin. API-Schlüssel und Passwörter werden nicht angezeigt oder im Browser entschlüsselt.</p>
   <p><strong>Zugangsdaten:</strong> {readiness.credentialsComplete?"6/6 gespeichert":"Nicht vollständig"}</p>
   <ul>{Object.keys(labels).map(field=><li key={field}>{labels[field]} — {readiness.missing.includes(field as typeof readiness.missing[number])?"Fehlt":"Gespeichert"}</li>)}</ul>
   <p><strong>Standard-Paketgewicht:</strong> {weightReady?weightGrams+" g (Schätzwert; vor Abgabe tatsächliches Gewicht prüfen)":"Fehlt"}</p>
   <p><strong>Absenderadresse geprüft:</strong> {senderApproved?"Freigegeben":"Nicht freigegeben"}</p>
   <p><strong>Automatische Live-Etiketten:</strong> {liveEnabled?"Freigabeschalter gesetzt":"Deaktiviert"}</p>
   <p><strong>Automatisierungsbeginn:</strong> {process.env.RUBY_DHL_AUTOMATION_START_AT||"Noch nicht festgelegt"} (bestehende Bestellungen werden nicht nachträglich gebucht)</p>
   <p><Link href="/admin/zahlungen">Fehlende Daten sicher unter Zahlungen / DHL eintragen</Link></p>
   <form action={verifyDhlCredentialsAction}><button type="submit" className="rh-admin-mail-test-button" disabled={!readiness.credentialsComplete}>DHL Live-Zugang prüfen – keine Sendung erstellen</button></form>
   <form action={validateDhlTemplateAction}><button type="submit" className="rh-admin-mail-test-button" disabled={!readiness.credentialsComplete||!weightReady}>DHL 500-g-Sendung validieren – kein Label kaufen</button></form>
   <form action="/api/admin/dhl-test-label" method="post" target="_blank">
    <button type="submit" className="rh-admin-mail-test-button" disabled={!readiness.credentialsComplete}>Sandbox-Testetikett als PDF erstellen (ohne Gebühr)</button>
   </form>
   <p>Dieser Test verwendet ausschließlich DHL-Sandbox-Musterdaten und eine fiktive Abrechnungsnummer. Er erzeugt weder eine echte Sendung noch eine Kundenbenachrichtigung.</p>
   <p>Vorgesehener Absender laut Ruby Hair Impressum: Ruby Hair, Klara Strasse 19, 45130 Essen. Vor Live-Aktivierung muss die tatsächliche Versand-/Retourenadresse bestätigt sein.</p>
   <p style={{fontSize:13}}>DHL Developer Portal: <a href="https://developer.dhl.com/" target="_blank" rel="noopener noreferrer">API App anlegen / Zugriffe prüfen</a>. Geschäftskundenportal: <a href="https://geschaeftskunden.dhl.de/" target="_blank" rel="noopener noreferrer">Vertragsdaten und Abrechnungsnummer prüfen</a>.</p>
  </section>
  <section className="rh-admin-panel-card" style={{padding:24,marginTop:20}}>
   <h2>Bestellung RH-5</h2>
   <p><strong>Bezahlstatus:</strong> {order?.status||"Nicht gefunden"}</p>
   <p><strong>Rechnung:</strong> {order?.invoice?.invoiceNumber||"Nicht vorhanden"}</p>
   <p><strong>DHL-Verarbeitungsstatus:</strong> {order?.shippingJob?.status||"Noch nicht vorbereitet"}</p>
   <p><strong>Sendungsnummer:</strong> {order?.trackingNumber||"Noch nicht vergeben"}</p>
   <p className="rh-admin-warning">Kein DHL-Etikett wurde über diese Seite erzeugt. Ohne vollständigen und authentifizierten DHL-Zugang keine automatische Live-Buchung. Eine manuelle Sendung darf erst nach tatsächlicher Paketübergabe als versendet bestätigt werden.</p>
   <p><Link href="/admin/bestellungen">Bei bestehendem DHL-Versandschein: Sendungsnummer und reale Übergabe in der Bestellung bestätigen</Link></p>
  </section>
 </AdminShell>;
}
