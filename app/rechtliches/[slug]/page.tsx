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
function Source({href}:{href:string}){
  return <a className="rh-legal-source" href={href} target="_blank" rel="noopener noreferrer">
    ORIGINALANGABEN AUF RUBYHAIR.DE <ExternalLink size={15}/>
  </a>;
}
function LegalContent({slug}:{slug:string}){
  if(slug==="impressum")return <>
    <section className="rh-legal-section">
      <h2>Angaben aus dem bisherigen Impressum</h2>
      <p><strong>{old.business}</strong><br/>Inhaber: {old.owner}<br/>{old.street}<br/>{old.postalCity}<br/>Deutschland</p>
      <p>E-Mail: <a href={"mailto:"+old.email}>{old.email}</a></p>
      <p>Umsatzsteuer-Identifikationsnummer laut bisherigem Impressum: <strong>{old.vatId}</strong></p>
      <p className="rh-legal-caution">Diese Angaben wurden aus dem derzeit veröffentlichten Impressum übernommen. Die rechtliche Vollständigkeit und Aktualität für das neue Shopsystem muss vor dessen Verkaufsstart überprüft werden.</p>
    </section>
    <section className="rh-legal-section"><h2>Verbraucherstreitbeilegung</h2>
      <p>Das bisherige Impressum nennt keine Teilnahmebereitschaft an einem Verbraucherstreitbeilegungsverfahren. Veraltete Hinweise auf die frühere EU-Online-Streitbeilegungsplattform werden hier nicht übernommen; die Angaben werden für den neuen Shop rechtlich geprüft.</p>
    </section>
  </>;
  if(slug==="agb")return <>
    <section className="rh-legal-section"><h2>Bisherige AGB – Informationsübersicht</h2>
      <p>Die bisherigen AGB nennen {old.business}, Inhaber {old.owner}, als Vertragspartner. Für Lieferungen innerhalb Deutschlands werden dort <strong>4,99 € Versandpauschale</strong>, <strong>DHL</strong> und eine Lieferzeit von bis zu <strong>5 Werktagen</strong> angegeben.</p>
      <p>Die bisher genannten Zahlarten sind Überweisung, PayPal, VISA und Mastercard. Die alte Startseite nennt abweichend auch Klarna und SEPA.</p>
      <p>Die Angaben zur Erstattung von Versandkosten widersprechen der separat veröffentlichten Widerrufsbelehrung. Eine Übernahme als verbindliche neue AGB wäre deshalb nicht korrekt.</p>
      <p className="rh-legal-caution">Dies ist eine Zusammenfassung des bisherigen Shops, kein rechtsverbindlicher AGB-Text für die neue Plattform. Vor dem Verkaufsstart werden die neuen AGB fertiggestellt und rechtlich geprüft.</p>
    </section>
    <Link className="rh-legal-internal" href="/versand-zahlung/">Bisherige Versand- und Zahlungsangaben ansehen →</Link>
  </>;
  if(slug==="widerruf")return <>
    <section className="rh-legal-section"><h2>Bisherige Widerrufsangaben</h2>
      <p>Die bisherige Widerrufsbelehrung nennt ein <strong>14-tägiges Widerrufsrecht</strong> für Verbraucher. Sie gibt an, dass Käufer die unmittelbaren Kosten der Rücksendung tragen.</p>
      <p>Die bisherige separate Widerrufsseite enthält noch unausgefüllte Angaben zur Telefonnummer und zum möglichen Warenempfänger. Zudem widerspricht sie der AGB-Fassung bei der Erstattung der ursprünglichen Lieferkosten. Gemäß § 357 Abs. 2 BGB sind bei einem gesetzlichen Widerruf grundsätzlich auch die Kosten der günstigsten Standardlieferung zu erstatten.</p>
      <p><strong>Neue Pflicht seit 19. Juni 2026:</strong> Für entsprechende Online-Verbraucherverträge ist nach § 356a BGB eine leicht zugängliche elektronische Widerrufsfunktion mit zwei Bestätigungsschritten und unverzüglicher elektronischer Eingangsbestätigung erforderlich. Diese Funktion ist in der nicht-transaktionalen Vorschau noch nicht verfügbar und wird vor Aktivierung realer Bestellungen implementiert.</p>
      <p className="rh-legal-caution">Daher wird der alte Rechtstext nicht unverändert wiederverwendet. Die vollständige, rechtlich geprüfte Widerrufsbelehrung und Rücksendeanschrift des neuen Shops müssen vor dem Verkaufsstart festgelegt werden.</p>
    </section>
    <Link className="rh-legal-internal" href="/kontakt/">Rückfrage zu einer bisherigen Bestellung →</Link>
  </>;
  return <>
    <section className="rh-legal-section"><h2>Datenschutz für die neue Website</h2>
      <p>Der bisherige Shop verfügt über eine Datenschutzerklärung. Da das neue Angebot auf Next.js statt WordPress/WooCommerce läuft, können dessen Angaben zu Cookies, Zahlungsdienstleistern und Datenspeicherung nicht einfach übertragen werden.</p>
      <p>Das derzeitige Impressum nennt {old.street}, {old.postalCity}. Die bestehende Datenschutzerklärung nennt dagegen <strong>Zweigertstraße 8, 45130 Essen</strong> für die verantwortliche Stelle. Dieser Unterschied wird vor Freigabe geklärt.</p>
      <p>In dieser Vorschau sind Bestellung und Zahlung abgeschaltet. Die unverbindliche Produktauswahl liegt im Browser; das Kontaktformular erstellt lediglich einen Entwurf im eigenen E-Mail-Programm.</p>
      <p className="rh-legal-caution">Eine vollständige Datenschutzerklärung muss die tatsächlichen neuen Dienste, Hosting, Server-Logs, Zahlungs- und E-Mail-Verarbeitung abbilden und vor dem Verkaufsstart juristisch überprüft werden.</p>
    </section>
    <Link className="rh-legal-internal" href="/kontakt/">Kontakt für Datenschutzfragen →</Link>
  </>;
}
export default async function Legal({params}:{params:Promise<{slug:string}>}){
  const slug=(await params).slug;
  if(!pages[slug])notFound();
  const page=pages[slug];
  return <ShopLayout><section className="rh-shell rh-info-page rh-legal-page">
    <nav className="rh-breadcrumb" aria-label="Breadcrumb"><Link href="/">Startseite</Link><span>/</span><span>{page.title}</span></nav>
    <div className="rh-eyebrow">RUBY HAIR / BESTEHENDE ANGABEN</div>
    <h1>{page.title}</h1>
    <p className="rh-legal-intro">Quellengestützte Informationen aus dem bisherigen Ruby Hair Shop, abgerufen am {old.checkedOn}.</p>
    <div className="rh-delivery-state" role="status"><strong>VORSCHAU</strong><span>Die rechtsverbindlichen Texte für den neuen Shop sind noch nicht freigegeben. Bestellungen und Zahlungen sind hier deaktiviert.</span></div>
    <LegalContent slug={slug}/>
    <Source href={page.source}/>
    <div className="rh-legal-nav"><Link href="/rechtliches/impressum/">Impressum</Link><Link href="/rechtliches/datenschutz/">Datenschutz</Link><Link href="/rechtliches/agb/">AGB</Link><Link href="/rechtliches/widerruf/">Widerruf</Link></div>
  </section></ShopLayout>;
}
