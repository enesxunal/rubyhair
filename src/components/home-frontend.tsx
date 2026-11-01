"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {Search,ShoppingBag,Menu,X,ArrowUpRight,ArrowRight,Instagram,Sparkles} from "lucide-react";
import {useCart} from "@/components/cart-context";
import {euros,type Product,colorsFor} from "@/lib/catalog";

const darkLogo="/media/RubyHair-WebHeader-Logo-Dunkel-70efc2b6a.png";
const lightLogo="/media/RubyHair-WebHeader-Logo-Hell-818376d91.png";
const nav=[
  {href:"/kollektionen/",title:"ALLE EXTENSIONS"},
  {href:"/kollektionen/keratin-bondings/",title:"KERATIN BONDINGS"},
  {href:"/kollektionen/tape-in-extensions/",title:"TAPE-IN EXTENSIONS"},
  {href:"/suche/",title:"HAARFARBEN"},
  {href:"#studio",title:"BERATUNG"}
];
const shades=[
  {key:"brown",title:"Brown",background:"#5e483a",image:"/media/6-1-scaled-ffe6f9676.jpg",color:"6",slug:"keratin-bondings"},
  {key:"bronde",title:"Bronde",background:"#a28765",image:"/media/bronde-1-scaled-ae3a52b00.jpg",color:"bronde",slug:"tape-in-extensions"},
  {key:"blonde",title:"Blonde",background:"#d7c2a1",image:"/media/60-3-scaled-e99a55c0d.jpg",color:"60",slug:"tape-in-extensions"},
  {key:"ash",title:"Ash",background:"#b4ada5",image:"/media/silber-1-scaled-7627ffcff.jpg",color:"silver",slug:"tape-in-extensions"}
];
const categoryMeta=[
  {slug:"keratin-bondings",tag:"LANGANHALTEND & VIELSEITIG",image:"/media/keratin-bonding-bg-2c257f54c.png"},
  {slug:"tape-in-extensions",tag:"FLEXIBEL & NATÜRLICH",image:"/media/tape-in-extensions-bg-17a4f5094.png"}
];

function HomeNavigation(){
  const [menuOpen,setMenuOpen]=useState(false);
  const {count}=useCart();
  useEffect(()=>{
    const esc=(e:KeyboardEvent)=>{if(e.key==="Escape")setMenuOpen(false)};
    window.addEventListener("keydown",esc);
    return ()=>window.removeEventListener("keydown",esc);
  },[]);
  return <>
    <div className="site-top" aria-label="Markeninformation">
      <span>THE RUBY HAIR EXPERIENCE</span>
      <span className="top-star"><Sparkles size={13}/></span>
      <span>PREMIUM ECHTHAAR EXTENSIONS</span>
      <Link href="#studio">ENTDECKE UNS IN ESSEN <ArrowUpRight size={14}/></Link>
    </div>
    <header className="site-header" id="top">
      <div className="head-main container-wide">
        <div className="head-left">
          <button className="icon-button menu-trigger" type="button"
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
    <aside className={"mobile-menu"+(menuOpen?" open":"")} id="mobile-menu" aria-label="Mobiles Menü" aria-hidden={!menuOpen}>
      <div className="mobile-menu-head"><img src={darkLogo} alt="Ruby Hair"/><button type="button" onClick={()=>setMenuOpen(false)} aria-label="Menü schließen"><X size={24}/></button></div>
      <span className="eyebrow">RUBY HAIR</span>
      {nav.map(item=><Link key={item.href} href={item.href} onClick={()=>setMenuOpen(false)}>{item.title} <ArrowRight size={17}/></Link>)}
      <Link href="/warenkorb/" onClick={()=>setMenuOpen(false)}>WARENKORB ({count}) <ArrowRight size={17}/></Link>
      <div className="mobile-menu-foot">YOUR HAIR. YOUR SIGNATURE.</div>
    </aside>
  </>;
}

