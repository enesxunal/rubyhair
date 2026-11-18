"use client";
import Link from "next/link";
import {useState} from "react";
import type {CheckoutAddressData} from "./checkout-address-preview";
import CustomerPaymentSubmit from "./customer-payment-submit";
import {Check,Truck,Wallet,ArrowUpRight,ShoppingBag} from "lucide-react";
import {useCart} from "@/components/cart-context";
import {useCartQuote} from "@/hooks/use-cart-quote";
import {euros} from "@/lib/catalog";
import CheckoutAddressPreview from "./checkout-address-preview";
import LiveVariantTestSection,{type LiveVariantTestView} from "./live-variant-test-section";

const process=[
  {no:"01",label:"Warenkorb",description:"Produkte, Farbe und Menge prüfen",icon:ShoppingBag},
  {no:"02",label:"Lieferung",description:"Liefer- und Rechnungsadresse eingeben",icon:Truck},
  {no:"03",label:"Zahlung",description:"Zahlungsart und Bestellübersicht",icon:Wallet}
];
export default function CheckoutPreview({liveTest,checkoutMode="disabled",shippingCents=499}:{liveTest?:LiveVariantTestView|null;checkoutMode?:"disabled"|"admin_test"|"public"|"klarna_public";shippingCents?:number}){
  const {lines,loaded}=useCart();
  const {quote,error,loading}=useCartQuote(lines);
  const [paymentMethod,setPaymentMethod]=useState<"paypal"|"klarna">(checkoutMode==="klarna_public"?"klarna":"paypal");
  const [validatedAddress,setValidatedAddress]=useState<CheckoutAddressData|null>(null);
  const oneEuroCart=Boolean(loaded&&lines.length===1&&lines[0].id===886&&lines[0].quantity===1&&
    quote&&quote.subtotalCents===100&&quote.lines.length===1);
  const payableTestCart=Boolean(oneEuroCart&&!error&&!loading&&!quote?.needsReview&&quote?.lines[0]?.status==="available");
  return <div className="rh-checkout-v2 rh-shell">
    <nav className="rh-breadcrumb" aria-label="Breadcrumb">
      <Link href="/">Startseite</Link><span>/</span>
      <Link href="/warenkorb/">Warenkorb</Link><span>/</span><span>Kasse</span>
    </nav>
    <div className="rh-eyebrow">RUBY HAIR / CHECKOUT</div>
    <h1>Almost <em>yours.</em></h1>
    <div className="rh-checkout-grid">
      <section className="rh-checkout-process">
        <h2>Dein Einkauf.</h2>
        <p>Prüfe deine Auswahl und die Lieferadresse.</p>
        <div className="rh-checkout-steps">
          {process.map((step,i)=><article key={step.no}>
            <div className="rh-checkout-number">{step.no}</div>
            <div><div className="rh-checkout-step-name"><step.icon size={19} strokeWidth={1.6}/><h3>{step.label}</h3></div>
              <p>{step.description}</p></div>
            <span className="rh-checkout-step-state">{i===0?<Check size={18}/>:<span aria-hidden="true">{step.no}</span>}</span>
          </article>)}
        </div>
        {loaded&&lines.length>0&&<CheckoutAddressPreview onValidated={setValidatedAddress}/>}
        <section className="rh-checkout-payment-preview" aria-label="Zahlungsart auswählen">
          <h3>03 / ZAHLUNG</h3>
          <p className="rh-payment-preview-heading">Wähle deine Zahlungsart</p>
          <div className="rh-payment-select" role="radiogroup" aria-label="Zahlungsart">
            {checkoutMode!=="klarna_public"&&<label className={"rh-payment-choice"+(paymentMethod==="paypal"?" is-selected":"")}>
              <input type="radio" name="checkout-payment-method" value="paypal"
                checked={paymentMethod==="paypal"} onChange={()=>setPaymentMethod("paypal")}/>
              <span><strong>PayPal</strong><small>PayPal oder Karte bei Verfügbarkeit</small></span>
            </label>}
            <label className={"rh-payment-choice"+(paymentMethod==="klarna"?" is-selected":"")}>
              <input type="radio" name="checkout-payment-method" value="klarna"
                checked={paymentMethod==="klarna"} onChange={()=>setPaymentMethod("klarna")}/>
              <span><strong>Klarna</strong><small>{checkoutMode!=="disabled"?"Zahlung bei Versand":"Noch nicht freigeschaltet"}</small></span>
            </label>
          </div>
          {paymentMethod==="paypal"&&liveTest&&<LiveVariantTestSection state={liveTest} cartReady={payableTestCart}/>}
          {paymentMethod==="paypal"&&!liveTest&&oneEuroCart&&<div className="rh-payment-action-area">
            <p>Der 1,00-€-Live-Test dieses Artikels ist ausschließlich über den geschützten Administratorzugang möglich.</p>
            <Link className="rh-payment-primary-link" href="/admin/login?next=live-checkout">
              Mit Admin-Konto anmelden und PayPal testen
            </Link>
          </div>}
          {checkoutMode!=="disabled"&&!liveTest&&paymentMethod==="paypal"&&
            <CustomerPaymentSubmit method={paymentMethod} lines={lines} address={validatedAddress} cartReady={Boolean(quote&&!quote.needsReview&&!loading&&!error&&lines.length)} totalCents={(quote?.subtotalCents||0)+shippingCents}/>}
          {checkoutMode==="disabled"&&paymentMethod==="paypal"&&!liveTest&&!oneEuroCart&&<div className="rh-payment-action-area">
            <p>Die letzte Freigabe für den regulären Kauf steht noch aus. Bis dahin wird keine Bestellung ausgelöst.</p>
          </div>}
          {paymentMethod==="klarna"&&checkoutMode!=="disabled"&&!liveTest&&
            <CustomerPaymentSubmit method={paymentMethod} lines={lines} address={validatedAddress} cartReady={Boolean(quote&&!quote.needsReview&&!loading&&!error&&lines.length)} totalCents={(quote?.subtotalCents||0)+shippingCents}/>}
          {paymentMethod==="klarna"&&(checkoutMode==="disabled"||!!liveTest)&&<div className="rh-payment-action-area" role="status">
            <p>Klarna ist für diesen Zahlungstest noch nicht freigegeben.</p>
            <button type="button" className="rh-payment-secondary-link" onClick={()=>setPaymentMethod("paypal")}>Stattdessen PayPal wählen</button>
          </div>}
        </section>
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
            <div className="rh-checkout-sum"><span>Artikelwert</span>
              <strong>{euros(quote.subtotalCents/100)}</strong></div>
            {liveTest?<><div className="rh-checkout-sum"><span>Versand (interner Test)</span><strong>{euros(0)}</strong></div>
              <div className="rh-checkout-sum"><span>Inkl. 19 % MwSt.</span><strong>{euros(0.16)}</strong></div>
              <div className="rh-checkout-sum"><span>Gesamtbetrag</span><strong>{euros(quote.subtotalCents/100)}</strong></div></>:
              <><div className="rh-checkout-sum"><span>DHL Versand Deutschland</span><strong>{euros(shippingCents/100)}</strong></div>
              <div className="rh-checkout-sum"><span>Enthaltene 19 % USt.</span><strong>{euros(Math.round((quote.subtotalCents+shippingCents)*19/119)/100)}</strong></div>
              <div className="rh-checkout-sum"><span>Gesamtbetrag</span><strong>{euros((quote.subtotalCents+shippingCents)/100)}</strong></div></>}
          </>}
        <Link className="rh-checkout-help" href="/kontakt/">Fragen zu deiner Auswahl? Beratung anfragen ↗</Link>
      </aside>
    </div>
  </div>;
}
