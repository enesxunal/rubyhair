"use client";
import Link from "next/link";
import {reportCheckoutDiagnostic} from "@/lib/checkout-diagnostics-client";
import {useEffect,useRef,useState,type ReactNode} from "react";
import {giftCartTotal} from "@/lib/gift-cards/cart-schema";
import type {CheckoutAddressData} from "./checkout-address-preview";
import CustomerPaymentSubmit from "./customer-payment-submit";
import PayPalCardFieldsCheckout from "./paypal-card-fields-checkout";
import PayPalWalletCheckout from "./paypal-wallet-checkout";
import {Check,Truck,Wallet,ArrowUpRight,ShoppingBag,Gift} from "lucide-react";
import {useCart} from "@/components/cart-context";
import {useCartQuote} from "@/hooks/use-cart-quote";
import {euros} from "@/lib/catalog";
import CheckoutAddressPreview from "./checkout-address-preview";
import LiveVariantTestSection,{type LiveVariantTestView} from "./live-variant-test-section";

const checkoutSteps=[
  {no:"01",label:"Warenkorb",description:"Produkte, Farbe und Menge prüfen",icon:ShoppingBag},
  {no:"02",label:"Lieferung / Rechnung",description:"Liefer- und Rechnungsadresse prüfen",icon:Truck},
  {no:"03",label:"Zahlung",description:"Zahlungsart und Bestellübersicht",icon:Wallet}
];
type PaymentChoice="paypal"|"card"|"klarna"|"apple_pay"|"google_pay";
function PaymentRow({name,description,logos,selected,onSelect,children}:{name:string;description:string;logos:{src:string;alt:string}[];selected:boolean;onSelect:()=>void;children:ReactNode}){
 return <div className="rh-payment-row" data-selected={selected}>
  <button type="button" className="rh-payment-row-select" aria-expanded={selected} onClick={onSelect}>
   <span className="rh-payment-row-radio" aria-hidden="true"/><span className="rh-payment-row-copy"><strong>{name}</strong><small>{description}</small></span>
   <span className="rh-payment-row-marks">{logos.map(logo=><img key={logo.alt} src={logo.src} alt={logo.alt}/>)}</span>
  </button><div className="rh-payment-row-panel" hidden={!selected}>{children}</div>
 </div>;
}
export default function CheckoutPreview({liveTest,checkoutMode="disabled",shippingCents=499,cardFieldsEnabled=false,applePayEnabled=false,googlePayEnabled=false}:{liveTest?:LiveVariantTestView|null;checkoutMode?:"disabled"|"admin_test"|"public"|"klarna_public"|"payments_public";shippingCents?:number;cardFieldsEnabled?:boolean;applePayEnabled?:boolean;googlePayEnabled?:boolean}){
  const {lines,gifts,loaded,couponCode}=useCart();
  const {quote,error,loading}=useCartQuote(lines,couponCode);
  const digitalOnly=!lines.length&&gifts.length>0,hasItems=lines.length>0||gifts.length>0;
  const giftSoldCents=giftCartTotal(gifts);
  const shipping=lines.length?shippingCents:0;
  const physicalCents=quote?.subtotalCents||0;
  const grossCents=physicalCents+giftSoldCents+shipping;
  const canPay=Boolean(hasItems&&!error&&!loading&&(!lines.length||quote&&!quote.needsReview));
  const paymentBlocker=!loaded?"Warenkorb wird geladen. Bitte kurz warten.":
    !hasItems?"Der Warenkorb ist leer.":
    error?"Die Preisprüfung ist nicht erreichbar. Bitte die Seite neu laden.":
    loading?"Die Preise und der Lagerbestand werden geprüft.":
    quote?.couponError?"Der Rabattcode ist ungültig. Bitte im Warenkorb entfernen.":
    quote?.lines.some(line=>line.status==="out-of-stock")?"Ein Artikel ist nicht in der gewünschten Menge verfügbar. Bitte Warenkorb prüfen.":
    quote?.lines.some(line=>line.status==="unknown-variation")?"Ein Artikel ist nicht mehr verfügbar. Bitte Warenkorb prüfen.":
    quote?.needsReview?"Ein Artikel muss vor der Zahlung geprüft werden. Bitte Warenkorb prüfen.":null;
  const paymentAttempt=useRef(false);
  const claimPayment=()=>{if(paymentAttempt.current)return false;paymentAttempt.current=true;return true};
  const releasePayment=()=>{paymentAttempt.current=false};
  const [paymentConsent,setPaymentConsent]=useState(false);
  const [paymentChoice,setPaymentChoice]=useState<PaymentChoice>(checkoutMode==="klarna_public"?"klarna":"paypal");
  const [validatedAddress,setValidatedAddress]=useState<CheckoutAddressData|null>(null);
  const [giftInput,setGiftInput]=useState("");
  const [appliedGift,setAppliedGift]=useState<{code:string;balanceCents:number}|null>(null);
  const [giftError,setGiftError]=useState("");
  const [giftLoading,setGiftLoading]=useState(false);
  const verifyGift=async()=>{
   setGiftError("");setAppliedGift(null);setGiftLoading(true);
   try{
    const res=await fetch("/api/gutschein/guthaben",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:giftInput.trim()}),cache:"no-store"});
    if(!res.ok)throw Error("GIFT_UNAVAILABLE");
    const payload=await res.json();
    if(!Number.isInteger(payload.balanceCents)||payload.balanceCents<=0)throw Error("GIFT_EMPTY");
    setAppliedGift({code:giftInput.trim().toUpperCase(),balanceCents:payload.balanceCents});
   }catch{setGiftError("Der Gutscheincode ist ungültig, aufgebraucht oder derzeit nicht verfügbar.")}
   finally{setGiftLoading(false)}
  };
  const giftUsed=appliedGift&&!gifts.length?Math.min(appliedGift.balanceCents,grossCents):0;
  const remainingCents=Math.max(0,grossCents-giftUsed);
  const oneEuroCart=Boolean(loaded&&!gifts.length&&lines.length===1&&lines[0].id===886&&lines[0].quantity===1&&
    quote&&quote.subtotalCents===100&&quote.lines.length===1);
  const payableTestCart=Boolean(oneEuroCart&&!error&&!loading&&!quote?.needsReview&&quote?.lines[0]?.status==="available");
  const regularCheckout=checkoutMode!=="disabled"&&!liveTest&&!oneEuroCart;
  const cardAvailable=regularCheckout&&checkoutMode!=="klarna_public"&&cardFieldsEnabled&&lines.length>0&&!gifts.length&&!appliedGift&&remainingCents>0;
  const walletsAvailable=Boolean((applePayEnabled||googlePayEnabled)&&checkoutMode!=="klarna_public"&&lines.length>0&&!gifts.length&&!appliedGift&&remainingCents>0);
  const effectiveChoice=(paymentChoice==="card"&&!cardAvailable)||(paymentChoice==="klarna"&&(gifts.length>0||appliedGift))||((paymentChoice==="apple_pay"||paymentChoice==="google_pay")&&!walletsAvailable)?(checkoutMode==="klarna_public"?"klarna":"paypal"):paymentChoice;
  useEffect(()=>{
   if(!regularCheckout||!loaded||!hasItems||loading)return;
   if(error)reportCheckoutDiagnostic("unknown","cart","CART_PRICE_UNAVAILABLE");
   else if(quote?.couponError)reportCheckoutDiagnostic("unknown","cart","CART_COUPON_INVALID");
   else if(quote?.lines.some(l=>l.status==="out-of-stock"))reportCheckoutDiagnostic("unknown","cart","CART_STOCK_UNAVAILABLE");
   else if(quote?.needsReview)reportCheckoutDiagnostic("unknown","cart","CART_REVIEW_REQUIRED");
  },[regularCheckout,loaded,hasItems,loading,error,quote]);
  return <div className="rh-checkout-v2 rh-shell">
    <nav className="rh-breadcrumb" aria-label="Breadcrumb">
      <Link href="/">Startseite</Link><span>/</span>
      <Link href="/warenkorb/">Warenkorb</Link><span>/</span><span>Kasse</span>
    </nav>
    <div className="rh-eyebrow">RUBY HAIR / CHECKOUT</div>
    <p className="rh-checkout-account-note">Du kannst ohne Registrierung bestellen. <Link href="/konto/anmelden/">Optionales Kundenkonto erstellen</Link> – für Bestellungen, Rechnungen und Versandstatus.</p>
    <h1>Almost <em>yours.</em></h1>
    <div className="rh-checkout-grid">
      <section className="rh-checkout-process">
        <h2>Dein Einkauf.</h2>
        <p>{digitalOnly?"Prüfe deine Gutscheine und die Rechnungsdaten. Es gibt keinen Paketversand.":"Prüfe deine Auswahl und die Lieferadresse."}</p>
        <div className="rh-checkout-steps">
          {checkoutSteps.map((step,i)=><article key={step.no}>
            <div className="rh-checkout-number">{step.no}</div>
            <div><div className="rh-checkout-step-name"><step.icon size={19} strokeWidth={1.6}/><h3>{step.label}</h3></div>
              <p>{step.description}</p></div>
            <span className="rh-checkout-step-state">{i===0?<Check size={18}/>:<span aria-hidden="true">{step.no}</span>}</span>
          </article>)}
        </div>
        {loaded&&hasItems&&<CheckoutAddressPreview onValidated={setValidatedAddress} digitalOnly={digitalOnly}/>}
        {loaded&&lines.length>0&&!gifts.length&&<section className="rh-gift-redeem-box" aria-label="Geschenkgutschein einlösen">
         <div className="rh-gift-redeem-heading"><Gift size={21}/><div><span>GESCHENKGUTSCHEIN</span><h3>Du hast einen Gutschein?</h3></div></div>
         <p>Gib deinen Ruby Hair Gutscheincode ein. Das Guthaben wird vor der Zahlung verrechnet.</p>
         <div className="rh-gift-redeem-row"><input aria-label="Gutscheincode" placeholder="RH-XXXX-XXXX-XXXX-XXXX-XXXX" value={giftInput} maxLength={45} onChange={e=>{setGiftInput(e.target.value);setAppliedGift(null);setGiftError("")}}/>
         <button type="button" onClick={verifyGift} disabled={!giftInput.trim()||giftLoading}>{giftLoading?"Prüfen …":"Einlösen"}</button></div>
         {giftError&&<p role="alert" className="rh-gift-form-error">{giftError}</p>}
         {appliedGift&&<p className="rh-gift-applied" role="status">Gutschein erkannt: {euros(appliedGift.balanceCents/100)} verfügbar. Angerechnet werden {euros(giftUsed/100)}.</p>}
        </section>}
        <section className="rh-checkout-payment-preview" aria-label="Zahlungsart auswählen">
          <h3>03 / ZAHLUNG</h3>
          <p className="rh-payment-preview-heading">{gifts.length?"Gemeinsame Zahlung für Waren und Gutscheine mit PayPal":"Wähle deine Zahlungsart"}</p>
          {!canPay&&paymentBlocker&&<p className="rh-checkout-unavailable-note" role={loading?"status":"alert"}>{paymentBlocker}</p>}
          {appliedGift&&<p className="rh-gift-only-paypal-note">Bei Gutscheinzahlung steht PayPal für einen möglichen Restbetrag zur Verfügung. Ist alles gedeckt, erfolgt keine weitere Zahlung.</p>}
          {checkoutMode!=="disabled"&&!liveTest&&<div className="rh-unified-payment-consent">
            {!validatedAddress&&<p className="rh-checkout-unavailable-note" role="status">Bitte zuerst oben deine {digitalOnly?"Rechnungsadresse":"Liefer- und Rechnungsadresse"} vollständig ausfüllen.</p>}
            <label><input type="checkbox" checked={paymentConsent} onChange={e=>setPaymentConsent(e.target.checked)} required/>
              <span>Ich habe die <a href="/rechtliches/agb/" target="_blank" rel="noopener noreferrer">AGB</a> und die <a href="/rechtliches/widerruf/" target="_blank" rel="noopener noreferrer">Widerrufsbelehrung</a> gelesen und bestätige den kostenpflichtigen Kauf.</span>
            </label>
          </div>}
          <div className="rh-unified-payment-actions rh-stacked-payment-actions">
          {liveTest&&<LiveVariantTestSection state={liveTest} cartReady={payableTestCart}/>}
          {!liveTest&&oneEuroCart&&<div className="rh-payment-action-area">
            <p>Der 1,00-€-Live-Test dieses Artikels ist ausschließlich über den geschützten Administratorzugang möglich.</p>
            <Link className="rh-payment-primary-link" href="/admin/login?next=live-checkout">Mit Admin-Konto anmelden und PayPal testen</Link>
          </div>}
          {checkoutMode==="disabled"&&!liveTest&&!oneEuroCart&&<div className="rh-payment-action-area"><p>Die letzte Freigabe für den regulären Kauf steht noch aus. Bis dahin wird keine Bestellung ausgelöst.</p></div>}
          {regularCheckout&&<div className="rh-payment-method-list" aria-label="Zahlungsarten">
            {checkoutMode!=="klarna_public"&&<PaymentRow name="PayPal" description="Sicher mit PayPal bezahlen" logos={[{src:"/assets/payment-brands/paypal-wordmark.svg",alt:"PayPal"}]} selected={effectiveChoice==="paypal"} onSelect={()=>setPaymentChoice("paypal")}>
              <CustomerPaymentSubmit agreed={paymentConsent} claimPayment={claimPayment} releasePayment={releasePayment} method="paypal" lines={lines} gifts={gifts} address={validatedAddress} cartReady={canPay} totalCents={remainingCents} giftCode={gifts.length?undefined:appliedGift?.code} couponCode={lines.length?couponCode||undefined:undefined}/>
            </PaymentRow>}
            {cardAvailable&&<PaymentRow name="Kredit- / Debitkarte" description="Visa, Mastercard oder American Express" logos={[{src:"/assets/payment-brands/visa.svg",alt:"Visa"},{src:"/assets/payment-brands/reference/master.svg",alt:"Mastercard"},{src:"/assets/payment-brands/reference/american_express.svg",alt:"American Express"}]} selected={effectiveChoice==="card"} onSelect={()=>setPaymentChoice("card")}>
              <PayPalCardFieldsCheckout agreed={paymentConsent} claimPayment={claimPayment} releasePayment={releasePayment} lines={lines} address={validatedAddress} cartReady={canPay} totalCents={remainingCents} couponCode={couponCode||undefined}/>
            </PaymentRow>}
            {!gifts.length&&!appliedGift&&<PaymentRow name="Klarna" description="Zahlung mit Klarna" logos={[{src:"/assets/payment-brands/reference/klarna.svg",alt:"Klarna"}]} selected={effectiveChoice==="klarna"} onSelect={()=>setPaymentChoice("klarna")}>
              <CustomerPaymentSubmit agreed={paymentConsent} claimPayment={claimPayment} releasePayment={releasePayment} method="klarna" lines={lines} address={validatedAddress} cartReady={canPay} totalCents={remainingCents} couponCode={couponCode||undefined}/>
            </PaymentRow>}
            {(applePayEnabled||googlePayEnabled)&&checkoutMode!=="klarna_public"&&lines.length>0&&!gifts.length&&!appliedGift&&remainingCents>0&&<PayPalWalletCheckout accepted={paymentConsent} claimPayment={claimPayment} releasePayment={releasePayment} lines={lines} address={validatedAddress} cartReady={canPay} totalCents={remainingCents} couponCode={couponCode||undefined} appleEnabled={applePayEnabled} googleEnabled={googlePayEnabled} chosenWallet={effectiveChoice==="apple_pay"||effectiveChoice==="google_pay"?effectiveChoice:null} onSelectWallet={setPaymentChoice}/>}
          </div>}
          </div>
        </section>
        <div className="rh-gift-checkout-upsell"><Gift size={22}/><div><strong>Auch einer Freundin eine Freude machen?</strong><p>Verschenke Beauty mit einem persönlichen Ruby Hair Geschenkgutschein.</p><Link href="/geschenkgutschein/">Gutschein gestalten ↗</Link></div></div>
        <Link className="rh-continue-shop" href="/versand-zahlung/">Versand, Zahlung & Widerruf ansehen ↗</Link>
        <Link className="rh-checkout-return" href="/warenkorb/">← ZURÜCK ZUM WARENKORB</Link>
      </section>
      <aside className="rh-checkout-summary">
        <div className="rh-checkout-summary-head"><div className="rh-eyebrow">DEINE AUSWAHL</div><h2>Zusammenfassung.</h2></div>
        {!loaded?<p role="status">Warenkorb wird geladen …</p>:
          !hasItems?<div className="rh-checkout-empty"><p>Dein Warenkorb ist noch leer.</p>
            <Link href="/kollektionen/" className="rh-editorial-cta">KOLLEKTIONEN ENTDECKEN <ArrowUpRight size={17}/></Link></div>:
          error?<p role="alert">Die Produktpreise konnten nicht geprüft werden. Bitte gehe zum Warenkorb zurück und versuche es erneut.</p>:
          lines.length&&(loading||!quote)?<p role="status">Preise werden auf dem Server geprüft …</p>:
          <>
            <div className="rh-checkout-lines">
              {(quote?.lines||[]).map(line=><div className="rh-checkout-line" key={line.id}>
                <div><strong>{line.productName||"Unbekanntes Produkt"}</strong>
                  <span>{line.color} · {line.length} · {line.quantity} ×</span>
                  {line.status!=="available"&&<small>
                    {line.status==="unverified-stock"?"Lagerbestand nicht bestätigt":
                    line.status==="out-of-stock"?"Diese Menge ist nicht verfügbar":"Variante nicht mehr verfügbar"}
                  </small>}
                </div>
                <b>{line.lineCents!==null?euros(line.lineCents/100):"Nicht verfügbar"}</b>
              </div>)}
              {gifts.map(gift=><div className="rh-checkout-line" key={gift.id}>
               <div><strong>Ruby Hair Geschenkgutschein</strong>
                 <span>Für {gift.recipientName} · {gift.delivery==="email"?"E-Mail":"Digitales Bild"}</span>
               </div><b>{euros(gift.amountCents/100)}</b>
              </div>)}
            </div>
            {lines.length>0&&<div className="rh-checkout-sum"><span>Artikelwert</span>
              <strong>{euros((quote?.regularSubtotalCents??0)/100)}</strong></div>}
            {(quote?.discountCents??0)>0&&<div className="rh-checkout-sum rh-bf-coupon-discount"><span>BLACKFRIDAY · 15 % Rabatt</span><strong>− {euros((quote?.discountCents??0)/100)}</strong></div>}
            {quote?.couponError&&<p role="alert">Black Friday Code ungültig oder abgelaufen. Bitte im Warenkorb entfernen.</p>}
            {gifts.length>0&&<div className="rh-checkout-sum"><span>Geschenkgutscheine</span><strong>{euros(giftSoldCents/100)}</strong></div>}
            {liveTest?<><div className="rh-checkout-sum"><span>Versand (interner Test)</span><strong>{euros(0)}</strong></div>
              <div className="rh-checkout-sum"><span>Inkl. 19 % MwSt.</span><strong>{euros(0.16)}</strong></div>
              <div className="rh-checkout-sum"><span>Gesamtbetrag</span><strong>{euros(grossCents/100)}</strong></div></>:
              <><div className="rh-checkout-sum"><span>{lines.length?"DHL Versand Deutschland":"Digitaler Versand"}</span><strong>{shipping?euros(shipping/100):"Kostenlos"}</strong></div>
              <div className="rh-checkout-sum"><span>Enthaltene 19 % USt.</span><strong>{euros(Math.round(grossCents*19/119)/100)}</strong></div>
              <div className="rh-checkout-sum"><span>Gesamtbetrag</span><strong>{euros(grossCents/100)}</strong></div>
              {appliedGift&&<><div className="rh-checkout-sum rh-gift-summary-deduction"><span>Geschenkgutschein</span><strong>- {euros(giftUsed/100)}</strong></div>
                <div className="rh-checkout-sum rh-gift-summary-remaining"><span>Noch zu zahlen</span><strong>{euros(remainingCents/100)}</strong></div></>}
              </>}
          </>}
        <Link className="rh-checkout-help" href="/kontakt/">Fragen zu deiner Auswahl? Beratung anfragen ↗</Link>
      </aside>
    </div>
  </div>;
}
