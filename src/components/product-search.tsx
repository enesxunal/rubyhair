"use client";
import { useState } from "react";
import Link from "next/link";
import {colorsFor,euros,type Product} from "@/lib/catalog";
export function ProductSearch({initialQuery="",products}:{initialQuery?:string;products:Product[]}){
  const [query,setQuery]=useState(initialQuery);
  const items=products.flatMap(product=>Array.from(colorsFor(product),([color,variants])=>{
    const available=variants.filter(v=>v.available&&v.purchasable);
    const sample=available[0]||variants[0];
    return {product,color,available,sample};
  }));
  const filtered=items.filter(x=>
    (x.product.name+" "+x.color+" "+x.sample.color_label)
      .toLocaleLowerCase("de").includes(query.trim().toLocaleLowerCase("de"))
  );
  return <section className="rh-shell rh-shades-section rh-search-results">
    <label htmlFor="rh-shop-search" className="rh-search-label">WAS SUCHST DU?</label>
    <input id="rh-shop-search" className="rh-search-input" type="search" value={query}
      onChange={e=>setQuery(e.target.value)} autoComplete="off" placeholder="z. B. BRONDE, Keratin, SILVER"/>
    <div className="rh-search-toolbar"><span aria-live="polite">{filtered.length} Ergebnisse</span>
      <span className="rh-catalog-status">Produktkatalog der neuen Ruby Hair Vorschau</span></div>
    <div className="rh-shade-grid">{filtered.map(x=>
      <Link key={x.product.slug+"-"+x.color} className="rh-shade-card"
        href={"/produkt/"+x.product.slug+"/?farbe="+encodeURIComponent(x.color)}>
        <div className="rh-shade-image"><img src={x.sample.image} alt={x.product.name+" Farbe "+x.sample.color_label} loading="lazy"/></div>
        <div><div><strong>{x.product.name}</strong><small>Farbe {x.sample.color_label}</small></div>
          <span className="rh-price-small">{x.available.length?"ab "+euros(Math.min(...x.available.map(v=>v.price))):"Ausverkauft"}</span></div>
      </Link>
    )}</div>
    {filtered.length===0&&<p>Keine Treffer. Probiere eine andere Haarfarbe oder Produktart.</p>}
  </section>;
}
