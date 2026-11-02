import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import {ExternalLink} from "lucide-react";
import ShopLayout from "@/components/site-shell";
import {legacyStore as old} from "@/lib/legacy-store-facts";

const pages:Record<string,{title:string;source:string}>={
 impressum:{title:"Impressum",source:old.urls.imprint},
 datenschutz:{title:"Datenschutzerklärung",source:old.urls.privacy},
 agb:{title:"Allgemeine Geschäftsbedingungen",source:old.urls.terms},
 widerruf:{title:"Widerruf & Rückgabe",source:old.urls.cancellation}
};
export function generateStaticParams(){return Object.keys(pages).map(slug=>({slug}));}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
 return {title:pages[(await params).slug]?.title||"Rechtliche Informationen",robots:{index:false,follow:false}};
}
function Source({href}:{href:string}){return <a className="rh-legal-source" href={href} target="_blank" rel="noopener noreferrer">QUELLE: BISHERIGER SHOP AUF RUBYHAIR.DE <ExternalLink size={15}/></a>;}
function Section({title,children}:{title:string;children:React.ReactNode}){return <section className="rh-legal-section"><h2>{title}</h2>{children}</section>;}
function Notice(){return <p className="rh-legal-caution">Diese Angaben beschreiben den bisherigen Ruby Hair Shop. Das neue Shopsystem ist eine Vorschau ohne Bestell- oder Zahlungsfunktion. Noch offene rechtliche Punkte werden vor dem Verkaufsstart abgestimmt.</p>;}
function LegalContent({slug}:{slug:string}){
 if(slug==="impressum")return <>
  <Section title="Anbieterangaben">
   <p><strong>{old.business}</strong><br/>Inhaber: Herr {old.owner}<br/>{old.street}<br/>{old.postalCity}<br/>Deutschland</p>
   <p>E-Mail: <a href={"mailto:"+old.email}>{old.email}</a></p>
   <p>Umsatzsteuer-Identifikationsnummer: <strong>{old.vatId}</strong></p>
   <p>Die bisherigen AGB nennen das Amtsgericht Essen als Registergericht, ohne eine Registernummer anzugeben.</p>
  </Section>
  <Section title="Verbraucherstreitbeilegung">
   <p>Ruby Hair erklärt im bisherigen Impressum, weder zur Teilnahme an einer Verbraucherschlichtung verpflichtet noch hierzu bereit zu sein.</p>
   <p>Der dortige Link zur geschlossenen EU-Online-Streitbeilegungsplattform wird nicht als aktiver Dienst übernommen.</p>
  </Section><Notice/>
 </>;
 if(slug==="agb")return <>
  <Section title="1. Geltungsbereich"><p>Die bisherigen AGB gelten für Lieferungen von Ruby Hair an Verbraucher. Verbraucher kaufen überwiegend zu privaten Zwecken und nicht im Rahmen einer gewerblichen oder selbstständigen Tätigkeit.</p></Section>
  <Section title="2. Vertragspartner"><p>Ruby Hair, Inhaber {old.owner}, {old.street}, {old.postalCity}. Das alte Dokument nennt außerdem das Amtsgericht Essen als Registergericht.</p></Section>
  <Section title="3. Vertragsschluss"><p>Die bisherige Produktdarstellung dient der Einladung zur Bestellung. Nach dem alten Ablauf erklärt der Kunde mit einem ausdrücklich kostenpflichtigen Bestellbutton seine verbindliche Bestellung; der Vertrag wird mit der Auftragsbestätigung per E-Mail geschlossen.</p><p>Die neue Vorschau erlaubt derzeit keine Bestellung.</p></Section>
  <Section title="4. Widerrufsrecht"><p>Die bisherigen Bedingungen nennen für Verbraucher eine Widerrufsfrist von 14 Tagen ab Warenempfang. Die Erklärung kann gegenüber {old.owner} an der Geschäftsadresse oder per <a href={"mailto:"+old.email}>{old.email}</a> erfolgen.</p><p>Nach dem alten AGB-Text trägt der Käufer die unmittelbaren Rücksendekosten. Der alte AGB-Abschnitt nimmt die ursprünglichen Lieferkosten von der Erstattung aus; die separate Widerrufsbelehrung enthält hierzu eine andere Regelung.</p><p><Link href="/rechtliches/widerruf/">Widerrufsangaben des bisherigen Shops ansehen →</Link></p></Section>
  <Section title="5. Preise und Versandkosten"><p>Der bisherige Shop gibt Produktpreise einschließlich gesetzlicher Mehrwertsteuer an. Für den Versand innerhalb Deutschlands wird eine Pauschale von <strong>4,99 € je Bestellung</strong> genannt. Nachnahme ist nach den bisherigen Bedingungen nicht möglich.</p></Section>
  <Section title="6. Lieferung"><p>Die bisherigen AGB nennen den Versand innerhalb Deutschlands mit <strong>DHL</strong> und eine Lieferzeit von bis zu <strong>5 Werktagen</strong>. Für Lieferungen ins Ausland machen sie keinen verlässlichen Lieferzeitzusatz.</p></Section>
  <Section title="7. Zahlung"><p>Als bisherige Zahlungsarten sind direkte Banküberweisung, PayPal, VISA und Mastercard angegeben. Bei Vorauszahlung erfolgt die Warenlieferung nach Eingang der Überweisung. Die alte Startseite nennt daneben Klarna und SEPA.</p><p>Für die neue Vorschau sind noch keine Zahlungsanbieter freigeschaltet.</p></Section>
  <Section title="8. Eigentumsvorbehalt"><p>Nach den bisherigen Bedingungen bleibt die Ware bis zur vollständigen Bezahlung Eigentum von Ruby Hair.</p></Section>
  <Section title="9. Streitbeilegung"><p>Ruby Hair erklärt, nicht zur Teilnahme an einem Verfahren vor einer Verbraucherschlichtungsstelle verpflichtet oder bereit zu sein. Die nicht mehr betriebene EU-Online-Streitbeilegungsplattform wird nicht als aktiver Kontaktweg verwendet.</p></Section>
  <Notice/><Link className="rh-legal-internal" href="/versand-zahlung/">Versand & Zahlung ansehen →</Link>
 </>;
 if(slug==="widerruf")return <>
  <Section title="Widerrufsrecht und Frist">
   <p>Nach der eigenständigen bisherigen Widerrufsbelehrung steht Verbrauchern eine <strong>14-tägige Frist</strong> ohne Angabe von Gründen zu. Sie beginnt grundsätzlich mit dem Empfang der Ware durch den Käufer oder einen benannten Dritten.</p>
   <p>Eine eindeutige Erklärung kann an {old.owner}, {old.street}, {old.postalCity}, oder per E-Mail an <a href={"mailto:"+old.email}>{old.email}</a> gerichtet werden. Die Mitteilung muss innerhalb der Frist abgesendet werden.</p>
  </Section>
  <Section title="Erstattung und Rücksendung">
   <p>Die eigenständige alte Belehrung sieht die Rückzahlung der Zahlungen einschließlich der Kosten der günstigsten Standardlieferung vor. Zusätzliche Kosten einer teureren Versandart sind ausgenommen. Erstattungen sollen über das ursprüngliche Zahlungsmittel erfolgen.</p>
   <p>Der Händler kann die Rückzahlung bis zum Eintreffen der Ware oder zum Nachweis ihrer Rücksendung zurückhalten. Die Ware ist nach der bisherigen Regelung innerhalb von 14 Tagen nach Erklärung zurückzusenden. Die unmittelbaren Rücksendekosten trägt der Käufer.</p>
   <p>Ein Wertverlust ist nur zu ersetzen, wenn er auf einen Umgang mit der Ware zurückgeht, der zur Prüfung von Eigenschaften und Funktion nicht nötig war.</p>
  </Section>
  <Section title="Rücksendekontakt"><p>Ruby Hair, {old.owner}<br/>{old.street}<br/>{old.postalCity}<br/>E-Mail: <a href={"mailto:"+old.email}>{old.email}</a></p><p>Die bisherige Website enthält noch unvollständige Felder für eine Telefonnummer und einen möglichen abweichenden Rücksendeempfänger. Bis zur Klärung wird keine weitere Adresse behauptet.</p></Section>
  <Section title="Elektronische Widerrufsfunktion"><p>Seit dem 19. Juni 2026 verlangt § 356a BGB für erfasste Online-Verbraucherverträge eine elektronische Widerrufsfunktion mit Bestätigung in zwei Schritten und unverzüglicher elektronischer Eingangsbestätigung. Diese wird vor dem Verkaufsstart des neuen Shops umgesetzt.</p></Section>
  <Notice/>
 </>;
 return <>
  <Section title="Verantwortliche Stelle"><p>Die bisherige Datenschutzerklärung nennt <strong>Zweigertstraße 8, 45130 Essen</strong> als Adresse der verantwortlichen Stelle; im Impressum steht dagegen {old.street}, {old.postalCity}. Für die neue Datenschutzfassung wird die richtige Anschrift überprüft.</p><p>E-Mail: <a href={"mailto:"+old.email}>{old.email}</a></p></Section>
  <Section title="Datenschutz im bisherigen Shop"><p>Die bisherige WordPress-Datenschutzerklärung beschreibt Serverprotokolle, Cookies, Einwilligungsverwaltung, Kontaktanfragen, Aufbewahrung, verschlüsselte Datenübertragung, Versand- und Zahlungsabwicklung.</p><p>Darin werden Usercentrics, Cookie Notice & Compliance, Complianz und mehrere Zahlungsdienstleister beschrieben. Diese historischen Angaben sind nicht automatisch auf die neue Plattform übertragbar.</p></Section>
  <Section title="Neue Next.js-Vorschau"><p>In der aktuellen Vorschau werden weder Bestellungen noch Zahlungsinformationen entgegengenommen. Die Warenkorbauswahl wird im Browser gespeichert; das Kontaktformular bereitet nur einen Entwurf im E-Mail-Programm des Besuchers vor.</p><p>Die endgültige Datenschutzerklärung wird auf tatsächlich eingesetzte Hosting-, Schrift-, Analyse-, E-Mail- und Zahlungsdienste abgestimmt.</p></Section>
  <Section title="KI-Haaranprobe (geschützter Test)"><p>Im Hair Preview Lab bleiben hochgeladene Bilder zunächst nur im Browser. Wenn der geschützte Testzugang freigeschaltet ist und die betroffene Person ausdrücklich zustimmt, werden das hochgeladene Originalbild und ein ausgewähltes Ruby Hair Farbmuster einmalig über unseren Server an den externen KI-Dienst <strong>OpenAI</strong> zur Bildbearbeitung übermittelt. Das Ergebnis wird an den Browser zurückgegeben. Die Anwendung speichert das Ausgangsfoto und das Ergebnis nicht dauerhaft in ihrer Datenbank. Eine Datenverarbeitung beim externen Dienst nach dessen Bedingungen ist damit nicht ausgeschlossen.</p><p>Für die endgültige Kundennutzung müssen Auftragsverarbeitung, mögliche internationale Datenübertragungen, Verarbeitungsdauer, Rechtsgrundlagen und die vollständige Datenschutzerklärung gesondert geklärt und freigegeben werden. Ohne diese Freigabe ist die Generierung nur als gesperrter interner Test vorgesehen.</p></Section>
  <Notice/>
 </>;
}
export default async function Legal({params}:{params:Promise<{slug:string}>}){
 const slug=(await params).slug;
 if(!pages[slug])notFound();
 const page=pages[slug];
 return <ShopLayout><section className="rh-shell rh-info-page rh-legal-page">
  <nav className="rh-breadcrumb" aria-label="Breadcrumb"><Link href="/">Startseite</Link><span>/</span><span>{page.title}</span></nav>
  <div className="rh-eyebrow">RUBY HAIR / INFORMATIONEN AUS DEM BISHERIGEN SHOP</div>
  <h1>{page.title}</h1>
  <p className="rh-legal-intro">Übernommen und zusammengefasst aus dem bisherigen Ruby Hair Shop, Stand {old.checkedOn}. Die Originalfassung ist über den Quellenlink verfügbar.</p>
  <div className="rh-delivery-state" role="status"><strong>VORSCHAU</strong><span>Keine Bestellung oder Zahlung möglich. Die endgültigen Bedingungen werden vor dem Verkaufsstart geklärt.</span></div>
  <LegalContent slug={slug}/>
  <Source href={page.source}/>
  <div className="rh-legal-nav"><Link href="/rechtliches/impressum/">Impressum</Link><Link href="/rechtliches/datenschutz/">Datenschutz</Link><Link href="/rechtliches/agb/">AGB</Link><Link href="/rechtliches/widerruf/">Widerruf</Link></div>
 </section></ShopLayout>;
}