function Favorites({products}:{products:Product[]}){
  const cards=[
    {slug:"keratin-bondings",color:"6",caption:"Natürliches Finish"},
    {slug:"tape-in-extensions",color:"silver",caption:"Flexibel kombinierbar"},
    {slug:"keratin-bondings",color:"ruby",caption:"Farbnuancen entdecken"},
    {slug:"tape-in-extensions",color:"60",caption:"Für deinen Signature Look"}
  ];
  const resolved=cards.map((c,i)=>{
    const product=products.find(p=>p.slug===c.slug);
    const variant=product?.variations.find(v=>v.color===c.color&&v.available);
    return {i,product,variant,caption:c.caption};
  }).filter(item=>item.product&&item.variant);
  return <section className="favorites section-pad" id="bestsellers">
    <div className="container">
      <div className="section-heading spread">
        <div><div className="eyebrow"><span className="num">02 /</span> UNSERE FAVORITEN</div><h2>Dein neuer <i>Lieblingslook.</i></h2></div>
        <Link className="under-button" href="/kollektionen/">Alle Extensions entdecken <ArrowUpRight size={16}/></Link>
      </div>
      <div className="products">
        {resolved.map(({i,product,variant,caption})=><Link key={i} className="product"
          href={"/produkt/"+product!.slug+"/?farbe="+encodeURIComponent(variant!.color)}>
          <div className="product-media">
            <img loading="lazy" src={variant!.image} alt={product!.name+" Farbe "+variant!.color_label}/>
            {i===0&&<span className="product-label">THE RUBY EDIT</span>}
            <span className="product-quick">FARBE ANSEHEN <ArrowUpRight size={16}/></span>
          </div>
          <div className="product-detail">
            <span>{String(i+1).padStart(2,"0")} / {product!.name.toUpperCase()}</span>
            <h3>{product!.name}</h3>
            <p>{variant!.color_label} · ab {euros(variant!.price)} · {caption}</p>
          </div>
        </Link>)}
      </div>
    </div>
  </section>;
}

