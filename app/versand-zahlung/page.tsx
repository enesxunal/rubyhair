import type {Metadata} from "next";
import Link from "next/link";
import {Truck,Wallet,RotateCcw,Mail,ArrowUpRight} from "lucide-react";
import ShopLayout from "@/components/site-shell";

export const metadata:Metadata={
 title:"Versand & Zahlung | Ruby Hair",
 description:"Versandkosten, Liefergebiet, PayPal- und Klarna-Zahlung sowie Widerruf bei Ruby Hair.",
 alternates:{canonical:"/versand-zahlung/"}
};
const cards=[
 {icon:Truck,no:"01",title:"Versand & Lieferung",facts:[
  "Wir versenden innerhalb Deutschlands mit DHL.",
  "Versandkosten: 4,99 € pro Bestellung.",
  "Die Lieferzeit beträgt im Regelfall bis zu fünf Werktage. Über den Versand informieren wir dich per E-Mail.",
  "Der Versand wird aktuell manuell bearbeitet; eine DHL-Sendungsnummer erhältst du nach der Übergabe."
 ]},
 {icon:Wallet,no:"02",title:"Sicher bezahlen",facts:[
  "Wähle an der Kasse zwischen PayPal und Klarna.",
  "Du bestätigst deine Zahlung direkt beim jeweiligen Zahlungsanbieter.",
  "Bei Klarna wird der Betrag zunächst autorisiert und erst bei bestätigtem Versand eingezogen.",
  "Alle Endpreise enthalten die gesetzliche Umsatzsteuer; die Versandkosten werden vor Bestellabschluss ausgewiesen."
 ]},
 {icon:RotateCcw,no:"03",title:"Widerruf & Rücksendung",facts:[
  "Für Verbraucher gilt grundsätzlich eine Widerrufsfrist von 14 Tagen ab Erhalt der Ware.",
  "Du kannst den Vertrag direkt online über unsere Widerrufsfunktion widerrufen.",
  "Bitte beachte die vollständige Widerrufsbelehrung für Rücksendung, Rücksendekosten und Erstattung.",
  "Ein Widerrufsgrund ist nicht erforderlich."
 ]}
];
export default function ShippingPayments(){return <ShopLayout>
 <section className="rh-delivery-hero rh-shell">
  <nav className="rh-breadcrumb" aria-label="Breadcrumb"><Link href="/">Startseite</Link><span>/</span><span>Versand & Zahlung</span></nav>
  <div className="rh-eyebrow">RUBY HAIR / INFORMATIONEN</div>
  <h1>Alles rund um<br/><em>deine Bestellung.</em></h1>
  <p>Alle wichtigen Informationen zur Lieferung, Zahlung und Rücksendung findest du hier.</p>
 </section>
 <section className="rh-delivery-content rh-shell">
  <div className="rh-delivery-grid">
   {cards.map(item=><article key={item.no}>
    <div className="rh-delivery-card-head"><span>{item.no} / RUBY HAIR</span><item.icon size={28} strokeWidth={1.4}/></div>
    <h2>{item.title}</h2>
    <ul className="rh-oldstore-facts">{item.facts.map(fact=><li key={fact}>{fact}</li>)}</ul>
    {item.no==="03"&&<Link className="rh-oldstore-source" href="/widerruf/">VERTRAG WIDERRUFEN <ArrowUpRight size={14}/></Link>}
   </article>)}
  </div>
  <div className="rh-delivery-support"><div><Mail size={27} strokeWidth={1.4}/><h2>Du hast eine Frage?</h2>
   <p>Für Fragen zu deiner Bestellung, Lieferung oder Farbe erreichst du uns unter <a href="mailto:info@rubyhair.de">info@rubyhair.de</a>.</p></div>
   <Link href="/kontakt/" className="rh-editorial-cta">KONTAKT AUFNEHMEN <ArrowUpRight size={17}/></Link>
  </div>
  <p><Link href="/rechtliches/agb/">AGB</Link> · <Link href="/rechtliches/widerruf/">Widerrufsbelehrung</Link> · <Link href="/rechtliches/datenschutz/">Datenschutz</Link></p>
 </section>
 </ShopLayout>;}
