import type {Metadata} from "next";
import Link from "next/link";
import ShopLayout from "@/components/site-shell";
import {ProductSearch} from "@/components/product-search";
import {getStoreCatalog} from "@/lib/catalog-server";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Produkte & Farben suchen"};
export default async function Search({searchParams}:{searchParams:Promise<{q?:string}>}){
  const {q}=await searchParams;
  const {products}=await getStoreCatalog();
  return <ShopLayout>
    <section className="rh-category-intro rh-shell">
      <nav className="rh-breadcrumb"><Link href="/">Startseite</Link><span>/</span><span>Suche</span></nav>
      <div className="rh-eyebrow">RUBY HAIR / PRODUKTSUCHE</div>
      <h1>Finde deinen <em>Shade.</em></h1>
      <p>Suche nach Keratin, Tape-in oder deiner Lieblingshaarfarbe.</p>
    </section>
    <ProductSearch initialQuery={q||""} products={products}/>
  </ShopLayout>;
}
