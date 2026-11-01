"use client";
import { useMemo, useRef, useState } from "react";
import { ZoomIn } from "lucide-react";
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
  const [galleryIndex,setGalleryIndex]=useState(0);
  const lightbox=useRef<HTMLDialogElement>(null);
  const {add}=useCart();
  const choices=groups.get(color)||[];
  const available=choices.filter(v=>v.available&&v.purchasable);
  const selected=available.find(v=>v.length===length)||available[0]||choices[0];
  const other=product.slug==="keratin-bondings"?"tape-in-extensions":"keratin-bondings";
  const inStock=Boolean(selected?.available&&selected?.purchasable);
  const slides=[
    {src:selected?.image||product.image,label:"Ausgewählter Farbton",alt:product.name+" – Farbton "+(selected?.color_label||"")},
    ...(product.image!==(selected?.image||product.image)?[
      {src:product.image,label:"Kollektion / Illustration",alt:product.name+" – allgemeines Kollektionsbild (nicht verbindlicher Farbvergleich)"}
    ]:[])
  ];
  const slide=slides[Math.min(galleryIndex,slides.length-1)];
  return <div className="rh-detail rh-shell">
    <nav className="rh-breadcrumb" aria-label="Breadcrumb"><Link href="/">Startseite</Link><span>/</span>
      <Link href="/kollektionen/">Extensions</Link><span>/</span><span>{product.name}</span></nav>
    <div className="rh-detail-layout">
      <div className="rh-gallery">
        <div className="rh-gallery-main">
          <button type="button" className="rh-gallery-open" aria-label="Produktbild vergrößern"
            onClick={()=>lightbox.current?.showModal()}>
            <img id="rh-product-image" src={slide.src} alt={slide.alt} width={600} height={600}/>
            <span className="rh-gallery-magnify"><ZoomIn size={19}/> VERGRÖSSERN</span>
          </button>
          <span>RUBY HAIR / ORIGINAL COLLECTION</span>
        </div>
        <div className="rh-gallery-thumbs" role="group" aria-label="Produktbilder">
          {slides.map((item,i)=><button key={item.src} type="button"
            className="rh-gallery-thumb" aria-label={item.label+" anzeigen"} aria-pressed={galleryIndex===i}
            onClick={()=>setGalleryIndex(i)}><img src={item.src} alt=""/>
            <span>{item.label}</span></button>)}
        </div>
        <p className="rh-gallery-note">Der gewählte Farbton ist auf dem ersten Foto zu sehen. Zusätzliche Kollektionsbilder sind keine verbindliche Farbreferenz. Bildschirmfarben können abweichen.</p>
        <dialog ref={lightbox} className="rh-gallery-dialog" aria-label="Vergrößerte Produktansicht"
          onClick={event=>{if(event.target===lightbox.current)lightbox.current?.close()}}>
          <button type="button" className="rh-gallery-close" aria-label="Bildansicht schließen"
            onClick={()=>lightbox.current?.close()}>×</button>
          <img src={slide.src} alt={slide.alt}/>
          <p>{slide.label} · {selected?.color_label}</p>
        </dialog>
      </div>
      <section className="rh-product-info">
        <div className="rh-eyebrow">RUBY HAIR · 100 % ECHTHAAR</div>
        <h1>{product.name}</h1>
        <p className="rh-detail-summary">{product.intro}</p>
        <div className="rh-price" aria-live="polite">{selected?euros(selected.price):"Preis auf Anfrage"}</div>
        <p className="rh-price-note">Unverbindlicher Demo-Preis. Steuerangaben, Versandkosten und Verfügbarkeit werden vor dem Verkaufsstart des neuen Shops bestätigt. <Link href="/versand-zahlung/">Versand & Zahlung ↗</Link></p>
        <div className="rh-product-summary-tags"><span>{product.material}</span><span>{product.pack} / Packung</span></div>
        <fieldset className="rh-choice"><legend>01 / WÄHLE DEINE FARBE <span>· {selected?.color_label}</span></legend>
          <div className="rh-color-options">
            {colors.map(value=>{
              const options=groups.get(value)||[];
              const first=options.find(v=>v.available&&v.purchasable)||options[0];
              return <button key={value} className="rh-color-choice" type="button"
                aria-label={"Farbe "+first.color_label} aria-pressed={color===value}
                disabled={!options.some(v=>v.available&&v.purchasable)}
                onClick={()=>{setColor(value);setLength("");setAdded(false);setGalleryIndex(0)}}>
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
        <p className={"rh-availability"+(!inStock?" rh-not-available":"")}>
          {!inStock?"Diese Kombination ist laut importiertem Katalog nicht verfügbar":
          selected?.stock_quantity==null?"Auswahl für die Vorschau möglich · tatsächlicher Lagerbestand noch nicht bestätigt":
          "Vorschauauswahl verfügbar · Lagerbestand wird beim Verkaufsstart geprüft"}
        </p>
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
          <details><summary>Pflege & Anwendung</summary><p>Wasche dein Haar schonend, bürste die Extensions vorsichtig und lege dich nicht mit nassem Haar schlafen. Unsere Hinweise zur täglichen Routine findest du im Hair Guide.</p>
            <Link href="/ratgeber/">Hair Guide ↗</Link></details>
          <details><summary>Beratung & Lieferung</summary><p>Du hast eine Frage zu Farbe, Länge, Methode oder Packungsanzahl? Kontaktiere Ruby Hair. Die verbindlichen Lieferkosten und Versandbedingungen des neuen Shops werden vor dem Verkaufsstart bestätigt.</p>
            <Link href="/kontakt/">Beratung kontaktieren ↗</Link> · <Link href="/versand-zahlung/">Versand & Zahlung ↗</Link></details>
        </div>
      </section>
    </div>
    <section className="rh-product-help" aria-label="Produktberatung und Pflege">
      <div className="rh-product-help-intro">
        <div className="rh-eyebrow">DEIN LOOK / DEINE ENTSCHEIDUNG</div>
        <h2>Noch Fragen zu<br/><em>deinen Extensions?</em></h2>
        <p>Die richtige Farbwahl und Pflege machen den Unterschied. Schau in den Hair Guide oder frage uns direkt.</p>
      </div>
      <div className="rh-product-help-links">
        <Link href="/ratgeber/">HAIR GUIDE & PFLEGE <span>↗</span></Link>
        <Link href="/kontakt/">FARBE & METHODE ANFRAGEN <span>↗</span></Link>
      </div>
    </section>
    <div className="rh-related-inline"><div className="rh-eyebrow">NOCH MEHR ENTDECKEN</div>
      <Link href={"/produkt/"+other+"/"}>Andere Extension-Methode entdecken →</Link></div>
  </div>;
}
