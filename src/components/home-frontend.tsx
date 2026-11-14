"use client";

import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {Search,ShoppingBag,Menu,X,ArrowUpRight,ArrowRight,Instagram,Sparkles} from "lucide-react";
import {useCart} from "@/components/cart-context";
import {type Product} from "@/lib/catalog";
import {tapeInLengths,tapeInLengthHref} from "@/lib/tape-in-lengths";
import CookieSettingsLink from "@/components/cookie-settings-link";
import InstagramHome from "@/components/instagram-home";
import InfluencerStories from "@/components/influencer-stories";
import type {InstagramFeedPost} from "@/lib/instagram-feed";

const darkLogo="/media/RubyHair-WebHeader-Logo-Dunkel-70efc2b6a.png";
const lightLogo="/media/RubyHair-WebHeader-Logo-Hell-818376d91.png";
const nav=[
  {href:"/kollektionen/",title:"ALLE EXTENSIONS"},
  {href:tapeInLengthHref("45-50-cm"),title:"TAPE-IN 45–50 CM"},
  {href:tapeInLengthHref("55-60-cm"),title:"TAPE-IN 55–60 CM"},
  {href:"/suche/",title:"HAARFARBEN"},
  {href:"/kontakt/",title:"BERATUNG"}
];
const shades=[
  {key:"brown",title:"Brown",background:"#5e483a",image:"/media/6-1-scaled-ffe6f9676.jpg",color:"6",slug:"tape-in-extensions"},
  {key:"bronde",title:"Bronde",background:"#a28765",image:"/media/bronde-1-scaled-ae3a52b00.jpg",color:"bronde",slug:"tape-in-extensions"},
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
      <Link href="/#studio">ENTDECKE UNS IN ESSEN <ArrowUpRight size={14}/></Link>
    </div>
    <header className="site-header" id="top">
      <div className="head-main container-wide">
        <div className="head-left">
          <button ref={menuTrigger} className="icon-button menu-trigger" type="button"
            aria-label="Menü öffnen" aria-controls="mobile-menu" aria-expanded={menuOpen}
            onClick={()=>setMenuOpen(true)}><Menu size={23}/></button>
          <Link className="head-search" href="/suche/" aria-label="Produktsuche öffnen">
            <Search size={20}/><span>Wonach suchst du?</span>
          </Link>
        </div>
        <Link className="brand-logo" href="/" aria-label="Ruby Hair – Startseite">
          <img src={darkLogo} alt="RUBY HAIR EXTENSIONS"/>
        </Link>
        <div className="head-right">
          <Link href="/kontakt/" className="head-consult">
            <span className="small">HAST DU FRAGEN?</span>
            <strong>Wir beraten dich <ArrowUpRight size={15}/></strong>
          </Link>
          <Link href="/suche/" className="icon-button search-mobile" aria-label="Produktsuche öffnen"><Search size={22}/></Link>
          <Link className="icon-button" href="/warenkorb/" aria-label={"Warenkorb öffnen, "+count+" Artikel"}>
            <ShoppingBag size={23}/>{count>0&&<span className="cart-count">{count}</span>}
          </Link>
        </div>
      </div>
      <nav className="desktop-nav" aria-label="Hauptnavigation">
        {nav.map(item=><Link key={item.href} href={item.href}>{item.title}</Link>)}
      </nav>
    </header>
    <div className="mobile-shade" hidden={!menuOpen} onClick={()=>setMenuOpen(false)}/>
    <aside ref={menuPanel} className={"mobile-menu"+(menuOpen?" open":"")} id="mobile-menu" role="dialog" aria-modal={menuOpen} aria-label="Mobiles Menü" aria-hidden={!menuOpen} inert={!menuOpen}>
      <div className="mobile-menu-head"><img src={darkLogo} alt="Ruby Hair"/><button ref={menuClose} type="button" onClick={()=>setMenuOpen(false)} aria-label="Menü schließen"><X size={24}/></button></div>
      <span className="eyebrow">RUBY HAIR</span>
      {nav.map(item=><Link key={item.href} href={item.href} onClick={()=>setMenuOpen(false)}>{item.title} <ArrowRight size={17}/></Link>)}
      <Link href="/warenkorb/" onClick={()=>setMenuOpen(false)}>WARENKORB ({count}) <ArrowRight size={17}/></Link>
      <div className="mobile-menu-foot">YOUR HAIR. YOUR SIGNATURE.</div>
    </aside>
  </>;
}

