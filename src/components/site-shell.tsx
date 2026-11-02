"use client";
import Link from "next/link";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "./cart-context";
const categories=[
  {href:"/kollektionen/",title:"Alle Extensions"},
  {href:"/kollektionen/keratin-bondings/",title:"Keratin Bondings"},
  {href:"/kollektionen/tape-in-extensions/",title:"Tape-in Extensions"}
];
export function SiteHeader(){
  const [open,setOpen]=useState(false);
  const {count}=useCart();
  return <>
    <div className="rh-top">RUBY HAIR · PREMIUM ECHTHAAR EXTENSIONS</div>
    <header className="rh-header">
      <div className="rh-header-inner">
        <Link className="rh-logo" href="/" aria-label="Ruby Hair Startseite">
          <img src="/media/RubyHair-WebHeader-Logo-Dunkel-70efc2b6a.png" data-fallback="/assets/hero-brunette.webp" alt="Ruby Hair"/>
        </Link>
        <nav className="rh-desktop-nav" aria-label="Shop Navigation">
          {categories.map(item=><Link key={item.href} href={item.href}>{item.title}</Link>)}
          <Link href="/haar-anprobe/">Hair Preview Lab</Link>
        </nav>
        <div className="rh-actions">
          <Link href="/suche/" className="rh-search" aria-label="Produkte und Haarfarben suchen"><Search size={22}/></Link>
          <Link href="/warenkorb/" className="rh-cart" aria-label={"Warenkorb, "+count+" Artikel"}>
            <ShoppingBag size={22}/>{count>0&&<span className="rh-cart-count">{count}</span>}
          </Link>
          <button className="rh-menu-toggle" type="button" aria-controls="rh-mobile-nav"
            aria-expanded={open} aria-label={open?"Menü schließen":"Menü öffnen"} onClick={()=>setOpen(x=>!x)}>
            {open?<X size={23}/>:<Menu size={23}/>}
          </button>
        </div>
      </div>
      {open&&<nav className="rh-mobile-nav" id="rh-mobile-nav" aria-label="Mobile Shop Navigation">
        <Link href="/" onClick={()=>setOpen(false)}>Startseite</Link>
        {categories.map(item=><Link key={item.href} href={item.href} onClick={()=>setOpen(false)}>{item.title}</Link>)}
        <Link href="/suche/" onClick={()=>setOpen(false)}>Produkte suchen</Link>
        <Link href="/kontakt/" onClick={()=>setOpen(false)}>Beratung & Kontakt</Link>
        <Link href="/haar-anprobe/" onClick={()=>setOpen(false)}>Hair Preview Lab</Link>
      </nav>}
    </header>
  </>;
}
export function SiteFooter(){
  return <><footer className="rh-footer">
    <div className="rh-footer-inner">
      <div><Link href="/" className="rh-footer-mark">RUBY HAIR</Link><p>Premium Echthaar Extensions – für deinen ganz persönlichen Look.</p><a className="rh-footer-contact" href="mailto:info@rubyhair.de">info@rubyhair.de</a><p>Essen · Deutschland</p></div>
      <div><strong>SHOP</strong><Link href="/kollektionen/">Alle Extensions</Link><Link href="/kollektionen/keratin-bondings/">Keratin Bondings</Link><Link href="/kollektionen/tape-in-extensions/">Tape-in Extensions</Link><Link href="/suche/">Produkte suchen</Link></div>
      <div><strong>INFORMATIONEN</strong><Link href="/kontakt/">Kontakt & Beratung</Link><Link href="/ratgeber/">Hair Guide & Pflege</Link><Link href="/versand-zahlung/">Versand & Zahlung</Link><Link href="/rechtliches/widerruf/">Widerruf & Rückgabe</Link><Link href="/rechtliches/agb/">AGB</Link></div>
    </div>
    <div className="rh-footer-bottom"><span>© 2026 RUBY HAIR · NEXT.JS DESIGNVORSCHAU</span><div>
      <Link href="/rechtliches/impressum/">Impressum</Link><Link href="/rechtliches/datenschutz/">Datenschutz</Link>
    </div></div>
  </footer><div className="rh-preview-notice">DESIGNVORSCHAU · BESTELLUNG UND BEZAHLUNG SIND NOCH NICHT FREIGEGEBEN</div></>;
}
export default function ShopLayout({children}:{children:React.ReactNode}){
  return <><SiteHeader/><main id="main">{children}</main><SiteFooter/></>;
}
