"use client";
import Link from "next/link";
import {useState} from "react";
import {euros,type Product} from "@/lib/catalog";
import {collectionShadeCards} from "@/lib/tape-in-shades";

export function ShadeGrid({product,selectedLength}:{product:Product;selectedLength?:string}){
 const [filter,setFilter]=useState("");
 const groups=collectionShadeCards(product,selectedLength);
 const filtered=groups.filter(card=>
  (card.color+" "+card.label).toLocaleLowerCase("de")
   .includes(filter.trim().toLocaleLowerCase("de"))
 );
 const listed=groups.filter(card=>card.status==="listed").length;
 const unavailable=groups.filter(card=>card.status!=="listed").length;
 const labelLength=selectedLength==="45-50-cm"?"45–50 cm":selectedLength==="55-60-cm"?"55–60 cm":null;
 return <section className="rh-shell rh-shades-section">
  <div className="rh-section-heading"><div><h2>Wähle deine <em>Farbe.</em></h2></div></div>
  {product.slug==="tape-in-extensions"&&<div className="rh-shade-coverage" role="note">
   <strong>{groups.length} Farbtöne im Überblick</strong>
   <span>{labelLength?labelLength+" · "+listed+" derzeit verfügbar · "+unavailable+" aktuell nicht bestellbar":listed+" derzeit verfügbar · "+unavailable+" aktuell nicht bestellbar"}</span>
   <p>Alle angefragten Farben werden gezeigt. Nicht gelistete Farb-/Längenkombinationen sind <b>nicht bestellbar</b>. Bilder anderer Längen dienen nur als Farbmuster; Verfügbarkeit und Preise werden vor dem Verkauf geklärt.</p>
  </div>}
  <div className="rh-filters"><label htmlFor="rh-color-filter">Farbe suchen</label>
   <input id="rh-color-filter" type="search" value={filter}
    onChange={e=>setFilter(e.target.value)} placeholder="z. B. 1b, RUBY, BRONDE"/></div>
  <div className="rh-shade-grid">
   {filtered.map(card=>{
    const available=card.available;
    const sample=available[0]||card.selectedVariants[0]||card.variants[0];
    const label=card.label;
    const item=<>
     <div className="rh-shade-image">
      <img src={card.image} alt={product.name+" Farbmuster "+label} loading="lazy"/>
      <span className="rh-shade-badge">FARBE {label}</span>
      {card.status!=="listed"&&<span className="rh-shade-status">NICHT BESTELLBAR</span>}
     </div>
     <div className="rh-shade-meta"><div>
      <strong>{product.name}{labelLength?" · "+labelLength:""}</strong>
      <small>Farbe {label}</small>
     </div><span className="rh-price-small">
      {available.length?"ab "+euros(Math.min(...available.map(v=>v.price))):card.status==="unavailable"?"Nicht verfügbar":"Nur auf Anfrage"}
     </span></div>
    </>;
    if(card.status==="listed"){
     return <Link className="rh-shade-card" key={card.color}
      href={"/produkt/"+product.slug+"/?farbe="+encodeURIComponent(card.color)+(selectedLength?"&laenge="+encodeURIComponent(selectedLength):"")}
      aria-label={product.name+" Farbe "+label+" ansehen"}>
      {item}
     </Link>;
    }
    return <article key={card.color} className="rh-shade-card rh-shade-card-unlisted">
     {item}
     <p className="rh-shade-unlisted-note">
      {card.referenceOnly?"Farbmuster aus dem Keratin-Katalog. Tape-in in dieser Farbe noch nicht bestätigt.":
       card.status==="unavailable"?"Diese Variante ist derzeit nicht verfügbar.":
       labelLength?"In "+labelLength+" derzeit nicht als Tape-in-Variante gelistet.":"Noch nicht als Tape-in-Variante gelistet."}
     </p>
     <Link href="/kontakt/" className="rh-shade-request-link" aria-label={"Farbe "+label+" bei Ruby Hair anfragen"}>
      FARBE ANFRAGEN <span aria-hidden="true">↗</span>
     </Link>
    </article>;
   })}
  </div>
  {filtered.length===0&&<p>Kein passender Farbton gefunden.</p>}
 </section>;
}
