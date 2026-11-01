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
    <section className="rh-support-strip"><div className="rh-shell"><span>100 % ECHTHAAR</span><span>FARBE WÄHLEN</span><span>PASSENDEN LOOK FINDEN</span></div></section>
  </ShopLayout>;
}
