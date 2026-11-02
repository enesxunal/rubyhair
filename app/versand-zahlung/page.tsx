import type {Metadata} from "next";
import Link from "next/link";
import {Truck,Wallet,RotateCcw,Mail,ArrowUpRight,ExternalLink} from "lucide-react";
import ShopLayout from "@/components/site-shell";
import {legacyStore as old} from "@/lib/legacy-store-facts";
export const metadata:Metadata={
 title:"Versand & Zahlung – Angaben aus dem bisherigen Shop",
 description:"Bisherige Versand-, Zahlungs- und Rücksendekonditionen von Ruby Hair und Hinweise zur neuen Shop-Vorschau.",
 robots:{index:false,follow:false}
};
const cards=[
 {icon:Truck,no:"01",title:"Versand & Lieferung",facts:[
   "Bisherige AGB: Versand innerhalb Deutschlands mit DHL.",
   "Bisherige AGB: 4,99 € Versandpauschale pro Bestellung.",
   "Bisherige AGB: Lieferung innerhalb Deutschlands innerhalb von bis zu 5 Werktagen."
 ],url:old.urls.terms,source:"AGB des bisherigen Shops"},
 {icon:Wallet,no:"02",title:"Zahlungsmethoden",facts:[
   "Bisherige AGB: Überweisung, PayPal, VISA und Mastercard.",
   "Die bisherige Startseite nennt PayPal, Kreditkarte, Klarna und SEPA. Die Angaben weichen voneinander ab.",
   "Im neuen Shop sind noch keine Zahlungsarten aktiviert."
 ],url:old.urls.home,source:"Startseite des bisherigen Shops"},
 {icon:RotateCcw,no:"03",title:"Widerruf & Rücksendung",facts:[
   "Die bisherigen Widerrufsseiten nennen 14 Tage Widerrufsfrist.",
   "Die unmittelbaren Rücksendekosten trägt laut den bisherigen Texten der Käufer.",
   "Die Erstattung ursprünglicher Lieferkosten und die Rücksendeadresse sind in den alten Rechtstexten uneinheitlich bzw. unvollständig."
 ],url:old.urls.cancellation,source:"Widerrufsbelehrung des bisherigen Shops"}
];
export default function ShippingPayments(){return <ShopLayout>
  <section className="rh-delivery-hero rh-shell">
    <nav className="rh-breadcrumb" aria-label="Breadcrumb"><Link href="/">Startseite</Link><span>/</span><span>Versand & Zahlung</span></nav>
    <div className="rh-eyebrow">RUBY HAIR / INFORMATIONEN</div>
    <h1>Alles rund um<br/><em>deine Bestellung.</em></h1>
    <p>Die folgenden Konditionen stammen aus dem bisherigen Ruby Hair Shop. Sie helfen bei der Orientierung während der Entwicklung des neuen Shops.</p>
    <div className="rh-delivery-state" role="status"><strong>NEUER SHOP: VORSCHAU</strong><span>Quelle: rubyhair.de, abgerufen am {old.checkedOn}. Die Konditionen sind noch nicht für das neue Shopsystem freigegeben; Bestellungen und Zahlungen sind deaktiviert.</span></div>
  </section>
  <section className="rh-delivery-content rh-shell">
    <div className="rh-delivery-grid">
      {cards.map(item=><article key={item.no}>
        <div className="rh-delivery-card-head"><span>{item.no} / BISHERIGER SHOP</span><item.icon size={28} strokeWidth={1.4}/></div>
        <h2>{item.title}</h2>
        <ul className="rh-oldstore-facts">{item.facts.map(fact=><li key={fact}>{fact}</li>)}</ul>
        <a className="rh-oldstore-source" href={item.url} target="_blank" rel="noopener noreferrer">{item.source} <ExternalLink size={14}/></a>
      </article>)}
    </div>
    <div className="rh-delivery-support"><div><Mail size={27} strokeWidth={1.4}/><h2>Du hast eine Frage?</h2>
      <p>Für Fragen zur Auswahl, Farbe oder einer bisherigen Bestellung erreichst du uns unter {old.email}.</p></div>
      <Link href="/kontakt/" className="rh-editorial-cta">KONTAKT AUFNEHMEN <ArrowUpRight size={17}/></Link>
    </div>
  </section>
</ShopLayout>;}
