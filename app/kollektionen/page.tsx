import Link from "next/link";
import type {Metadata} from "next";
import ShopLayout from "@/components/site-shell";
import {euros} from "@/lib/catalog";
import {getStoreCatalog} from "@/lib/catalog-server";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Alle Extensions"};
export default async function Collections(){
  const {products}=await getStoreCatalog();
  return <ShopLayout>
    <section className="rh-landing"><div className="rh-shell">
      <div className="rh-eyebrow">THE RUBY EDIT / UNSERE KOLLEKTIONEN</div>
      <h1>Dein Haar.<br/><em>Deine Wahl.</em></h1>
      <p>Weniger suchen, mehr entdecken. Wähle die Extensions, die zu dir passen.</p>
    </div></section>
    <section className="rh-categories rh-shell" aria-label="Extension Kategorien">
      {[...products].reverse().map((p,i)=><Link href={"/kollektionen/"+p.slug+"/"} className="rh-category-tile" key={p.slug}>
        <div className="rh-category-photo"><img src={p.image} alt={p.name}/></div>
        <div className="rh-category-label"><div><span>0{i+1} / KOLLEKTION</span><h2>{p.name}</h2>
          <p>100 % Echthaar · ab {euros(p.min_price)}</p></div><span className="rh-arrow">↗</span></div>
      </Link>)}
    </section>
    <section className="rh-collection-compare rh-shell" aria-labelledby="rh-compare-title">
      <div className="rh-section-heading"><div><span className="rh-eyebrow">DEINE METHODE / DEINE WAHL</span>
        <h2 id="rh-compare-title">Welche Extensions <em>passen zu dir?</em></h2></div>
        <p>Die Unterschiede auf einen Blick. Ob Tape-in oder Keratin: Die passende Methode hängt von deinem Eigenhaar und dem gewünschten Ergebnis ab.</p></div>
      <div className="rh-compare-grid">
        {[...products].filter(p=>["tape-in-extensions","keratin-bondings"].includes(p.slug)).sort((a,b)=>a.slug==="tape-in-extensions"?-1:b.slug==="tape-in-extensions"?1:0).map(p=><article key={p.slug} className="rh-compare-item">
          <div className="rh-eyebrow">{p.slug==="tape-in-extensions"?"01 / TAPE-IN":"02 / KERATIN"}</div>
          <h3>{p.name}</h3>
          <p>{p.slug==="tape-in-extensions"?"Flache Tape-Verbindungen unter dem Deckhaar. Die Anwendung erfolgt in einzelnen Tape-Strähnen.":"Einzelne Bondings werden Strähne für Strähne eingearbeitet."}</p>
          <dl><div><dt>Packungsinhalt</dt><dd>{p.pack} pro Packung</dd></div><div><dt>Verfügbare Längen im Katalog</dt><dd>{Array.from(new Set(p.variations.filter(v=>v.available).map(v=>v.length_label))).join(" · ")||"Auf Anfrage"}</dd></div></dl>
          <Link href={"/produkt/"+p.slug+"/"}>FARBEN & LÄNGEN ANSEHEN <span aria-hidden="true">↗</span></Link>
        </article>)}
      </div>
      <p className="rh-compare-note">Hinweis: Die hier gezeigten Varianten stammen aus dem bestehenden Ruby Hair Katalog. Die endgültige Verfügbarkeit wird vor dem Verkaufsstart bestätigt. <Link href="/kontakt/">Beratung anfragen</Link></p>
    </section>
    <section className="rh-support-strip"><div className="rh-shell"><span>100 % ECHTHAAR</span><span>FARBE WÄHLEN</span><span>PASSENDEN LOOK FINDEN</span></div></section>
  </ShopLayout>;
}
