import {notFound} from "next/navigation";
import type {Metadata} from "next";
import ShopLayout from "@/components/site-shell";
import {products} from "@/lib/catalog";
import {getStoreProduct} from "@/lib/catalog-server";
export const dynamic="force-dynamic";
import {ProductDetail} from "@/components/product-detail";
import {absoluteSiteUrl} from "@/lib/seo";
type Params={params:Promise<{slug:string}>,searchParams:Promise<{farbe?:string;laenge?:string}>};
export function generateStaticParams(){return products.map(p=>({slug:p.slug}));}
export async function generateMetadata({params}:Params):Promise<Metadata>{
  const product=await getStoreProduct((await params).slug);
  return {title:product?.name||"Produkt",
    description:product?.intro,
    alternates:{canonical:`/produkt/${product?.slug||""}/`},
    ...(product?.slug==="keratin-bondings"?{robots:{index:false,follow:false}}:{})};
}
export default async function ProductPage({params,searchParams}:Params){
  const product=await getStoreProduct((await params).slug);
  if(!product)notFound();
  const {farbe,laenge}=await searchParams;
  const structured={
    "@context":"https://schema.org", "@type":"Product",
    "name":product.name,"description":product.intro,
    "image":[absoluteSiteUrl(product.image)],
    "brand":{"@type":"Brand","name":"Ruby Hair"},
    "material":"100% Echthaar",
    "url":absoluteSiteUrl(`/produkt/${product.slug}/`)
    // Intentional: no Offer/availability/reviews until approved prices, stock and checkout exist.
  };
  return <ShopLayout>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structured).replace(/</g,"\\u003c")}}/>
    <ProductDetail product={product} initialColor={farbe} initialLength={laenge}/>
  </ShopLayout>;
}
