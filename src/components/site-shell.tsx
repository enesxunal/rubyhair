"use client";
import Link from "next/link";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "./cart-context";
import {tapeInLengthHref} from "@/lib/tape-in-lengths";
const categories=[
  {href:"/kollektionen/",title:"Alle Extensions"},
  {href:tapeInLengthHref("45-50-cm"),title:"Tape-in Kurz"},
  {href:tapeInLengthHref("55-60-cm"),title:"Tape-in Lang"}
];
export function SiteHeader(){
  const [open,setOpen]=useState(false);
  const toggle=useRef<HTMLButtonElement>(null);
  const pathname=usePathname();
  const {count}=useCart();
  useEffect(()=>{setOpen(false)},[pathname]);
  useEffect(()=>{
    if(!open)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){setOpen(false);toggle.current?.focus();}
    };
    window.addEventListener("keydown",onKey);
    return ()=>{document.body.style.overflow=previous;window.removeEventListener("keydown",onKey);};
  },[open]);
  return <>
    <a href="#main" className="rh-skip-link">Zum Inhalt springen</a>
    <div className="rh-top">RUBY HAIR · PREMIUM ECHTHAAR EXTENSIONS</div>
    <header className="rh-header">
      <div className="rh-header-inner">
        <Link className="rh-logo" href="/" aria-label="Ruby Hair Startseite">
          <img src="/media/RubyHair-WebHeader-Logo-Dunkel-70efc2b6a.png" data-fallback="/assets/hero-brunette.webp" alt="Ruby Hair"/>
        </Link>
        <nav className="rh-desktop-nav" aria-label="Shop Navigation">
          {categories.map(item=><Link key={item.href} href={item.href}>{item.title}</Link>)}
          <Link href="/ratgeber/">Hair Guide</Link><Link href="/kontakt/">Beratung</Link>
        </nav>
        <div className="rh-actions">
          <Link href="/suche/" className="rh-search" aria-label="Produkte und Haarfarben suchen"><Search size={22}/></Link>
          <Link href="/warenkorb/" className="rh-cart" aria-label={"Warenkorb, "+count+" Artikel"}>
            <ShoppingBag size={22}/>{count>0&&<span className="rh-cart-count">{count}</span>}
          </Link>
          <button ref={toggle} className="rh-menu-toggle" type="button" aria-controls="rh-mobile-nav"
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
        <Link href="/haar-anprobe/" onClick={()=>setOpen(false)}>KI-Haarvorschau (Test)</Link>
      </nav>}
    </header>
    {open&&<button type="button" className="rh-mobile-backdrop" aria-label="Menü schließen" onClick={()=>setOpen(false)}/>}
  </>;
}
export function SiteFooter(){
  return <><footer className="rh-footer">
    <div className="rh-footer-inner">
      <div><Link href="/" className="rh-footer-mark">RUBY HAIR</Link><p>Premium Echthaar Extensions – für deinen ganz persönlichen Look.</p><a className="rh-footer-contact" href="mailto:info@rubyhair.de">info@rubyhair.de</a><p>Essen · Deutschland</p></div>
      <div><strong>SHOP</strong><Link href="/kollektionen/">Alle Extensions</Link><Link href={tapeInLengthHref("45-50-cm")}>Tape-in Kurz</Link><Link href={tapeInLengthHref("55-60-cm")}>Tape-in Lang</Link><Link href="/suche/">Produkte suchen</Link></div>
      <div><strong>INFORMATIONEN</strong><Link href="/kontakt/">Kontakt & Beratung</Link><Link href="/ratgeber/">Hair Guide & Pflege</Link><Link href="/versand-zahlung/">Versand & Zahlung</Link><Link href="/rechtliches/widerruf/">Widerruf & Rückgabe</Link><Link href="/rechtliches/agb/">AGB</Link><Link href="/haar-anprobe/">KI-Haarvorschau (Test)</Link></div>
    </div>
    <div className="rh-footer-bottom"><span>© 2026 RUBY HAIR · NEXT.JS DESIGNVORSCHAU</span><div>
      <Link href="/rechtliches/impressum/">Impressum</Link><Link href="/rechtliches/datenschutz/">Datenschutz</Link>
    </div></div>
  </footer><div className="rh-preview-notice">DESIGNVORSCHAU · BESTELLUNG UND BEZAHLUNG SIND NOCH NICHT FREIGEGEBEN</div></>;
}
export default function ShopLayout({children}:{children:React.ReactNode}){
  return <><SiteHeader/><main id="main">{children}</main><SiteFooter/></>;
}
