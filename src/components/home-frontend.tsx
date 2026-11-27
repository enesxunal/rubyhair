"use client";
import BlackFridayBadge from "@/components/black-friday-badge";

import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {Search,ShoppingBag,Menu,X,ArrowUpRight,ArrowRight,Instagram,Sparkles} from "lucide-react";
import {useCart} from "@/components/cart-context";
import {euros,type Product} from "@/lib/catalog";
import {tapeInLengths,tapeInLengthHref} from "@/lib/tape-in-lengths";
import {storefrontNav,storefrontShopLinks,storefrontInfoLinks} from "@/lib/store-navigation";
import CookieSettingsLink from "@/components/cookie-settings-link";
import InstagramHome from "@/components/instagram-home";
import InfluencerStories from "@/components/influencer-stories";
import type {InstagramFeedPost} from "@/lib/instagram-feed";
import {customerTapePhotos} from "@/lib/customer-tape-images";

const darkLogo="/media/RubyHair-WebHeader-Logo-Dunkel-70efc2b6a.png";
const lightLogo="/media/RubyHair-WebHeader-Logo-Hell-818376d91.png";
const nav=storefrontNav;
const shades=[
  {key:"brown",title:"Brown",background:"#5e483a",image:"/assets/ruby-tape-bronde-alt.webp",color:"6",slug:"tape-in-extensions"},
  {key:"bronde",title:"Bronde",background:"#a28765",image:"/assets/ruby-tape-bronde-main.webp",color:"bronde",slug:"tape-in-extensions"},
  {key:"blonde",title:"Blonde",background:"#d7c2a1",image:"/media/60-3-scaled-e99a55c0d.jpg",color:"60",slug:"tape-in-extensions"},
  {key:"ash",title:"Ash",background:"#b4ada5",image:"/media/silber-1-scaled-7627ffcff.jpg",color:"silver",slug:"tape-in-extensions"}
];

