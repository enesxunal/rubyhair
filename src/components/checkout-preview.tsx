"use client";
import Link from "next/link";
import {Check,LockKeyhole,Truck,Wallet,ArrowUpRight,ShoppingBag} from "lucide-react";
import {useCart} from "@/components/cart-context";
import {useCartQuote} from "@/hooks/use-cart-quote";
import {euros} from "@/lib/catalog";

const process=[
  {no:"01",label:"Warenkorb",description:"Produkte, Farbe und Menge prüfen",icon:ShoppingBag},
  {no:"02",label:"Lieferung",description:"Versandgebiet, Lieferzeit und Kosten werden noch bestätigt",icon:Truck},
  {no:"03",label:"Zahlung",description:"Zahlungsarten sind noch nicht freigeschaltet",icon:Wallet}
];
export default function CheckoutPreview(){
  const {lines,loaded}=useCart();
  const {quote,error,loading}=useCartQuote(lines);
  return <div className="rh-checkout-v2 rh-shell">
    <nav className="rh-breadcrumb" aria-label="Breadcrumb">
      <Link href="/">Startseite</Link><span>/</span>
      <Link href="/warenkorb/">Warenkorb</Link><span>/</span><span>Kasse (Vorschau)</span>
    </nav>
    <div className="rh-eyebrow">RUBY HAIR / CHECKOUT-VORSCHAU</div>
    <h1>Almost <em>yours.</em></h1>
    <div className="rh-checkout-alert" role="status">
      <LockKeyhole size={22} strokeWidth={1.5}/>
      <div><strong>NOCH NICHT ZUR BESTELLUNG FREIGEGEBEN</strong>
        <p>Die neue Kasse ist eine unverbindliche Designvorschau. Hier werden keine Adressen, Bestellungen oder Zahlungsdaten erfasst.</p>
      </div>
    </div>
    <div className="rh-checkout-grid">
      <section className="rh-checkout-process">
        <h2>So geht es später weiter.</h2>
        <p>Diese Schritte werden erst aktiviert, wenn alle Versandbedingungen, Zahlungsarten und Sicherheitstests für den neuen Shop freigegeben sind.</p>
        <div className="rh-checkout-steps">
          {process.map((step,i)=><article key={step.no}>
            <div className="rh-checkout-number">{step.no}</div>
            <div><div className="rh-checkout-step-name"><step.icon size={19} strokeWidth={1.6}/><h3>{step.label}</h3></div>
              <p>{step.description}</p></div>
            <span className="rh-checkout-step-state">{i===0?<Check size={18}/>:<LockKeyhole size={15}/>}</span>
          </article>)}
        </div>
        <Link className="rh-continue-shop" href="/versand-zahlung/">Versand, Zahlung & Widerruf ansehen ↗</Link>
        <Link className="rh-checkout-return" href="/warenkorb/">← ZURÜCK ZUM WARENKORB</Link>
      </section>
      <aside className="rh-checkout-summary">
        <div className="rh-checkout-summary-head"><div className="rh-eyebrow">DEINE AUSWAHL</div><h2>Zusammenfassung.</h2></div>
        {!loaded?<p role="status">Warenkorb wird geladen …</p>:
          !lines.length?<div className="rh-checkout-empty"><p>Du hast noch keine Extensions ausgewählt.</p>
            <Link href="/kollektionen/" className="rh-editorial-cta">KOLLEKTIONEN ENTDECKEN <ArrowUpRight size={17}/></Link></div>:
          error?<p role="alert">Die Produktpreise konnten nicht geprüft werden. Bitte gehe zum Warenkorb zurück und versuche es erneut.</p>:
          loading||!quote?<p role="status">Preise werden auf dem Server geprüft …</p>:
          <>
            <div className="rh-checkout-lines">
              {quote.lines.map(line=><div className="rh-checkout-line" key={line.id}>
                <div><strong>{line.productName||"Unbekanntes Produkt"}</strong>
                  <span>{line.color} · {line.length} · {line.quantity} ×</span>
                  {line.status!=="available"&&<small>
                    {line.status==="unverified-stock"?"Lagerbestand nicht bestätigt":
                    line.status==="out-of-stock"?"Diese Menge ist nicht verfügbar":"Variante nicht mehr verfügbar"}
                  </small>}
                </div>
                <b>{line.lineCents!==null?euros(line.lineCents/100):"Nicht verfügbar"}</b>
              </div>)}
            </div>
            <div className="rh-checkout-sum"><span>Artikelwert (unverbindlich)</span>
              <strong>{euros(quote.subtotalCents/100)}</strong></div>
            <div className="rh-checkout-sum"><span>Versand & Steuern</span><strong>Noch offen</strong></div>
            <p className="rh-checkout-policy">Alle Preise sind eine Vorschau. Es gibt noch keinen endgültigen Gesamtpreis oder eine zahlungspflichtige Bestellung.</p>
          </>}
        <Link className="rh-checkout-help" href="/kontakt/">Fragen zu deiner Auswahl? Beratung anfragen ↗</Link>
      </aside>
    </div>
  </div>;
}