function ShadeSelector(){
  const [index,setIndex]=useState(0);
  const active=shades[index];
  return <section id="shade" className="shade section-pad">
    <div className="container shade-grid">
      <div className="shade-visual">
        <img key={active.key} loading="lazy" src={active.image} alt={"Ruby Hair Farbton "+active.title}/>
        <span className="shade-vertical">YOUR PERFECT SHADE</span>
        <div className="shade-counter">{String(index+1).padStart(2,"0")} / 04</div>
      </div>
      <div className="shade-copy">
        <div className="eyebrow"><span className="num">03 /</span> FIND YOUR SHADE</div>
        <h2>Deine Farbe.<br/><i>Dein Moment.</i></h2>
        <p>Von tiefem Braun bis zu kühlem Blond: Entdecke unsere Haarfarben und finde deinen persönlichen Favoriten.</p>
        <p className="shade-caption">WÄHLE DEINE FARBFAMILIE</p>
        <div className="shade-pills" role="group" aria-label="Haarfarben auswählen">
          {shades.map((shade,i)=><button type="button" key={shade.key}
            className={i===index?"selected":""} aria-pressed={i===index} onClick={()=>setIndex(i)}>
            <b style={{background:shade.background}}/> {shade.title}
          </button>)}
        </div>
        <p className="shade-disclaimer">Farbdarstellung kann je nach Bildschirm abweichen. Die Auswahl dient als Inspiration.</p>
        <Link className="solid-button shade-button" href={"/produkt/"+active.slug+"/?farbe="+active.color}>
          FARBE {active.title.toUpperCase()} ANSEHEN <ArrowUpRight size={17}/>
        </Link>
      </div>
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
          <Link href="/kollektionen/keratin-bondings/">Keratin Bondings</Link>
          <Link href="/kollektionen/tape-in-extensions/">Tape-in Extensions</Link>
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
          <Link href="#about">Unsere Story</Link>
          <Link href="#studio">Studio in Essen</Link>
          <Link href="/kontakt/">Kontakt</Link>
          <a href="https://www.instagram.com/rubyhair.de/" target="_blank" rel="noopener noreferrer">Instagram <ArrowUpRight size={15}/></a>
        </div>
      </div>
      <div className="container footer-bottom"><span>© 2026 RUBY HAIR · DESIGNKONZEPT</span>
        <div><Link href="/rechtliches/impressum/">IMPRESSUM</Link><Link href="/rechtliches/datenschutz/">DATENSCHUTZ</Link><Link href="/rechtliches/agb/">AGB</Link></div>
        <span>MADE FOR BEAUTIFUL HAIR.</span>
      </div>
    </footer>
    <div className="prototype-note">DESIGNVORSCHAU · BESTELLUNGEN UND ZAHLUNGEN NOCH NICHT FREIGEGEBEN</div>
  </>;
}
export default function HomeFrontend({products}:{products:Product[]}){
  return <>
    <HomeNavigation/>
    <main>
      <section className="hero" id="home">
        <div className="hero-photo">
          <img className="hero-primary" src="/assets/hero-brunette.webp"
            alt="Ruby Hair Model mit schokoladenbraunen Haaren" width={1672} height={941} fetchPriority="high"/>
          <div className="photo-number">01 / COLLECTION 2026</div>
          <div className="hero-stamp">BEAUTY IS<br/><em>YOUR STORY.</em><Sparkles size={24}/></div>
        </div>
        <div className="hero-copy">
          <div className="hero-kicker"><span className="kicker-line"/> RUBY HAIR · THE ART OF EXTENSIONS</div>
          <h1>Beautiful hair.<br/><i>Made simple.</i></h1>
          <p>Hochwertige Echthaar-Extensions für deinen individuellen Look. Entdecke deine Lieblingsfarbe und finde die passende Methode.</p>
          <div className="hero-links">
            <Link href="/kollektionen/" className="solid-button">JETZT EXTENSIONS ENTDECKEN <ArrowUpRight size={18}/></Link>
            <Link href="/kontakt/" className="under-button">Persönliche Beratung <ArrowRight size={15}/></Link>
          </div>
          <div className="hero-aside"><span className="hero-scroll">SCROLL TO DISCOVER ↓</span><span>ESSEN · GERMANY</span></div>
        </div>
      </section>
      <section id="collections" className="collections section-pad"><div className="container">
        <div className="section-heading spread">
          <div><div className="eyebrow"><span className="num">01 /</span> SHOP THE COLLECTION</div><h2>Finde deine <i>Extensions.</i></h2></div>
          <p>Zwei Methoden, viele Möglichkeiten. Wähle die passende Extension für deinen Look.</p>
        </div>
        <div className="collection-grid">
          {categoryMeta.map((cat,index)=>{
            const product=products.find(p=>p.slug===cat.slug);
            if(!product)return null;
            return <Link href={"/kollektionen/"+cat.slug+"/"} className={index===0?"collection-large":"collection-small"} key={cat.slug}>
              <div className="collection-media">
                <img loading="lazy" src={cat.image} alt={product.name+" Echthaar"}/>
                <span className="collection-index">0{index+1} / THE COLLECTION</span>
              </div>
              <div className="collection-caption">
                <div><span>{cat.tag}</span><h3>{cat.slug==="keratin-bondings"?<>Keratin <i>Bondings.</i></>:<>Tape-in <i>Extensions.</i></>}</h3></div>
                <span className="round-arrow"><ArrowUpRight size={21}/></span>
              </div>
            </Link>
          })}
        </div>
      </div></section>
      <Favorites products={products}/>
      <ShadeSelector/>
      <section className="brand-story section-pad" id="about"><div className="container brand-grid">
        <div className="brand-copy">
          <div className="eyebrow"><span className="num">04 /</span> BEHIND THE BEAUTY</div>
          <h2>Not just hair.<br/><i>A feeling.</i></h2>
          <p>Schönes Haar ist persönlich. Bei Ruby Hair dreht sich alles um die Freiheit, deinen ganz eigenen Look zu kreieren.</p>
          <p>Entdecke echte Haarqualität und persönliche Beratung direkt in unserem Studio in Essen.</p>
          <Link href="/kontakt/" className="under-button">MEHR ÜBER RUBY HAIR <ArrowUpRight size={16}/></Link>
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
    </main>
    <HomeFooter/>
  </>;
}
