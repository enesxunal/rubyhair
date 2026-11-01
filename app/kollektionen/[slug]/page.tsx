import Link from "next/link";
import type {Metadata} from "next";
import {notFound} from "next/navigation";
import ShopLayout from "@/components/site-shell";
import {bySlug,products,euros} from "@/lib/catalog";
import {ShadeGrid} from "@/components/shade-grid";
type Params={params:Promise<{slug:string}>};
export function generateStaticParams(){return products.map(p=>({slug:p.slug}));}
export async function generateMetadata({params}:Params):Promise<Metadata>{
  const product=bySlug((await params).slug);
  return {title:product?.name||"Collection"};
}
export default async function Category({params}:Params){
  const product=bySlug((await params).slug);
  if(!product)notFound();
  return <ShopLayout>
    <section className="rh-category-intro rh-shell">
      <nav className="rh-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Startseite</Link><span>/</span><Link href="/kollektionen/">Extensions</Link><span>/</span><span>{product.name}</span>
      </nav>
      <div className="rh-eyebrow">THE RUBY EDIT / COLLECTION</div><h1>{product.name}</h1>
      <p>{product.intro}</p>
      <div className="rh-category-meta"><span>100 % Echthaar</span><span>{product.pack} pro Packung</span>
        <span>Ab {euros(product.min_price)}</span></div>
    </section>
    <ShadeGrid product={product}/>
  </ShopLayout>;
}