function HomeNavigation(){
  const [menuOpen,setMenuOpen]=useState(false);
  const menuTrigger=useRef<HTMLButtonElement>(null);
  const menuClose=useRef<HTMLButtonElement>(null);
  const menuPanel=useRef<HTMLElement>(null);
  const {count}=useCart();
  useEffect(()=>{
    if(!menuOpen)return;
    const before=document.body.style.overflow;
    document.body.style.overflow="hidden";
    menuClose.current?.focus();
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){
        event.preventDefault();setMenuOpen(false);menuTrigger.current?.focus();
      }
      if(event.key==="Tab"){
        const controls=Array.from(menuPanel.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')||[]);
        if(!controls.length)return;
        const first=controls[0],last=controls[controls.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
    };
    window.addEventListener("keydown",onKey);
    return ()=>{document.body.style.overflow=before;window.removeEventListener("keydown",onKey);};
  },[menuOpen]);
  return <>
    <a href="#main" className="rh-skip-link">Zum Inhalt springen</a>
    <div className="site-top" aria-label="Markeninformation">
      <span>THE RUBY HAIR EXPERIENCE</span>
      <span className="top-star"><Sparkles size={13}/></span>
      <span>PREMIUM ECHTHAAR EXTENSIONS</span>
      <Link prefetch={false} href="/kontakt/">ENTDECKE UNS IN ESSEN <ArrowUpRight size={14}/></Link>
    </div>
    <header className="site-header" id="top">
      <div className="head-main container-wide">
        <div className="head-left">
          <button ref={menuTrigger} className="icon-button menu-trigger" type="button"
            aria-label="Menü öffnen" aria-controls="mobile-menu" aria-expanded={menuOpen}
            onClick={()=>setMenuOpen(true)}><Menu size={23}/></button>
          <Link prefetch={false} className="head-search" href="/suche/" aria-label="Produktsuche öffnen">
            <Search size={20}/><span>Wonach suchst du?</span>
          </Link>
        </div>
        <Link prefetch={false} className="brand-logo" href="/" aria-label="Ruby Hair – Startseite">
          <img src={darkLogo} alt="RUBY HAIR EXTENSIONS"/>
        </Link>
        <div className="head-right">
          <Link prefetch={false} href="/kontakt/" className="head-consult">
            <span className="small">HAST DU FRAGEN?</span>
            <strong>Wir beraten dich <ArrowUpRight size={15}/></strong>
          </Link>
          <Link prefetch={false} href="/suche/" className="icon-button search-mobile" aria-label="Produktsuche öffnen"><Search size={22}/></Link>
          <Link prefetch={false} className="icon-button" href="/warenkorb/" aria-label={"Warenkorb öffnen, "+count+" Artikel"}>
            <ShoppingBag size={23}/>{count>0&&<span className="cart-count">{count}</span>}
          </Link>
        </div>
      </div>
      <nav className="desktop-nav" aria-label="Hauptnavigation">
        {nav.map(item=><Link prefetch={false} key={item.href} href={item.href}>{item.homeLabel}</Link>)}
      </nav>
    </header>
    <div className="mobile-shade" hidden={!menuOpen} onClick={()=>setMenuOpen(false)}/>
    <aside ref={menuPanel} className={"mobile-menu"+(menuOpen?" open":"")} id="mobile-menu" role="dialog" aria-modal={menuOpen} aria-label="Mobiles Menü" aria-hidden={!menuOpen} inert={!menuOpen}>
      <div className="mobile-menu-head"><img src={darkLogo} alt="Ruby Hair"/><button ref={menuClose} type="button" onClick={()=>setMenuOpen(false)} aria-label="Menü schließen"><X size={24}/></button></div>
      <span className="eyebrow">RUBY HAIR</span>
      {nav.map(item=><Link prefetch={false} key={item.href} href={item.href} onClick={()=>setMenuOpen(false)}>{item.homeLabel} <ArrowRight size={17}/></Link>)}
      <Link prefetch={false} href="/warenkorb/" onClick={()=>setMenuOpen(false)}>WARENKORB ({count}) <ArrowRight size={17}/></Link>
      <div className="mobile-menu-foot">YOUR HAIR. YOUR SIGNATURE.</div>
    </aside>
  </>;
}

function ShadeSelector({product,verified}:{product?:Product;verified:boolean}){
  const [index,setIndex]=useState(0);
  const active=shades[index];
  const canBuy=Boolean(product?.variations.some(v=>v.color===active.color&&v.available&&v.purchasable));
  return <section id="shade" className="shade section-pad">
    <div className="container shade-grid">
      <div className="shade-visual rh-shade-gallery">
        <div className="rh-shade-gallery-main">
          <img key={active.key} loading="lazy" src={active.image} alt={"Ruby Hair Tape-in Extensions – Farbton "+active.title}/>
          <span>DEINE FARBE / {active.title.toUpperCase()}</span>
        </div>
        <div className="rh-shade-gallery-rail" aria-label="Weitere echte Ruby Hair Farbtöne">
          {shades.filter(tone=>tone.key!==active.key).map(tone=><button type="button" key={tone.key}
            onClick={()=>setIndex(shades.findIndex(item=>item.key===tone.key))}
            aria-label={"Farbton "+tone.title+" ansehen"}>
            <img src={tone.image} alt={"Ruby Hair Farbton "+tone.title} loading="lazy"/>
            <span>{tone.title}</span>
          </button>)}
        </div>
      </div>
      <div className="shade-copy">
        <h2>Deine <i>Farbe.</i></h2>
        <p>Finde den passenden Tape-in Farbton.</p>
        <div className="shade-pills" role="group" aria-label="Haarfarben auswählen">
          {shades.map((shade,i)=><button type="button" key={shade.key}
            className={i===index?"selected":""} aria-pressed={i===index} onClick={()=>setIndex(i)}>
            <b style={{background:shade.background}}/> {shade.title}
          </button>)}
        </div>
        <p className="shade-disclaimer">Farbdarstellung kann je nach Bildschirm abweichen. Die Auswahl dient als Inspiration.</p>
        {canBuy?<Link prefetch={false} className="solid-button shade-button" href={"/produkt/"+active.slug+"/?farbe="+active.color}>
          FARBE ANSEHEN <ArrowUpRight size={17}/>
        </Link>:verified?<span className="solid-button shade-button" aria-disabled="true" style={{opacity:.65,cursor:"not-allowed"}}>AUSVERKAUFT</span>:<Link prefetch={false} className="solid-button shade-button" href={"/produkt/"+active.slug+"/?farbe="+active.color}>VERFÜGBARKEIT PRÜFEN <ArrowUpRight size={17}/></Link>}
      </div>
    </div>
  </section>;
}
function TapeInAtelier(){
  return <section id="tape-in-atelier" className="rh-tape-atelier" aria-labelledby="rh-atelier-heading">
    <div className="container rh-tape-atelier-grid">
      <div className="rh-tape-atelier-copy">
        <div className="eyebrow">THE ART OF EXTENSIONS / RUBY HAIR</div>
        <h2 id="rh-atelier-heading">Schönheit liegt<br/>im <i>Detail.</i></h2>
        <p>Seidige Texturen. Facettenreiche Nuancen. Ein unvergleichlich natürlicher Fall.</p>
        <p>Unsere Premium Tape-in Extensions vereinen hochwertige Echthaarqualität mit nahezu unsichtbaren Verbindungen – für einen Look, der sich wie dein eigenes Haar anfühlt.</p>
        <Link prefetch={false} href="/kollektionen/tape-in-extensions/" className="rh-tape-atelier-link">
          KOLLEKTION ENTDECKEN <ArrowUpRight size={17} aria-hidden="true"/>
        </Link>
        <span className="rh-tape-atelier-note">RUBY HAIR · STUDIO EDITORIAL</span>
      </div>
      <figure className="rh-tape-atelier-visual rh-tape-atelier-visual-main">
        <img src="/assets/ruby-hair-platinum-atelier.webp"
          alt="Platinblonde Tape-in Extensions auf drei weißen skulpturalen Säulen"
          loading="lazy" decoding="async" width={1024} height={1536}/>
        <figcaption><span>01 / THE COLLECTION</span><span>SOFT BLONDE</span></figcaption>
      </figure>
      <figure className="rh-tape-atelier-visual rh-tape-atelier-visual-detail">
        <img src="/assets/ruby-hair-brunette-tape-detail.webp"
          alt="Braune Ruby Hair Tape-in Extensions auf einer schwarzen skulpturalen Hand"
          loading="lazy" decoding="async" width={1024} height={1536}/>
        <figcaption><span>02 / THE DETAILS</span><span>WARM BRUNETTE</span></figcaption>
      </figure>
    </div>
  </section>;
}
function HomeFooter(){
  return <>
    <footer className="footer" id="footer">
      <div className="container footer-top">
        <div className="footer-about">
          <img src={lightLogo} alt="Ruby Hair Extensions Logo"/>
          <p>Premium Echthaar Extensions für deinen individuellen Look. Mit Liebe zu schönem Haar – aus Essen.</p>
          <a href="mailto:info@rubyhair.de" className="rh-footer-contact">info@rubyhair.de</a>
          <a href="https://www.instagram.com/rubyhair.de/" target="_blank" rel="noopener noreferrer"
            aria-label="Ruby Hair Instagram" className="social-icon"><Instagram size={20}/></a>
        </div>
        <div className="footer-col"><h3>SHOP</h3>
          {storefrontShopLinks.map(item=><Link prefetch={false} href={item.href} key={item.href}>{item.label}</Link>)}
        </div>
        <div className="footer-col"><h3>INFORMATIONEN</h3>
          {storefrontInfoLinks.map(item=><Link prefetch={false} href={item.href} key={item.href}>{item.label}</Link>)}
        </div>
        <div className="footer-col"><h3>RUBY HAIR</h3>
          <Link prefetch={false} href="/#about">Unsere Story</Link>
          <Link prefetch={false} href="/kontakt/">Studio in Essen</Link>
          <Link prefetch={false} href="/kontakt/">Kontakt</Link>
          <a href="https://www.instagram.com/rubyhair.de/" target="_blank" rel="noopener noreferrer">Instagram <ArrowUpRight size={15}/></a>
        </div>
      </div>
      <div className="container footer-bottom"><span>© 2026 RUBY HAIR</span>
        <div><Link prefetch={false} href="/rechtliches/impressum/">IMPRESSUM</Link><Link prefetch={false} href="/rechtliches/datenschutz/">DATENSCHUTZ</Link><Link prefetch={false} href="/rechtliches/agb/">AGB</Link><CookieSettingsLink/></div>
        <span>MADE FOR BEAUTIFUL HAIR.</span>
      </div>
    </footer>
  </>;
}
function CollectionPrice({product,length,verified}:{product?:Product;length?:string;verified:boolean}){
  const available=product?.variations.filter(v=>v.available&&v.purchasable&&(!length||v.length===length)&&Number.isFinite(v.price)&&v.price>0)||[];
  return <div className="rh-home-product-price" aria-live="polite">
    {available.length?<><span>ab</span> <strong>{euros(Math.min(...available.map(v=>v.price)))}</strong><small> / Packung</small></>:
      <span>{verified?"Derzeit ausverkauft":"Preis im Shop ansehen"}</span>}
  </div>;
}
export default function HomeFrontend({instagramPosts=[]}:{instagramPosts?:InstagramFeedPost[]}){
  const section=useRef<HTMLElement>(null);
  const [products,setProducts]=useState<Product[]>([]);
  const [verified,setVerified]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    let started=false;
    const load=async()=>{
      if(started)return;started=true;
      try{
        const response=await fetch("/api/catalog",{signal:controller.signal,cache:"no-store"});
        if(!response.ok)return;
        const data=await response.json() as {source:string;products:Product[]};
        if(data.source!=="postgresql"||!Array.isArray(data.products)||controller.signal.aborted)return;
        setProducts(data.products);setVerified(true);
      }catch{/* No invented price or stock; collection links stay usable. */}
    };
    if(!section.current||typeof IntersectionObserver==="undefined"){void load();return ()=>controller.abort();}
    const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();void load();}},{rootMargin:"600px"});
    observer.observe(section.current);
    return ()=>{observer.disconnect();controller.abort();};
  },[]);
  const tape=products.find(p=>p.slug==="tape-in-extensions"),keratin=products.find(p=>p.slug==="keratin-bondings");
  return <>
    <HomeNavigation/>
    <main id="main">
      <Link prefetch={false} className="hero rh-hero-product" id="home" href="/produkt/tape-in-extensions/?farbe=6&laenge=55-60-cm" aria-label="Tape-in Extensions entdecken, zum Produkt">
        <BlackFridayBadge hero/>
        <div className="hero-photo">
          <img className="hero-primary" src="/assets/hero-brunette.webp" alt="Model mit langen braunen Haaren" width={1672} height={941} fetchPriority="high"/>
        </div>
        <div className="hero-copy">
          <h1>Tape-in<br/><i>Extensions.</i></h1>
          <p>Zwei Längen. Dein Look.</p>
          <div className="hero-links"><span className="solid-button">TAPE-IN ANSEHEN <ArrowUpRight size={18} aria-hidden="true"/></span></div>
        </div>
      </Link>
      <InfluencerStories/>
      <section id="collections" ref={section} className="collections rh-length-collection section-pad" aria-labelledby="rh-home-lengths">
        <div className="container">
          <div className="section-heading"><h2 id="rh-home-lengths">Entdecke deine <i>Extensions.</i></h2></div>
          <div className="collection-grid rh-collection-trio">
            {tapeInLengths.map((choice,index)=><Link prefetch={false} href={tapeInLengthHref(choice.key)} className={"rh-collection-card rh-collection-card-tape rh-collection-card-"+(index+1)} key={choice.key}>
              <div className="collection-media"><img src={choice.image} srcSet={choice.imageSrcSet} sizes="(max-width: 550px) 48vw, (max-width: 1000px) 48vw, 33vw" alt={choice.alt} loading="lazy" decoding="async"/>
                <span className="rh-length-tag">{choice.label}</span>
                <BlackFridayBadge/>
              </div>
              <div className="collection-caption">
                <div className="rh-collection-card-copy"><span className="rh-collection-card-kicker">TAPE-IN EXTENSIONS</span>
                  <h3>Tape-in Extensions</h3>
                  <span className="rh-home-product-spec">{choice.label} · {tape?.pack||"10 Tape-ins"}</span>
                  <CollectionPrice product={tape} length={choice.key} verified={verified}/>
                  <span className="rh-home-product-cta">Farbe wählen <ArrowUpRight size={15}/></span>
                </div>
                <span className="round-arrow" aria-hidden="true"><ArrowUpRight size={20}/></span>
              </div>
            </Link>)}
            <Link prefetch={false} className="rh-collection-card rh-collection-card-keratin" href="/kollektionen/keratin-bondings/">
              <div className="collection-media"><img src="/assets/ruby-home-keratin-hq.webp" width={1300} height={1950} alt="Ruby Hair Keratin Bondings aus Echthaar – echte dunkelbraune Produktfotografie" loading="lazy" decoding="async"/>
                <span className="rh-length-tag">KERATIN</span>
                <BlackFridayBadge/>
              </div>
              <div className="collection-caption">
                <div className="rh-collection-card-copy"><span className="rh-collection-card-kicker">KERATIN EXTENSIONS</span>
                  <h3>Keratin Bondings</h3>
                  <span className="rh-home-product-spec">55–60 cm · {keratin?.pack||"25 Bondings"}</span>
                  <CollectionPrice product={keratin} length="55-60-cm" verified={verified}/>
                  <span className="rh-home-product-cta">Farbe wählen <ArrowUpRight size={15}/></span>
                </div>
                <span className="round-arrow" aria-hidden="true"><ArrowUpRight size={20}/></span>
              </div>
            </Link>
          </div>
          <p className="rh-home-price-note">Alle Preise inkl. 19 % MwSt., zzgl. <Link href="/versand-zahlung/">Versandkosten</Link>.</p>
        </div>
      </section>
      <section className="rh-keratin-editorial" aria-labelledby="rh-keratin-editorial-title">
        <div className="container">
          <div className="rh-keratin-editorial-heading">
            <div><span>RUBY HAIR / ORIGINAL PRODUKTFOTOGRAFIE</span><h2 id="rh-keratin-editorial-title">Keratin in <i>echten Nuancen.</i></h2></div>
            <Link prefetch={false} href="/kollektionen/keratin-bondings/">Keratin entdecken <ArrowUpRight size={17}/></Link>
          </div>
          <div className="rh-keratin-editorial-photos">
            <figure><img src="/assets/ruby-customer-keratin-4.webp" loading="lazy" width={1400} height={1950} alt="Ruby Hair Keratin Bondings, dunkler Braunton, echtes Produktfoto"/><figcaption>BRUNETTE / KERATIN BONDINGS</figcaption></figure>
            <figure><img src="/assets/ruby-customer-keratin-60.webp" loading="lazy" width={1400} height={1950} alt="Ruby Hair Keratin Bondings, heller Blondton und Zopf"/><figcaption>BLONDE / KERATIN BONDINGS</figcaption></figure>
            <figure><img src="/assets/ruby-customer-keratin-1006.webp" loading="lazy" width={1400} height={1950} alt="Ruby Hair Keratin Bondings, heller Farbton, echtes Produktfoto"/><figcaption>LIGHT / KERATIN BONDINGS</figcaption></figure>
          </div>
        </div>
      </section>
      <ShadeSelector product={tape} verified={verified}/>
      <section className="rh-tape-originals" aria-labelledby="rh-tape-originals-title">
       <div className="container">
        <div className="rh-tape-originals-heading">
         <div><span>RUBY HAIR · ORIGINALE PRODUKTAUFNAHMEN</span><h2 id="rh-tape-originals-title">Dein Farbton. <i>Dein Look.</i></h2></div>
         <p>Entdecke fünf echte Tape-in Farbtöne aus unserer Kollektion. Jedes Foto zeigt genau den bezeichneten Farbton.</p>
        </div>
        <div className="rh-tape-originals-grid">
         {customerTapePhotos.map(item=><Link prefetch={false} key={item.code} href={"/produkt/tape-in-extensions/?farbe="+encodeURIComponent(item.code)}>
          <img src={item.image} alt={"Originale Ruby Hair Tape-in Extensions – Farbton "+item.name} width={1433} height={2150} loading="lazy" decoding="async"/>
          <span>FARBTON {item.name.toUpperCase()} <ArrowUpRight size={16}/></span>
         </Link>)}
        </div>
       </div>
      </section>
      <InstagramHome posts={instagramPosts}/>
      <TapeInAtelier/>
      <section className="brand-story section-pad" id="about"><div className="container brand-grid">
        <div className="brand-copy">
          <div className="eyebrow"><span className="num">04 /</span> BEHIND THE BEAUTY</div>
          <h2>Not just hair.<br/><i>A feeling.</i></h2>
          <p>Schönes Haar verändert nicht nur deinen Look. Es verändert, wie du dich fühlst.</p>
          <p>Ruby Hair steht für erstklassige Echthaar-Extensions, natürliche Ergebnisse und kompromisslose Qualität.</p>
          <p>Entdecke deine perfekte Haarverlängerung – online oder bei einer persönlichen Beratung in unserem Studio in Essen.</p>
          <Link prefetch={false} href="/kontakt/" className="under-button">PERSÖNLICHE BERATUNG <ArrowUpRight size={16}/></Link>
          <div className="brand-signature">RUBY HAIR<br/><span>EXTENSIONS · ESSEN</span></div>
        </div>
        <div className="brand-portrait">
          <img src="/assets/story-blonde.webp" loading="lazy" alt="Langes champagnerblondes Haar" width={1122} height={1402}/>
          <div className="brand-photo-caption"><span>THE BEAUTY OF INDIVIDUALITY</span><span>RUBY HAIR · EDITORIAL 02</span></div>
        </div>
      </div></section>
      <section className="rh-home-gift-promo"><div className="rh-home-gift-promo-inner"><div><span>RUBY HAIR · GESCHENKGUTSCHEIN</span><h2>Beauty, die man <em>verschenken</em> kann.</h2><p>Ein Geschenk, das sich ganz persönlich anfühlt. Mit deinem Wunschbetrag, liebevollen Worten und einem Design, das bleibt.</p><Link prefetch={false} href="/geschenkgutschein/">Geschenk gestalten <ArrowRight size={18}/></Link></div><div className="rh-home-gift-mini-card"><img src="/media/RubyHair-WebHeader-Logo-Hell-818376d91.png" width={478} height={121} alt="Ruby Hair Extensions"/><strong>Geschenkgutschein</strong><small>50 € · 100 € · 200 € · Wunschbetrag</small></div></div></section>
    </main>
    <HomeFooter/>
  </>;
}
