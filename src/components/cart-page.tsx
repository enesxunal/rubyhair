"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart-context";
import {byVariation, euros, type Product} from "@/lib/catalog";
import {useCartQuote} from "@/hooks/use-cart-quote";
import {Gift} from "lucide-react";
export function CartPage({shippingCents}:{shippingCents:number}){
  const {lines,update,remove,clear,loaded}=useCart();
  const [liveProducts,setLiveProducts]=useState<Product[]|null>(null);
  const [catalogError,setCatalogError]=useState(false);
  const {quote:currentQuote,error:quoteError,loading:quoteLoading}=useCartQuote(lines);
  useEffect(()=>{
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
  const total=currentQuote?.subtotalCents??null;
  const issues=currentQuote?.lines.filter(line=>line.status!=="available")||[];
  return <section className="rh-shell rh-cart-page">
    <div className="rh-eyebrow">RUBY HAIR / WARENKORB</div>
    <h1>Deine <em>Auswahl.</em></h1>
    <p className="rh-cart-notice">Prüfe deine ausgewählten Produkte und gehe anschließend zur Kasse.</p>
    {catalogError&&<p role="alert" className="rh-admin-error">Produktpreise sind gerade nicht verfügbar. Der Warenkorb ist vorübergehend nicht nutzbar.</p>}
    {quoteError&&<p role="alert" className="rh-admin-error">Der Server konnte den Warenkorb nicht prüfen. Bitte erneut versuchen.</p>}
    {!loaded?<div className="rh-empty-cart" role="status">Warenkorb wird geladen …</div>:
    items.length===0&&lines.length>0?<div className="rh-empty-cart"><p>Deine gespeicherten Artikel sind im aktuellen Katalog nicht mehr verfügbar.</p><button type="button" className="rh-cart-reset" onClick={clear}>Alten Warenkorb leeren</button></div>:
    items.length===0?<div className="rh-empty-cart"><p>Dein Warenkorb ist noch leer.</p>
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
            <p>{currentQuote?.lines.find(line=>line.id===item.id)?.unitCents!=null
              ?euros((currentQuote.lines.find(line=>line.id===item.id)!.unitCents!)/100)
              :"Preis wird geprüft"} / Packung</p>
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
        <button type="button" className="rh-remove-item" onClick={clear}>Warenkorb leeren</button>
      </div>
      <aside className="rh-order-summary"><h2>Zusammenfassung</h2>
        <p className="rh-cart-checking" aria-live="polite">{quoteLoading?"Preise werden auf dem Server geprüft":currentQuote?"Preisprüfung abgeschlossen":quoteError?"Preisprüfung derzeit nicht möglich":""}</p>
        <div><span>Zwischensumme (serverseitig)</span><strong>{total===null?"Wird geprüft":euros(total/100)}</strong></div>
        <div><span>DHL-Versand innerhalb Deutschlands</span><strong>{euros(shippingCents/100)}</strong></div>
        <Link className="rh-cart-shipping-link" href="/versand-zahlung/">Informationen zu Versand & Zahlung ↗</Link>
        <div><span>Gesamt inkl. Versand</span><strong>{total===null?"Wird geprüft":euros((total+shippingCents)/100)}</strong></div>
        {currentQuote&&<p className="rh-quote-source">{currentQuote.source==="postgresql"?"Die Preise werden beim Bestellabschluss erneut geprüft.":"Die Preisprüfung ist derzeit eingeschränkt; bitte versuche es später erneut."}</p>}
        {issues.length>0&&<p role="status" className="rh-cart-stock-warning">{issues.some(x=>x.status==="unverified-stock")?"Der physische Lagerbestand ist nicht bestätigt. ":""}
          {issues.some(x=>x.status==="out-of-stock")?"Einige Artikel sind nicht oder nicht in der gewünschten Menge verfügbar. ":""}
          {issues.some(x=>x.status==="unknown-variation")?"Ein Produkt ist nicht mehr im Katalog. ":""}
        </p>}
        <div className="rh-gift-cart-upsell"><Gift size={25}/><p><strong>Schönheit zum Verschenken.</strong><span>Möchtest du auch jemandem eine Freude machen?</span></p>
          <Link href="/geschenkgutschein/">Geschenkgutschein gestalten ↗</Link>
        </div>
        <p>Im nächsten Schritt kannst du deine Adresse eingeben und sicher mit PayPal oder Klarna bezahlen.</p>
        {currentQuote?.checkoutEnabled&&!quoteError&&!catalogError?<Link className="rh-buy-button" href="/kasse/">ZUR KASSE<span>↗</span></Link>:<span className="rh-buy-button" aria-disabled="true" style={{opacity:.5,cursor:"not-allowed"}}>{quoteLoading?"BESTAND WIRD GEPRÜFT":"NICHT BESTELLBAR"}</span>}
        <Link className="rh-continue-shop" href="/kollektionen/">Weiter einkaufen</Link>
      </aside>
    </div>}
  </section>;
}
