import {notFound} from "next/navigation";
import type {Metadata} from "next";
import ShopLayout from "@/components/site-shell";
import {bySlug,products} from "@/lib/catalog";
import {ProductDetail} from "@/components/product-detail";
type Params={params:Promise<{slug:string}>,searchParams:Promise<{farbe?:string}>};
export function generateStaticParams(){return products.map(p=>({slug:p.slug}));}
export async function generateMetadata({params}:Params):Promise<Metadata>{
  return {title:bySlug((await params).slug)?.name||"Produkt"};
}
export default async function ProductPage({params,searchParams}:Params){
  const product=bySlug((await params).slug);
  if(!product)notFound();
  const {farbe}=await searchParams;
  return <ShopLayout><ProductDetail product={product} initialColor={farbe}/></ShopLayout>;
}
