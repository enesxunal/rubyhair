"use client";
import Link from "next/link";
import { useState } from "react";
import { colorsFor, euros, type Product } from "@/lib/catalog";

export function ShadeGrid({product}:{product:Product}){
  const [filter,setFilter]=useState("");
  const groups=Array.from(colorsFor(product));
  const filtered=groups.filter(([color,variants])=>
    (color+" "+variants[0].color_label).toLocaleLowerCase("de")
      .includes(filter.trim().toLocaleLowerCase("de"))
  );
  return <section className="rh-shell rh-shades-section">
    <div className="rh-section-heading"><div><span className="rh-eyebrow">FINDE DEINE FARBE</span>
      <h2>Wähle deinen <em>Shade.</em></h2></div>
      <p>Wähle einen Farbton, um die passende Produktseite zu öffnen.</p></div>
    <div className="rh-filters"><label htmlFor="rh-color-filter">Farbe suchen</label>
      <input id="rh-color-filter" type="search" value={filter}
        onChange={e=>setFilter(e.target.value)} placeholder="z. B. RUBY, 2b, BRONDE"/></div>
    <div className="rh-shade-grid">
      {filtered.map(([color,variants])=>{
        const available=variants.filter(v=>v.available&&v.purchasable);
        const sample=available[0]||variants[0];
        return <Link className="rh-shade-card" key={color}
            href={"/produkt/"+product.slug+"/?farbe="+encodeURIComponent(color)}
            aria-label={product.name+" Farbe "+sample.color_label+" ansehen"}>
          <div className="rh-shade-image"><img src={sample.image} alt={product.name+" Farbe "+sample.color_label} loading="lazy"/>
            <span className="rh-shade-badge">FARBE {sample.color_label}</span></div>
          <div><div><strong>{product.name}</strong><small>Farbe {sample.color_label}</small></div>
            <span className="rh-price-small">{available.length?"ab "+euros(Math.min(...available.map(v=>v.price))):"Ausverkauft"}</span>
          </div>
        </Link>;
      })}
    </div>
    {filtered.length===0&&<p>Kein passender Farbton gefunden.</p>}
  </section>;
}
