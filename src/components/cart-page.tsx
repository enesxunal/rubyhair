"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart-context";
import {byVariation, euros, type Product} from "@/lib/catalog";
import type {CartQuote} from "@/lib/cart-quote";
export function CartPage(){
  const {lines,update,remove,clear}=useCart();
  const [liveProducts,setLiveProducts]=useState<Product[]|null>(null);
  const [catalogError,setCatalogError]=useState(false);
  const [quote,setQuote]=useState<{key:string;data:CartQuote}|null>(null);
  const [quoteError,setQuoteError]=useState(false);
  const cartKey=JSON.stringify(lines);
  useEffect(()=>{
    if(!lines.length){return}
    const controller=new AbortController();
    setQuoteError(false);
    fetch("/api/cart/quote",{
      method:"POST",cache:"no-store",signal:controller.signal,
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({lines})
    }).then(r=>{if(!r.ok)throw new Error("quote unavailable");return r.json()})
      .then(data=>{if(!controller.signal.aborted)setQuote({key:JSON.stringify(lines),data})})
      .catch(()=>{if(!controller.signal.aborted)setQuoteError(true)});
    return ()=>controller.abort();
  },[cartKey]);
  const currentQuote=quote?.key===cartKey?quote.data:null;
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
    <p className="rh-cart-notice">Shopping-Vorschau: Deine Auswahl wird nur in diesem Browser gespeichert. Es wird keine Bestellung ausgelöst.</p>
    {catalogError&&<p role="alert" className="rh-admin-error">Produktpreise sind gerade nicht verfügbar. Der Warenkorb ist vorübergehend nicht nutzbar.</p>}
    {quoteError&&<p role="alert" className="rh-admin-error">Der Server konnte den Warenkorb nicht prüfen. Bitte erneut versuchen.</p>}
    {items.length===0?<div className="rh-empty-cart"><p>Dein Warenkorb ist noch leer.</p>
      <Link className="rh-buy-button" href="/kollektionen/">EXTENSIONS ENTDECKEN <span>↗</span></Link></div>:
    <div className="rh-cart-layout">
      <div className="rh-cart-list">{items.map(item=>{
        const result=item.match!;
        return <article key={item.id} className="rh-cart-item">
          <img src={result.variation.image} alt={result.product.name+" Farbe "+result.variation.color_label}/>
          <div className="rh-cart-item-info"><Link href={"/produkt/"+result.product.slug+"/?farbe="+encodeURIComponent(result.variation.color)}>
            <strong>{result.product.name}</strong></Link>
            <p>Farbe {result.variation.color_label} · {result.variation.length_label}</p>
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
        <div><span>Zwischensumme (serverseitig)</span><strong>{total===null?"Wird geprüft":euros(total/100)}</strong></div>
        <div><span>Versand</span><span>Noch nicht bestätigt</span></div>
        <Link className="rh-cart-shipping-link" href="/versand-zahlung/">Informationen zu Versand & Zahlung ↗</Link>
        <div><span>Gesamt (ohne Versand)</span><strong>{total===null?"Wird geprüft":euros(total/100)}</strong></div>
        {currentQuote&&<p className="rh-quote-source">Quelle: {currentQuote.source==="postgresql"?"Ruby Hair PostgreSQL":"importierte Demo-Produktdaten"}. Dieser Betrag ist unverbindlich.</p>}
        {issues.length>0&&<p role="status" className="rh-cart-stock-warning">{issues.some(x=>x.status==="unverified-stock")?"Der physische Lagerbestand ist nicht bestätigt. ":""}
          {issues.some(x=>x.status==="out-of-stock")?"Einige Artikel sind nicht oder nicht in der gewünschten Menge verfügbar. ":""}
          {issues.some(x=>x.status==="unknown-variation")?"Ein Produkt ist nicht mehr im Katalog. ":""}
        </p>}
        <p>Bestellungen und Zahlungen sind in dieser Vorschau nicht aktiv.</p>
        <Link className="rh-buy-button" href="/kasse/">ZUR KASSE (VORSCHAU)<span>↗</span></Link>
        <Link className="rh-continue-shop" href="/kollektionen/">Weiter einkaufen</Link>
      </aside>
    </div>}
  </section>;
}
