"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart-context";
import {byVariation, euros, type Product} from "@/lib/catalog";
export function CartPage(){
  const {lines,update,remove,clear}=useCart();
  const [liveProducts,setLiveProducts]=useState<Product[]|null>(null);
  const [catalogError,setCatalogError]=useState(false);
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
  const total=items.reduce((sum,item)=>sum+item.quantity*(item.match?.variation.price||0),0);
  return <section className="rh-shell rh-cart-page">
    <div className="rh-eyebrow">RUBY HAIR / WARENKORB</div>
    <h1>Deine <em>Auswahl.</em></h1>
    <p className="rh-cart-notice">Shopping-Vorschau: Deine Auswahl wird nur in diesem Browser gespeichert. Es wird keine Bestellung ausgelöst.</p>
    {catalogError&&<p role="alert" className="rh-admin-error">Produktpreise sind gerade nicht verfügbar. Der Warenkorb ist vorübergehend nicht nutzbar.</p>}
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
            <p>{euros(result.variation.price)} / Packung</p>
            <div className="rh-cart-qty"><button onClick={()=>update(item.id,item.quantity-1)}
              aria-label="Menge verringern" type="button">−</button><span>{item.quantity}</span>
              <button onClick={()=>update(item.id,item.quantity+1)} aria-label="Menge erhöhen" type="button">+</button></div>
            <button className="rh-remove-item" type="button" onClick={()=>remove(item.id)}>Entfernen</button>
          </div>
          <strong className="rh-cart-item-price">{euros(result.variation.price*item.quantity)}</strong>
        </article>;
      })}
        <button type="button" className="rh-remove-item" onClick={clear}>Warenkorb leeren</button>
      </div>
      <aside className="rh-order-summary"><h2>Zusammenfassung</h2>
        <div><span>Zwischensumme</span><strong>{euros(total)}</strong></div>
        <div><span>Versand</span><span>Wird vor Freigabe eingerichtet</span></div>
        <div><span>Gesamt (ohne Versand)</span><strong>{euros(total)}</strong></div>
        <p>Bestellungen und Zahlungen sind in dieser Vorschau nicht aktiv.</p>
        <Link className="rh-buy-button" href="/kasse/">ZUR KASSE (VORSCHAU)<span>↗</span></Link>
        <Link className="rh-continue-shop" href="/kollektionen/">Weiter einkaufen</Link>
      </aside>
    </div>}
  </section>;
}
