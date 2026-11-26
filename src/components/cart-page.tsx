"use client";
import Link from "next/link";
import CartRecoveryForm from "@/components/cart-recovery-form";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart-context";
import {byVariation, euros, type Product} from "@/lib/catalog";
import {useCartQuote} from "@/hooks/use-cart-quote";
import {Gift} from "lucide-react";
import {giftCartTotal} from "@/lib/gift-cards/cart-schema";
export function CartPage({shippingCents,recoveryEnabled=false}:{shippingCents:number;recoveryEnabled?:boolean}){
  const {lines,gifts,update,remove,removeGift,clear,loaded,couponCode,setCouponCode}=useCart();
  const [couponDraft,setCouponDraft]=useState("");
  useEffect(()=>{setCouponDraft(couponCode)},[couponCode]);
  const [liveProducts,setLiveProducts]=useState<Product[]|null>(null);
  const [catalogError,setCatalogError]=useState(false);
  const {quote:currentQuote,error:quoteError,loading:quoteLoading}=useCartQuote(lines,couponCode);
  useEffect(()=>{
    if(!lines.length)return;
    const controller=new AbortController();
    fetch("/api/catalog",{cache:"no-store",signal:controller.signal})
      .then(r=>{if(!r.ok)throw new Error("catalog offline");return r.json()})
      .then(data=>{if(!Array.isArray(data.products))throw new Error("Invalid catalog");setLiveProducts(data.products)})
      .catch(e=>{if(!controller.signal.aborted){console.warn("Cart catalog unavailable",e);setCatalogError(true)}});
    return ()=>controller.abort();
  },[]);
  const items=lines.map(line=>{
    let match=null;
    if(liveProducts){
      const product=liveProducts.find(p=>p.variations.some(v=>v.id===line.id));
      const variation=product?.variations.find(v=>v.id===line.id);
      if(product&&variation)match={product,variation};
    } else if(!catalogError){
      match=byVariation(line.id);
    }
    return {...line,match};
  }).filter(item=>item.match!==null);
  const giftTotal=giftCartTotal(gifts),physicalTotal=lines.length?currentQuote?.subtotalCents??null:0;
  const total=physicalTotal===null?null:physicalTotal+giftTotal;
  const shipping=lines.length?shippingCents:0;
  const canCheckout=gifts.length>0&&!lines.length||Boolean(currentQuote?.checkoutEnabled&&!quoteError&&!catalogError);

  const issues=currentQuote?.lines.filter(line=>line.status!=="available")||[];
  return <section className="rh-shell rh-cart-page">
    <div className="rh-eyebrow">RUBY HAIR / WARENKORB</div>
    <h1>Deine <em>Auswahl.</em></h1>
    <p className="rh-cart-notice">Prüfe deine ausgewählten Produkte und gehe anschließend zur Kasse.</p>
    {lines.length>0&&catalogError&&<p role="alert" className="rh-admin-error">Produktpreise sind gerade nicht verfügbar. Der Warenkorb ist vorübergehend nicht nutzbar.</p>}
    {lines.length>0&&quoteError&&<p role="alert" className="rh-admin-error">Der Server konnte den Warenkorb nicht prüfen. Bitte erneut versuchen.</p>}
    {!loaded?<div className="rh-empty-cart" role="status">Warenkorb wird geladen …</div>:
    items.length===0&&lines.length>0&&gifts.length===0?<div className="rh-empty-cart"><p>Deine gespeicherten Artikel sind im aktuellen Katalog nicht mehr verfügbar.</p><button type="button" className="rh-cart-reset" onClick={clear}>Alten Warenkorb leeren</button></div>:
    items.length===0&&gifts.length===0?<div className="rh-empty-cart"><p>Dein Warenkorb ist noch leer.</p>
      <Link className="rh-buy-button" href="/kollektionen/">EXTENSIONS ENTDECKEN <span>↗</span></Link></div>:
    <div className="rh-cart-layout">
      <div className="rh-cart-list">{items.map(item=>{
        const result=item.match!;
        return <article key={item.id} className="rh-cart-item">
          <img src={result.variation.image} alt={result.product.name+" Farbe "+result.variation.color_label}/>
          <div className="rh-cart-item-info"><Link href={"/produkt/"+result.product.slug+"/?farbe="+encodeURIComponent(result.variation.color)+"&laenge="+encodeURIComponent(result.variation.length)}>
            <strong>{result.product.name}</strong></Link>
            <p>Farbe {result.variation.color_label} · {result.variation.length_label}</p>
            {currentQuote?.lines.find(line=>line.id===item.id)?.status==="unverified-stock"&&
              <p className="rh-cart-line-status">Lagerbestand noch nicht bestätigt</p>}
            {currentQuote?.lines.find(line=>line.id===item.id)?.status==="out-of-stock"&&
              <p className="rh-cart-line-status rh-cart-line-problem">Diese Menge ist nicht verfügbar</p>}
            <p>
             {currentQuote?.lines.find(line=>line.id===item.id)?.unitCents!=null
              ?euros((currentQuote.lines.find(line=>line.id===item.id)!.unitCents!)/100)
              :"Preis wird geprüft"} / Packung
            </p>
            <div className="rh-cart-qty"><button onClick={()=>update(item.id,item.quantity-1)}
              aria-label="Menge verringern" type="button">−</button><span>{item.quantity}</span>
              <button onClick={()=>update(item.id,item.quantity+1)} aria-label="Menge erhöhen" type="button">+</button></div>
            <button className="rh-remove-item" type="button" onClick={()=>remove(item.id)}>Entfernen</button>
          </div>
          <strong className="rh-cart-item-price">{currentQuote?.lines.find(line=>line.id===item.id)?.lineCents!=null
            ?euros((currentQuote.lines.find(line=>line.id===item.id)!.lineCents!)/100)
            :"Wird geprüft"}</strong>
        </article>;
      })}
        {gifts.map(gift=><article key={gift.id} className="rh-cart-item rh-gift-cart-item">
          <div className={"rh-gift-cart-mini "+gift.theme}><Gift size={28}/><span>RUBY HAIR</span><strong>Geschenkgutschein</strong></div>
          <div className="rh-cart-item-info"><strong>Ruby Hair Geschenkgutschein</strong>
            <p>Für {gift.recipientName} · {gift.delivery==="email"?"Per E-Mail":"Digitales Bild"}</p>
            {gift.senderName&&<p>Von {gift.senderName}</p>}
            {gift.message&&<p className="rh-gift-cart-message">„{gift.message}“</p>}
            <button className="rh-remove-item" type="button" onClick={()=>removeGift(gift.id)}>Gutschein entfernen</button>
          </div><strong className="rh-cart-item-price">{euros(gift.amountCents/100)}</strong>
        </article>)}
        <button type="button" className="rh-remove-item" onClick={clear}>Warenkorb leeren</button>
      </div>
      <aside className="rh-order-summary"><h2>Zusammenfassung</h2>
        <p className="rh-cart-checking" aria-live="polite">{quoteLoading?"Preise werden auf dem Server geprüft":currentQuote?"Preisprüfung abgeschlossen":gifts.length&&!lines.length?"Digitale Gutscheine · keine Versandkosten":quoteError?"Preisprüfung derzeit nicht möglich":""}</p>
        {lines.length>0&&<div><span>Produkte</span><strong>{currentQuote?euros(currentQuote.regularSubtotalCents/100):"Wird geprüft"}</strong></div>}
        {lines.length>0&&<section className="rh-bf-coupon-box" aria-label="Black Friday Rabattcode">
          <label htmlFor="rh-bf-coupon">Black Friday Rabattcode</label>
          <div className="rh-bf-coupon-row">
            <input id="rh-bf-coupon" type="text" autoComplete="off" maxLength={32} placeholder="BLACKFRIDAY" value={couponDraft} onChange={e=>setCouponDraft(e.target.value.toUpperCase())} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();setCouponCode(couponDraft)}}}/>
            <button type="button" onClick={()=>setCouponCode(couponDraft)} disabled={!couponDraft.trim()}>Einlösen</button>
          </div>
          {couponCode&&<div className="rh-bf-coupon-status" role="status">
            {currentQuote?.couponApplied?"BLACKFRIDAY eingelöst – 15 % auf Extensions.":
              currentQuote?.couponError?"Code ungültig oder Aktion abgelaufen. Bitte entfernen.":
              quoteLoading?"Rabatt wird geprüft …":"Rabatt konnte nicht bestätigt werden."}
            <button type="button" onClick={()=>{setCouponCode("");setCouponDraft("")}}>Entfernen</button>
          </div>}
        </section>}
        {(currentQuote?.discountCents??0)>0&&<div className="rh-bf-coupon-discount"><span>BLACKFRIDAY · 15 %</span><strong>− {euros((currentQuote?.discountCents??0)/100)}</strong></div>}
        {gifts.length>0&&<div><span>Geschenkgutscheine ({gifts.length})</span><strong>{euros(giftTotal/100)}</strong></div>}
        <div><span>{lines.length?"DHL-Versand innerhalb Deutschlands":"Digitaler Versand"}</span><strong>{lines.length?euros(shipping/100):"Kostenlos"}</strong></div>
        {lines.length>0&&<Link className="rh-cart-shipping-link" href="/versand-zahlung/">Informationen zu Versand & Zahlung ↗</Link>}
        <div><span>Gesamt inkl. Versand</span><strong>{total===null?"Wird geprüft":euros((total+shipping)/100)}</strong></div>
        {currentQuote&&<p className="rh-quote-source">{currentQuote.source==="postgresql"?"Die Preise werden beim Bestellabschluss erneut geprüft.":"Die Preisprüfung ist derzeit eingeschränkt; bitte versuche es später erneut."}</p>}
        {issues.length>0&&<p role="status" className="rh-cart-stock-warning">{issues.some(x=>x.status==="unverified-stock")?"Der physische Lagerbestand ist nicht bestätigt. ":""}
          {issues.some(x=>x.status==="out-of-stock")?"Einige Artikel sind nicht oder nicht in der gewünschten Menge verfügbar. ":""}
          {issues.some(x=>x.status==="unknown-variation")?"Ein Produkt ist nicht mehr im Katalog. ":""}
        </p>}
        <div className="rh-gift-cart-upsell"><Gift size={25}/><p><strong>Schönheit zum Verschenken.</strong><span>Möchtest du auch jemandem eine Freude machen?</span></p>
          <Link href="/geschenkgutschein/">Geschenkgutschein gestalten ↗</Link>
        </div>
        <p>Im nächsten Schritt kannst du deine Rechnungsadresse eingeben und {gifts.length?"alle Produkte und Gutscheine gemeinsam sicher mit PayPal bezahlen":"sicher mit PayPal oder Klarna bezahlen"}.</p>
        {canCheckout?<Link className="rh-buy-button" href="/kasse/">ZUR KASSE<span>↗</span></Link>:<span className="rh-buy-button" aria-disabled="true" style={{opacity:.5,cursor:"not-allowed"}}>{quoteLoading?"BESTAND WIRD GEPRÜFT":"NICHT BESTELLBAR"}</span>}
        <Link className="rh-continue-shop" href="/kollektionen/">Weiter einkaufen</Link>
        {recoveryEnabled&&canCheckout&&lines.length>0&&!gifts.length&&<CartRecoveryForm lines={lines}/>}
      </aside>
    </div>}
  </section>;
}
