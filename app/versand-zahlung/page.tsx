import type {Metadata} from "next";
import Link from "next/link";
import {Truck,Wallet,RotateCcw,Mail,ArrowUpRight} from "lucide-react";
import ShopLayout from "@/components/site-shell";

export const metadata:Metadata={
  title:"Versand & Zahlung – Vorschau",
  description:"Informationen zu Versand, Bezahlung und Rückfragen bei Ruby Hair. Details für den neuen eigenständigen Onlineshop werden vor dem Verkaufsstart bestätigt.",
  robots:{index:false,follow:false}
};
const cards=[
  {
    icon:Truck,number:"01",title:"Versand & Lieferung",
    text:"Versandgebiet, Versanddienstleister, Lieferzeiten und Versandkosten des neuen Shops werden derzeit mit Ruby Hair abgestimmt. Für die Vorschau sind noch keine verbindlichen Versandkosten hinterlegt."
  },
  {
    icon:Wallet,number:"02",title:"Zahlungsmethoden",
    text:"Der neue Shop hat noch keine Zahlungsanbieter freigeschaltet. Die endgültigen Zahlungsmethoden werden erst nach Integration und Sicherheitstests veröffentlicht."
  },
  {
    icon:RotateCcw,number:"03",title:"Widerruf & Rücksendung",
    text:"Die rechtlichen Angaben zu Widerruf, Rücksendeadresse und Rücksendekosten werden für den neuen Shop geprüft. Der verbindliche Text wird vor dem Verkaufsstart bereitgestellt."
  }
];
export default function ShippingPayments(){
  return <ShopLayout>
    <section className="rh-delivery-hero rh-shell">
      <nav className="rh-breadcrumb" aria-label="Breadcrumb"><Link href="/">Startseite</Link><span>/</span><span>Versand & Zahlung</span></nav>
      <div className="rh-eyebrow">RUBY HAIR / INFORMATIONEN</div>
      <h1>Alles rund um<br/><em>deine Bestellung.</em></h1>
      <p>Hier findest du später alle Informationen zu Versand, Zahlung und Rücksendungen. Im Moment ist dies die Vorschau des neuen Onlineshops; echte Bestellungen sind noch nicht möglich.</p>
      <div className="rh-delivery-state" role="status"><strong>DESIGNVORSCHAU</strong><span>Die verbindlichen Versand-, Zahlungs- und Widerrufsbedingungen für den neuen Shop stehen noch aus.</span></div>
    </section>
    <section className="rh-delivery-content rh-shell">
      <div className="rh-delivery-grid">
        {cards.map(item=><article key={item.number}>
          <div className="rh-delivery-card-head"><span>{item.number} / INFORMATIONEN</span><item.icon size={28} strokeWidth={1.4}/></div>
          <h2>{item.title}</h2>
          <p>{item.text}</p>
        </article>)}
      </div>
      <div className="rh-delivery-support">
        <div><Mail size={27} strokeWidth={1.4}/><h2>Du hast eine Frage?</h2>
        <p>Für eine individuelle Beratung zu Produkten, Farben oder offenen Fragen kannst du Ruby Hair direkt kontaktieren.</p></div>
        <Link href="/kontakt/" className="rh-editorial-cta">KONTAKT AUFNEHMEN <ArrowUpRight size={17}/></Link>
      </div>
    </section>
  </ShopLayout>;
}