function ShadeSelector(){
  const [index,setIndex]=useState(0);
  const active=shades[index];
  return <section id="shade" className="shade section-pad">
    <div className="container shade-grid">
      <div className="shade-visual">
        <img key={active.key} loading="lazy" src={active.image} alt={"Ruby Hair Farbton "+active.title}/>
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
        <Link className="solid-button shade-button" href={"/produkt/"+active.slug+"/?farbe="+active.color}>
          FARBE ANSEHEN <ArrowUpRight size={17}/>
        </Link>
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
        <p>Ein Blick auf die feinen Nuancen und den natürlichen Fall unserer Tape-in Extensions. Finde die passende Länge und entdecke die Farbvielfalt.</p>
        <Link href="/kollektionen/tape-in-extensions/" className="rh-tape-atelier-link">
          TAPE-IN ENTDECKEN <ArrowUpRight size={17} aria-hidden="true"/>
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
        <img src="/assets/ruby-hair-platinum-detail.webp"
          alt="Platinblonde Tape-in Haarsträhnen auf einer schwarzen skulpturalen Hand"
          loading="lazy" decoding="async" width={1024} height={1536}/>
        <figcaption><span>02 / THE DETAILS</span><span>TAPE-IN TEXTURE</span></figcaption>
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
          <Link href="/kollektionen/">Alle Extensions</Link>
          <Link href={tapeInLengthHref("45-50-cm")}>Tape-in 45–50 cm</Link>
          <Link href={tapeInLengthHref("55-60-cm")}>Tape-in 55–60 cm</Link>
          <Link href="/suche/">Farben entdecken</Link>
        </div>
        <div className="footer-col"><h3>INFORMATIONEN</h3>
          <Link href="/ratgeber/">Hair Guide</Link>
          <Link href="/kontakt/">Kundenservice</Link>
          <Link href="/versand-zahlung/">Versand & Zahlung</Link>
          <Link href="/rechtliches/widerruf/">Widerruf & Rückgabe</Link>
          <Link href="/rechtliches/agb/">AGB</Link>
        </div>
        <div className="footer-col"><h3>RUBY HAIR</h3>
          <Link href="/#about">Unsere Story</Link>
          <Link href="/#studio">Studio in Essen</Link>
          <Link href="/kontakt/">Kontakt</Link>
          <a href="https://www.instagram.com/rubyhair.de/" target="_blank" rel="noopener noreferrer">Instagram <ArrowUpRight size={15}/></a>
        </div>
      </div>
      <div className="container footer-bottom"><span>© 2026 RUBY HAIR · DESIGNKONZEPT</span>
        <div><Link href="/rechtliches/impressum/">IMPRESSUM</Link><Link href="/rechtliches/datenschutz/">DATENSCHUTZ</Link><Link href="/rechtliches/agb/">AGB</Link><CookieSettingsLink/></div>
        <span>MADE FOR BEAUTIFUL HAIR.</span>
      </div>
    </footer>
    <div className="prototype-note">DESIGNVORSCHAU · BESTELLUNGEN UND ZAHLUNGEN NOCH NICHT FREIGEGEBEN</div>
  </>;
}
export default function HomeFrontend({products,instagramPosts=[]}:{products:Product[];instagramPosts?:InstagramFeedPost[]}){
  return <>
    <HomeNavigation/>
    <main id="main">
      <Link className="hero rh-hero-product" id="home" href="/produkt/tape-in-extensions/?farbe=6&laenge=55-60-cm" aria-label="Tape-in Extensions entdecken, zum Produkt">
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
      <section id="collections" className="collections rh-length-collection section-pad" aria-labelledby="rh-home-lengths">
        <div className="container">
          <div className="section-heading"><h2 id="rh-home-lengths">Wähle deine <i>Länge.</i></h2></div>
          <div className="collection-grid">
            {tapeInLengths.map((choice,index)=><Link href={tapeInLengthHref(choice.key)} className={index===0?"collection-large":"collection-small"} key={choice.key}>
              <div className="collection-media"><img src={choice.image} alt={choice.alt} loading="lazy"/>
                <span className="rh-length-tag">{choice.label}</span>
              </div>
              <div className="collection-caption"><h3>{index===0?<>Tape-in <i>45–50 cm.</i></>:<>Tape-in <i>55–60 cm.</i></>}</h3>
                <span className="round-arrow"><ArrowUpRight size={21} aria-hidden="true"/></span>
              </div>
            </Link>)}
          </div>
          <Link className="rh-keratin-feature" href="/kollektionen/keratin-bondings/">
            <img src="/media/1006-300x400-0854ea8f2.jpg" alt="Keratin Bondings – Ruby Hair Echthaar" loading="lazy"/>
            <span><small>DIE DRITTE KOLLEKTION</small><strong>Keratin <i>Bondings.</i></strong><span>KERATIN ENTDECKEN <ArrowUpRight size={17}/></span></span>
          </Link>
        </div>
      </section>
      <ShadeSelector/>
      <TapeInAtelier/>
      <section className="brand-story section-pad" id="about"><div className="container brand-grid">
        <div className="brand-copy">
          <div className="eyebrow"><span className="num">04 /</span> BEHIND THE BEAUTY</div>
          <h2>Not just hair.<br/><i>A feeling.</i></h2>
          <p>Schönes Haar ist persönlich. Bei Ruby Hair dreht sich alles um die Freiheit, deinen ganz eigenen Look zu kreieren.</p>
          <p>Entdecke echte Haarqualität und persönliche Beratung direkt in unserem Studio in Essen.</p>
          <Link href="/kontakt/" className="under-button">KONTAKT & BERATUNG <ArrowUpRight size={16}/></Link>
          <div className="brand-signature">RUBY HAIR<br/><span>EXTENSIONS · ESSEN</span></div>
        </div>
        <div className="brand-portrait">
          <img src="/assets/story-blonde.webp" loading="lazy" alt="Langes champagnerblondes Haar" width={1122} height={1402}/>
          <div className="brand-photo-caption"><span>THE BEAUTY OF INDIVIDUALITY</span><span>RUBY HAIR · EDITORIAL 02</span></div>
        </div>
      </div></section>
      <section className="studio" id="studio">
        <div className="studio-image">
          <video src="/media/freecompress-rh-vid-baeabc7ed.mp4" playsInline autoPlay muted loop preload="metadata"
            aria-label="Einblicke in das Ruby Hair Studio in Essen"/>
          <div className="studio-video-caption">EIN BLICK IN UNSER STUDIO <ArrowUpRight size={17}/></div>
        </div>
        <div className="studio-content">
          <div className="eyebrow">RUBY HAIR · ESSEN</div>
          <h2>Beauty is better<br/><i>in person.</i></h2>
          <p>Du möchtest dich persönlich beraten lassen? Entdecke Ruby Hair in Essen und finde deinen neuen Lieblingslook.</p>
          <div className="studio-place">ESSEN · DEUTSCHLAND</div>
          <Link href="/kontakt/" className="light-button">KONTAKT & BERATUNG <ArrowUpRight size={17}/></Link>
        </div>
      </section>
      <InstagramHome posts={instagramPosts}/>
    </main>
    <HomeFooter/>
  </>;
}
