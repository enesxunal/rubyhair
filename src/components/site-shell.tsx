"use client";
import Link from "next/link";
import { Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "./cart-context";
import {storefrontNav,storefrontShopLinks,storefrontInfoLinks} from "@/lib/store-navigation";
import CookieSettingsLink from "@/components/cookie-settings-link";
const categories=storefrontNav;
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
          {categories.map(item=><Link key={item.href} href={item.href}>{item.label}</Link>)}
          <Link href="/ratgeber/">Hair Guide</Link>
        </nav>
        <div className="rh-actions">
          <Link href="/suche/" className="rh-search" aria-label="Produkte und Haarfarben suchen"><Search size={22}/></Link>
          <Link href="/konto/" className="rh-cart" aria-label="Mein Kundenkonto" title="Mein Konto"><UserRound size={22}/></Link>
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
        {categories.map(item=><Link key={item.href} href={item.href} onClick={()=>setOpen(false)}>{item.label}</Link>)}
        <Link href="/ratgeber/" onClick={()=>setOpen(false)}>Hair Guide</Link>
        <Link href="/haar-anprobe/" onClick={()=>setOpen(false)}>KI-Haarvorschau</Link>
        <Link href="/konto/" onClick={()=>setOpen(false)}>Mein Konto</Link>
      </nav>}
    </header>
    {open&&<button type="button" className="rh-mobile-backdrop" aria-label="Menü schließen" onClick={()=>setOpen(false)}/>}
  </>;
}
export function SiteFooter(){
  return <><footer className="rh-footer">
    <div className="rh-footer-inner">
      <div><Link href="/" className="rh-footer-mark">RUBY HAIR</Link><p>Premium Echthaar Extensions – für deinen ganz persönlichen Look.</p><a className="rh-footer-contact" href="mailto:info@rubyhair.de">info@rubyhair.de</a><p>Essen · Deutschland</p></div>
      <div><strong>SHOP</strong>{storefrontShopLinks.map(item=><Link href={item.href} key={item.href}>{item.label}</Link>)}</div>
      <div><strong>INFORMATIONEN</strong>{storefrontInfoLinks.map(item=><Link href={item.href} key={item.href} style={item.href==="/widerruf/"?{fontWeight:700,textDecoration:"underline",textUnderlineOffset:4}:undefined}>{item.label}</Link>)}</div>
    </div>
    <div className="rh-footer-bottom"><span>© 2026 RUBY HAIR</span><div>
      <Link href="/konto/">Mein Konto</Link><Link href="/rechtliches/impressum/">Impressum</Link><Link href="/rechtliches/datenschutz/">Datenschutz</Link><CookieSettingsLink/>
    </div></div>
  </footer></>;
}
export default function ShopLayout({children}:{children:React.ReactNode}){
  return <><SiteHeader/><main id="main">{children}</main><SiteFooter/></>;
}
