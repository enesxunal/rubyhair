import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import ShopLayout from "@/components/site-shell";
import {legacyStore as merchant} from "@/lib/legacy-store-facts";

const pages:Record<string,string>={
 impressum:"Impressum",
 datenschutz:"Datenschutzerklärung",
 agb:"Allgemeine Geschäftsbedingungen",
 widerruf:"Widerrufsbelehrung"
};
export function generateStaticParams(){return Object.keys(pages).map(slug=>({slug}));}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
 const slug=(await params).slug;
 return {title:pages[slug]||"Rechtliche Informationen",alternates:{canonical:"/rechtliches/"+slug+"/"}};
}
function Section({title,children}:{title:string;children:React.ReactNode}){
 return <section className="rh-legal-section"><h2>{title}</h2>{children}</section>;
}
function Merchant(){return <><strong>{merchant.business}</strong><span> – Inhaber {merchant.owner}</span>
 <p>{merchant.street}, {merchant.postalCity}, Deutschland</p>
 <p>E-Mail: <a href={"mailto:"+merchant.email}>{merchant.email}</a></p></>;}
function LegalContent({slug}:{slug:string}){
 if(slug==="impressum")return <>
  <Section title="Angaben gemäß § 5 DDG"><Merchant/>
   <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: {merchant.vatId}</p>
  </Section>
  <Section title="Verbraucherstreitbeilegung">
   <p>Ruby Hair ist nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
  </Section>
  <Section title="Kontakt"><p>Bei Fragen zum Online-Shop oder zu deiner Bestellung kannst du dich an <a href={"mailto:"+merchant.email}>{merchant.email}</a> wenden.</p></Section>
 </>;
 if(slug==="agb")return <>
  <Section title="1. Geltungsbereich">
   <p>Diese Bedingungen gelten für Bestellungen von Verbrauchern über den Ruby Hair Online-Shop. Vertragspartner ist Ruby Hair, Inhaber {merchant.owner}, {merchant.street}, {merchant.postalCity}.</p>
  </Section>
  <Section title="2. Bestellung und Vertragsschluss">
   <p>Die Darstellung der Produkte stellt eine Einladung zur Abgabe einer Bestellung dar. Du kannst die gewünschte Farbe, Länge und Menge in den Warenkorb legen und die Bestelldaten an der Kasse prüfen. Durch die ausdrücklich zahlungspflichtige Bestellung gibst du ein verbindliches Angebot ab. Die Bestell- und Zahlungsbestätigung wird dir elektronisch mitgeteilt.</p>
  </Section>
  <Section title="3. Preise und Versandkosten">
   <p>Die im Shop angegebenen Endpreise enthalten die gesetzliche deutsche Umsatzsteuer. Für den Versand innerhalb Deutschlands wird eine Versandpauschale von 4,99 € pro Bestellung berechnet. Vor Bestellabschluss werden Produkte, Gesamtbetrag und Versandkosten angezeigt.</p>
  </Section>
  <Section title="4. Zahlungsmethoden">
   <p>Im Online-Shop sind PayPal und Klarna als Zahlungsarten verfügbar. Die Zahlung wird über den ausgewählten Anbieter abgewickelt. Klarna kann den Betrag zunächst autorisieren und erst nach Versand einziehen. Die jeweiligen zusätzlichen Bedingungen des Zahlungsanbieters werden in dessen Zahlungsprozess angezeigt.</p>
  </Section>
  <Section title="5. Lieferung">
   <p>Geliefert wird innerhalb Deutschlands mit DHL. Die reguläre Lieferzeit beträgt bis zu fünf Werktage, sofern für den jeweiligen Artikel nichts anderes angegeben ist. Wenn ein Artikel nicht verfügbar ist oder sich der Versand verzögert, informieren wir dich.</p>
  </Section>
  <Section title="6. Widerrufsrecht">
   <p>Verbrauchern steht grundsätzlich ein gesetzliches Widerrufsrecht zu. Die Informationen zur Frist, zu Rücksendekosten und zu den Erstattungsfolgen findest du in der <Link href="/rechtliches/widerruf/">Widerrufsbelehrung</Link>. Du kannst deine Erklärung auch direkt über die <Link href="/widerruf/">elektronische Widerrufsfunktion</Link> abgeben.</p>
  </Section>
  <Section title="7. Eigentumsvorbehalt und Gewährleistung">
   <p>Bis zur vollständigen Zahlung bleibt die Ware Eigentum von Ruby Hair. Es gelten die gesetzlichen Mängelhaftungsrechte.</p>
  </Section>
  <Section title="8. Kontakt und Streitbeilegung">
   <p>Bei Rückfragen kontaktiere uns bitte unter <a href={"mailto:"+merchant.email}>{merchant.email}</a>. Ruby Hair ist nicht zur Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle verpflichtet oder bereit.</p>
  </Section>
 </>;
 if(slug==="widerruf")return <>
  <Section title="Widerrufsrecht">
   <p>Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem du oder ein von dir benannter Dritter, der nicht der Beförderer ist, die Waren in Besitz genommen hat. Bei getrennten Lieferungen ist grundsätzlich der Erhalt der letzten Ware maßgeblich.</p>
   <p>Um dein Widerrufsrecht auszuüben, musst du uns – Ruby Hair, {merchant.owner}, {merchant.street}, {merchant.postalCity}, E-Mail <a href={"mailto:"+merchant.email}>{merchant.email}</a> – mittels einer eindeutigen Erklärung über deinen Entschluss, den Vertrag zu widerrufen, informieren. Zur Wahrung der Frist reicht es aus, dass du die Mitteilung vor Ablauf der Widerrufsfrist absendest.</p>
  </Section>
  <Section title="Vertrag online widerrufen">
   <p>Du kannst deinen Widerruf auch über unsere elektronische Funktion erklären. Auf der Seite <Link href="/widerruf/">Vertrag widerrufen</Link> gibst du Name, Vertrags- oder Bestellreferenz und E-Mail-Adresse an. Danach bestätigst du den Widerruf mit einem zweiten Schritt. Wir übermitteln dir unverzüglich eine Eingangsbestätigung mit Inhalt sowie Datum und Uhrzeit deiner Erklärung auf einem dauerhaften Datenträger, in der Regel per E-Mail.</p>
   <p><Link href="/widerruf/" className="rh-editorial-cta">VERTRAG WIDERRUFEN</Link></p>
  </Section>
  <Section title="Folgen des Widerrufs">
   <p>Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen, die wir von dir erhalten haben, einschließlich der Kosten der günstigsten angebotenen Standardlieferung, unverzüglich und spätestens binnen vierzehn Tagen ab Eingang der Widerrufserklärung zurückzuzahlen. Zusätzliche Kosten aufgrund einer von dir gewählten teureren Versandart sind ausgenommen. Wir verwenden für die Rückzahlung dasselbe Zahlungsmittel wie bei der ursprünglichen Transaktion, sofern nicht ausdrücklich etwas anderes vereinbart wurde.</p>
   <p>Wir können die Rückzahlung verweigern, bis wir die Waren wieder zurückerhalten haben oder du den Nachweis erbracht hast, dass du die Waren zurückgesandt hast, je nachdem, welches der frühere Zeitpunkt ist.</p>
   <p>Du hast die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab dem Tag, an dem du uns über den Widerruf unterrichtest, an Ruby Hair, {merchant.street}, {merchant.postalCity}, Deutschland, zurückzusenden oder zu übergeben. Du trägst die unmittelbaren Kosten der Rücksendung. Für einen Wertverlust musst du nur aufkommen, wenn er auf einen Umgang mit den Waren zurückzuführen ist, der zur Prüfung ihrer Beschaffenheit, Eigenschaften und Funktionsweise nicht notwendig war.</p>
  </Section>
  <Section title="Muster-Widerrufserklärung (freiwillig)">
   <p>An Ruby Hair, {merchant.street}, {merchant.postalCity}, {merchant.email}:</p>
   <p>Hiermit widerrufe ich den von mir abgeschlossenen Vertrag über den Kauf folgender Waren: [Bezeichnung]; bestellt am [Datum], erhalten am [Datum]; Name und Anschrift; Datum.</p>
   <p>Eine Begründung ist nicht erforderlich. Die Nutzung dieses Musters ist freiwillig.</p>
  </Section>
 </>;
 return <>
  <Section title="Verantwortliche Stelle">
   <Merchant/>
   <p>Für Datenschutzanfragen wende dich bitte an <a href={"mailto:"+merchant.email}>{merchant.email}</a>.</p>
  </Section>
  <Section title="Bestellungen, Zahlungen und Versand">
   <p>Wenn du etwas bestellst, verarbeiten wir die für Vertrag und Versand erforderlichen Angaben, insbesondere Namen, Kontakt- und Lieferdaten, bestellte Artikel und den Zahlungsstatus. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO; für gesetzliche Aufbewahrungspflichten Art. 6 Abs. 1 lit. c DSGVO.</p>
   <p>Für die Zahlungsabwicklung werden erforderliche Daten an PayPal beziehungsweise Klarna übermittelt, wenn du den Anbieter auswählst. Ruby Hair speichert Zahlungsreferenzen und Bestätigungsstatus, aber keine vollständigen Zahlungs- oder Kreditkartendaten. Für die Paketbeförderung werden Versanddaten an DHL übermittelt. Bestellbenachrichtigungen und Eingangsbestätigungen werden über IONOS-E-Mail-Dienste versandt.</p>
  </Section>
  <Section title="Freiwilliges Kundenkonto und E-Mail-Anmeldung">
   <p>Die Einrichtung eines Kundenkontos ist freiwillig; du kannst auch ohne Konto bestellen. Wenn du einen Login-Link anforderst, verarbeiten wir die eingegebene E-Mail-Adresse und versenden über unseren IONOS-Mailanbieter einen einmaligen, 15 Minuten gültigen Anmeldelink. Der Bestätigungscode wird nur als Hash gespeichert und nach der Nutzung ungültig. Bei der Registrierung werden Vorname, Nachname und ein kryptografisch gesicherter Passwort-Hash gespeichert. Dein Klartext-Passwort wird nicht gespeichert. Freiwillig hinterlegte Lieferadressen kannst du im Kundenkonto ändern oder löschen; alte Bestellungen bleiben unverändert. Für deine Anmeldung verwenden wir ein technisch notwendiges, geschütztes Sitzungscookie mit einer Gültigkeit von bis zu 30 Tagen. Du kannst dich jederzeit abmelden. Nach nachgewiesener Kontrolle über die E-Mail-Adresse werden nur Bestellungen und Rechnungen angezeigt, die an diese Adresse gerichtet wurden. Es erfolgt keine automatische Registrierung durch eine Gastbestellung. Zur Missbrauchsvermeidung speichern wir befristete, gehashte Begrenzungszähler für Login-Anfragen.</p>
  </Section>
  <Section title="Hosting und technische Protokolle">
   <p>Der Shop nutzt Vercel zum Hosting und eine PostgreSQL-Datenbank. Für die technische Bereitstellung und Sicherheit können Serverprotokolle (z. B. IP-Adresse, Zeitpunkt, angefragte Seite und technische Fehlerdaten) verarbeitet werden. Die Verarbeitung erfolgt zur Bereitstellung des Dienstes und zur Sicherheit auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.</p>
  </Section>
  <Section title="Technische Fehler bei der Bestellung">
   <p>Zur Fehlerbehebung im Bestellvorgang werden Zeitpunkt, Zahlungsart, betroffener Schritt und ein begrenzter technischer Fehlercode protokolliert. Bei einer serverseitig zugeordneten Bestellung kann die Bestellreferenz enthalten sein. Es werden keine eingegebenen Adresswerte, Kartendaten, Sicherheitscodes oder Zahlungs-Tokens in diesem Fehlerprotokoll gespeichert. Das Protokoll ist nur für berechtigte Shop-Verwaltung zugänglich, dient der technischen Fehlerbehebung und ist von optionalen Marketing- und Nutzungsstatistiken getrennt. Die vorgesehenen Fehlerprotokolle werden nach 30 Tagen bereinigt.</p>
  </Section>
  <Section title="Cookie-Einwilligung und Statistik">
   <p>Technisch notwendige Funktionen wie der Warenkorb verwenden lokale Browserdaten. Optionale Nutzungsstatistiken werden nur mit deiner Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO erfasst. Du kannst Statistik und Marketing unabhängig voneinander über „Cookie-Einstellungen“ im Seitenfuß auswählen und widerrufen. Die Shop-Statistik speichert täglich zusammengefasste Zahlen zu Seitenaufrufen, Story-Wiedergaben, begonnenen und erfolgreich beendeten KI-Vorschauen, Weiterleitungen vom KI-Ergebnis in den Warenkorb sowie Warenkorb- und Kassenaktionen. Dabei werden keine hochgeladenen Fotos, einzelnen Besucherprofile oder persönlichen Angaben in den Statistikaggregaten gespeichert. Diese anonymen Tageswerte werden nach 180 Tagen gelöscht.</p>
  </Section>
  <Section title="Interner Kaufverlauf (freiwillig)">
   <p>Mit einer zusätzlichen freiwilligen Einwilligung (Art. 6 Abs. 1 lit. a DSGVO und § 25 TDDDG) erfassen wir den pseudonymen Kaufverlauf: zufällige Kennung im Tab-Speicher, Warenkorb- und Kassenaktionen, Zahlungsart, technische Fehlercodes und den serverseitig zugeordneten Bestellstatus. Die Kennung wechselt nach 30 Minuten Inaktivität. Keine Namen, E-Mail-Adressen, Adresswerte, Kartendaten oder Zahlungs-Tokens werden in diesem Protokoll gespeichert. Zugriff nur durch berechtigte Shop-Verwaltung, keine Übermittlung an Werbeanbieter; Löschung nach 7 Tagen. Widerruf jederzeit über Cookie-Einstellungen.</p>
  </Section>
  <Section title="Digitale Geschenkgutscheine">
   <p>Bei der Bestellung eines digitalen Ruby Hair Geschenkgutscheins verarbeiten wir den gewählten Gutscheinwert, die E-Mail-Adresse des Käufers sowie die freiwillig angegebenen Namen und persönlichen Grüße. Soll der Gutschein direkt versendet werden, verarbeiten wir zusätzlich die E-Mail-Adresse des Empfängers ausschließlich zur angeforderten Zustellung und Abwicklung. Erst nach nachgewiesener Zahlung stellen wir einen einmaligen, digital gespeicherten Gutscheincode aus. Guthaben und Einlösungen werden zum Schutz vor missbräuchlicher oder doppelter Verwendung protokolliert. Die Verarbeitung erfolgt zur Erfüllung des Kaufvertrags nach Art. 6 Abs. 1 lit. b DSGVO. Die E-Mail-Adresse des Empfängers nutzen wir nicht für Newsletter. Gutscheincodes sollten nicht öffentlich geteilt werden, da die Kenntnis des Codes zur Einlösung berechtigt.</p>
  </Section>
  <Section title="Google Analytics 4 (freiwillige Einwilligung)">
   <p>Wir setzen Google Analytics 4 von Google Ireland Limited nur ein, wenn du der gesonderten Google-Statistik ausdrücklich zustimmst. Die Auswertung umfasst Seitenaufrufe, Produktansichten, Warenkorb-Aktionen und den Beginn des Checkouts. Google kann technische Informationen (z. B. IP-Adresse, Browser, Cookies und besuchte Seiten) verarbeiten und Daten auch in Drittländern einschließlich den USA verarbeiten. Eine frühere Zustimmung zur rein internen Shop-Statistik schaltet Google Analytics 4 nicht automatisch frei. Wir deaktivieren Google Signals und Werbepersonalisierung und senden weder Namen noch Bestell- oder Zahlungsdetails über diese Integration. Nach einer serverseitig bestätigten PayPal-Zahlung beziehungsweise einem vollständig bezahlten Gutschein-Auftrag kann zusätzlich mit deiner Statistik-Einwilligung ein einmaliges Kaufereignis ohne Kaufbetrag oder Bestellkennung übermittelt werden. Eine bloße Klarna-Autorisierung wird dabei nicht als Kauf gezählt. Die Grundlage ist deine Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO und § 25 TDDDG. Über „Cookie-Einstellungen“ kannst du diese jederzeit mit Wirkung für die Zukunft widerrufen. Weitere Informationen bietet die <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Datenschutzerklärung von Google</a>.</p>
  </Section>
  <Section title="Meta Pixel (freiwillige Marketing-Einwilligung)">
   <p>Mit deiner gesonderten und jederzeit widerrufbaren Einwilligung verwenden wir den Meta Pixel von Meta Platforms Ireland Limited für die Auswertung von Seitenaufrufen, Produktansichten, Warenkorb-Aktionen und Checkout-Beginn. Dabei kann Meta technische Daten wie IP-Adresse, Browserinformationen, Cookies und Ereignisdaten verarbeiten und Daten auch außerhalb des Europäischen Wirtschaftsraums übertragen. Die Nutzung erfolgt erst nach ausdrücklicher Zustimmung gemäß Art. 6 Abs. 1 lit. a DSGVO und § 25 TDDDG. Nach serverseitig bestätigter PayPal-Zahlung beziehungsweise vollständig bezahltem Gutschein-Auftrag kann bei Marketing-Einwilligung zusätzlich ein Kaufereignis übertragen werden. Nach erneuter Marketing-Einwilligung kann dieses bei einer bestätigten, aktuellen PayPal-Zahlung auch den tatsächlich gezahlten Betrag, die Währung und eine pseudonyme Ereignis-ID enthalten; keine Bestellnummer oder Käuferdaten werden als Parameter übermittelt. Ohne Marketing-Einwilligung wird der Meta Pixel nicht geladen. Du kannst deine Auswahl über „Cookie-Einstellungen“ im Seitenfuß jederzeit ändern oder widerrufen. Weitere Informationen findest du bei <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer">Meta</a>.</p>
  </Section>
  <Section title="Optionale Bestellherkunft">
   <p>Mit gesonderter Einwilligung speichern wir eine zufällige, pseudonyme Kennung im Cookie sowie die erste und letzte erkennbare Herkunft, Geräteklasse und gegebenenfalls numerische Meta-Kampagnen-, Anzeigengruppen- und Anzeigenkennungen. Diese Informationen verknüpfen wir intern mit der Bestellung oder dem Gutscheinkauf, um unsere Werbewirkung zu messen. Wir speichern keine vollständigen URLs, Klickkennungen, IP-Adressen oder Suchbegriffe für diese Zuordnung und übermitteln sie nicht an Werbeanbieter. Die Zuordnung wird nach 90 Tagen beim täglichen Löschlauf entfernt, bei Widerruf über Cookie-Einstellungen vorzeitig gelöscht. Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO und § 25 TDDDG. Ohne Zustimmung bleibt die Quelle unbekannt; die Bestellung ist weiterhin möglich.</p>
  </Section>
  <Section title="Optionale Warenkorb-Erinnerungen">
   <p>Sofern angeboten, kannst du freiwillig bis zu drei E-Mail-Erinnerungen zu deiner Auswahl anfordern. Wir speichern deine E-Mail-Adresse verschlüsselt, Artikelnummern und Mengen sowie den Zeitpunkt und die Version deiner Einwilligung. Erst nach Bestätigung über den Link in der Bestätigungs-E-Mail sind Erinnerungen nach 1, 24 und 48 Stunden möglich. Bei einer neuen Bestellung mit derselben E-Mail-Adresse stoppen die Erinnerungen. Über den Abmeldelink kannst du sie jederzeit beenden. Der aktive Erinnerungsdatensatz läuft spätestens 72 Stunden nach Bestätigung ab. Rechtsgrundlage ist die freiwillige Einwilligung. Ohne Anfrage wird keine Erinnerungs-E-Mail versendet.</p>
  </Section>
  <Section title="Optionale Meta Conversions API">
   <p>Sofern angeboten und separat aktiviert, können wir nach bestätigter tatsächlicher Zahlung den gezahlten Betrag, die Währung, eine pseudonyme Ereignis-ID, Browserinformationen und Meta-Browser- oder Klickkennungen an Meta senden. Es werden keine E-Mail-Adressen, Namen, Anschriften oder Zahlungsdaten als Parameter übermittelt. Die Zuordnung wird nur bei ausdrücklicher Zustimmung gespeichert, nach Abschluss von Browserinformationen bereinigt und nach sieben Tagen beim täglichen Löschlauf gelöscht. Bei Klarna kann die bestätigte Abbuchung erst beim Versand erfolgen. Der pseudonyme Einwilligungsnachweis wird bis zum Ablauf von 180 Tagen gespeichert. Die Einwilligung kann über Cookie-Einstellungen widerrufen werden. Grundlage ist deine Einwilligung.</p>
  </Section>
  <Section title="KI-Haarvorschau">
   <p>Wenn du die KI-Haarvorschau nutzt, wird ein ausgewähltes Foto erst nach ausdrücklicher Einwilligung und nach deinem Start der Bildbearbeitung über den Shopserver an den Dienst OpenAI übertragen. Fotos und generierte Ergebnisse werden nicht dauerhaft in der Ruby Hair Datenbank gespeichert. Die Verarbeitung ist freiwillig und beruht auf deiner Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Für die Verarbeitung durch externe Anbieter gelten zusätzlich deren Datenschutzinformationen.</p>
  </Section>
  <Section title="Elektronische Widerrufserklärungen">
   <p>Über unsere <Link href="/widerruf/">Widerrufsfunktion</Link> verarbeiten wir deinen Namen, die Vertrags- oder Bestellreferenz und deine angegebene E-Mail-Adresse. Wir dokumentieren Datum und Uhrzeit des Eingangs, speichern die Erklärung zur Nachweisführung und übermitteln eine Eingangsbestätigung per E-Mail. Die Verarbeitung ist für gesetzliche Pflichten und die Vertragsabwicklung erforderlich (Art. 6 Abs. 1 lit. b und c DSGVO). Die Daten werden nur so lange vorgehalten, wie die Bearbeitung und gesetzliche Aufbewahrungspflichten es erfordern.</p>
  </Section>
  <Section title="Deine Rechte">
   <p>Du kannst nach den gesetzlichen Voraussetzungen Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und Datenübertragbarkeit verlangen. Eine erteilte Einwilligung kannst du jederzeit mit Wirkung für die Zukunft widerrufen. Du hast außerdem das Recht, dich bei einer zuständigen Datenschutzaufsichtsbehörde zu beschweren. Wende dich für entsprechende Anliegen an <a href={"mailto:"+merchant.email}>{merchant.email}</a>.</p>
  </Section>
 </>;
}
export default async function Legal({params}:{params:Promise<{slug:string}>}){
 const slug=(await params).slug;
 if(!pages[slug])notFound();
 return <ShopLayout><section className="rh-shell rh-info-page rh-legal-page">
  <nav className="rh-breadcrumb" aria-label="Breadcrumb"><Link href="/">Startseite</Link><span>/</span><span>{pages[slug]}</span></nav>
  <div className="rh-eyebrow">RUBY HAIR / RECHTLICHE INFORMATIONEN</div>
  <h1>{pages[slug]}</h1>
  <p className="rh-legal-intro">Informationen zum Ruby Hair Online-Shop. Stand: 19. November 2026.</p>
  <LegalContent slug={slug}/>
  <div className="rh-legal-nav">
   <Link href="/rechtliches/impressum/">Impressum</Link>
   <Link href="/rechtliches/datenschutz/">Datenschutz</Link>
   <Link href="/rechtliches/agb/">AGB</Link>
   <Link href="/rechtliches/widerruf/">Widerrufsbelehrung</Link>
   <Link href="/widerruf/">Vertrag widerrufen</Link>
  </div>
 </section></ShopLayout>;
}
