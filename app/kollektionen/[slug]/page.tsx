import Link from "next/link";
import type {Metadata} from "next";
import {notFound} from "next/navigation";
import ShopLayout from "@/components/site-shell";
import {products} from "@/lib/catalog";
import {getStoreProduct} from "@/lib/catalog-server";
export const dynamic="force-dynamic";
import {ShadeGrid} from "@/components/shade-grid";
import {tapeInLengths,tapeInLengthHref} from "@/lib/tape-in-lengths";
type Params={params:Promise<{slug:string}>;searchParams:Promise<{laenge?:string}>};
export function generateStaticParams(){return products.map(p=>({slug:p.slug}));}
export async function generateMetadata({params,searchParams}:Params):Promise<Metadata>{
  const product=await getStoreProduct((await params).slug);
  const {laenge}=await searchParams;
  const selected=product?.slug==="tape-in-extensions"?tapeInLengths.find(o=>o.key===laenge):undefined;
  return {title:selected?`${selected.title} · ${selected.label}`:product?.name||"Collection",
    description:selected?`${selected.title}: echte Ruby Hair Tape-in Haarverlängerungen in ${selected.label}. Farben entdecken.`:product?.intro,
    alternates:{canonical:selected?`/kollektionen/tape-in-extensions/?laenge=${selected.key}`:`/kollektionen/${product?.slug||""}/`},
    ...(product?.slug==="keratin-bondings"?{robots:{index:false,follow:false}}:{})};
}
export default async function Category({params,searchParams}:Params){
  const product=await getStoreProduct((await params).slug);
  if(!product)notFound();
  const {laenge}=await searchParams;
  const selected=product.slug==="tape-in-extensions"?tapeInLengths.find(o=>o.key===laenge):undefined;
  return <ShopLayout>
    <section className="rh-category-intro rh-shell">
      <nav className="rh-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Startseite</Link><span>/</span><Link href="/kollektionen/">Extensions</Link><span>/</span><span>{product.name}</span>
      </nav>
      <h1>{selected?selected.title:product.name}</h1>
      <p>{selected?`Tape-in Extensions · ${selected.label}`:product.intro}</p>
      {product.slug==="tape-in-extensions"&&<nav className="rh-length-switch" aria-label="Länge wählen">
        {tapeInLengths.map(item=><Link key={item.key} aria-current={laenge===item.key?"page":undefined} href={tapeInLengthHref(item.key)}>{item.title} <span>{item.label}</span></Link>)}
      </nav>}
    </section>
    <ShadeGrid product={product} selectedLength={selected?.key}/>
  </ShopLayout>;
}
