"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "./cart-context";
import { colorsFor, euros, type Product } from "@/lib/catalog";

export function ProductDetail({product,initialColor}:{product:Product;initialColor?:string}){
  const groups=useMemo(()=>colorsFor(product),[product]);
  const colors=Array.from(groups.keys());
  const starting=initialColor&&groups.has(initialColor)?initialColor:(groups.has("ruby")?"ruby":colors[0]);
  const [color,setColor]=useState(starting);
  const [length,setLength]=useState("");
  const [quantity,setQuantity]=useState(1);
  const [added,setAdded]=useState(false);
  const {add}=useCart();
  const choices=groups.get(color)||[];
  const available=choices.filter(v=>v.available&&v.purchasable);
  const selected=available.find(v=>v.length===length)||available[0]||choices[0];
  const other=product.slug==="keratin-bondings"?"tape-in-extensions":"keratin-bondings";
  const inStock=Boolean(selected?.available&&selected?.purchasable);
  return <div className="rh-detail rh-shell">
    <nav className="rh-breadcrumb" aria-label="Breadcrumb"><Link href="/">Startseite</Link><span>/</span>
      <Link href="/kollektionen/">Extensions</Link><span>/</span><span>{product.name}</span></nav>
    <div className="rh-detail-layout">
      <div className="rh-gallery">
        <div className="rh-gallery-main"><img id="rh-product-image" src={selected?.image||product.image}
          alt={product.name+" Farbe "+(selected?.color_label||"")} width={600} height={600}/>
          <span>RUBY HAIR / ORIGINAL COLLECTION</span></div>
        <p className="rh-gallery-note">Die Farbwirkung kann je nach Bildschirm abweichen. Originalfotos von Ruby Hair.</p>
      </div>
      <section className="rh-product-info">
        <div className="rh-eyebrow">RUBY HAIR · 100 % ECHTHAAR</div>
        <h1>{product.name}</h1>
        <p className="rh-detail-summary">{product.intro}</p>
        <div className="rh-price" aria-live="polite">{selected?euros(selected.price):"Preis auf Anfrage"}</div>
        <p className="rh-price-note">inkl. MwSt., zzgl. Versandkosten · Vorschaupreise, verbindliche Bestätigung erst im fertigen Shop</p>
        <fieldset className="rh-choice"><legend>01 / WÄHLE DEINE FARBE <span>· {selected?.color_label}</span></legend>
          <div className="rh-color-options">
            {colors.map(value=>{
              const options=groups.get(value)||[];
              const first=options.find(v=>v.available&&v.purchasable)||options[0];
              return <button key={value} className="rh-color-choice" type="button"
                aria-label={"Farbe "+first.color_label} aria-pressed={color===value}
                disabled={!options.some(v=>v.available&&v.purchasable)}
                onClick={()=>{setColor(value);setLength("");setAdded(false)}}>
                <img src={first.image} alt="" loading="lazy"/><span>{first.color_label}</span>
              </button>;
            })}
          </div>
        </fieldset>
        <fieldset className="rh-choice"><legend>02 / WÄHLE DEINE LÄNGE</legend>
          <div className="rh-length-options">
            {Array.from(new Map(choices.map(v=>[v.length,v])).values()).map(v=>
              <button key={v.length} type="button" className="rh-length-choice"
                disabled={!choices.some(x=>x.length===v.length&&x.available&&x.purchasable)}
                aria-pressed={selected?.length===v.length} onClick={()=>{setLength(v.length);setAdded(false)}}>
                {v.length_label}
              </button>
            )}
          </div>
        </fieldset>
        <p className="rh-availability">{inStock?"Für die Warenkorb-Vorschau verfügbar":"Derzeit nicht verfügbar"}</p>
        <label className="rh-qty-label" htmlFor="rh-quantity">Menge</label>
        <div className="rh-qty-control"><button onClick={()=>setQuantity(v=>Math.max(1,v-1))} aria-label="Menge verringern" type="button">−</button>
          <input id="rh-quantity" inputMode="numeric" type="number" min="1" max="99" value={quantity}
            onChange={e=>setQuantity(Math.max(1,Math.min(99,Number(e.target.value)||1)))}/>
          <button onClick={()=>setQuantity(v=>Math.min(99,v+1))} aria-label="Menge erhöhen" type="button">+</button></div>
        <button disabled={!inStock} className="rh-buy-button" type="button"
          onClick={()=>{if(selected){add(selected.id,quantity);setAdded(true)}}}>
          {added?"ZUM WARENKORB HINZUGEFÜGT":"IN DEN WARENKORB"}<span aria-hidden="true">↗</span>
        </button>
        {added&&<Link className="rh-cart-link" href="/warenkorb/">Warenkorb ansehen →</Link>}
        <p className="rh-shop-explain">Dies ist eine unverbindliche Warenkorb-Vorschau. Bestellungen und Zahlungen sind noch deaktiviert.</p>
        <div className="rh-product-facts">
          <details open><summary>Produktdetails</summary>
            <ul><li>Material: {product.material}</li><li>Packungsinhalt: {product.pack}</li><li>Farbe und Länge individuell auswählbar</li></ul>
          </details>
          <details><summary>Wie viele Packungen brauche ich?</summary>
            <p>Ruby Hair nennt zur Orientierung 2–4 Packungen bei dünnem Haar, 4–5 bei normalem Haar und 5–6 bei dickem Haar. Die richtige Menge hängt vom gewünschten Ergebnis ab.</p>
          </details>
          <details><summary>Pflege & Anwendung</summary><p>Du brauchst Hilfe bei der Auswahl? Sprich uns an, bevor du eine Bestellung planst.</p>
            <Link href="/ratgeber/">Hair Guide ↗</Link></details>
          <details><summary>Beratung & Lieferung</summary><p>Die finalen Versandoptionen werden vor der Veröffentlichung bestätigt.</p>
            <Link href="/kontakt/">Beratung kontaktieren ↗</Link></details>
        </div>
      </section>
    </div>
    <div className="rh-related-inline"><div className="rh-eyebrow">NOCH MEHR ENTDECKEN</div>
      <Link href={"/produkt/"+other+"/"}>Andere Extension-Methode entdecken →</Link></div>
  </div>;
}
