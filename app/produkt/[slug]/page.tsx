import {notFound} from "next/navigation";
import type {Metadata} from "next";
import ShopLayout from "@/components/site-shell";
import {products} from "@/lib/catalog";
import {getStoreProduct} from "@/lib/catalog-server";
export const dynamic="force-dynamic";
import {ProductDetail} from "@/components/product-detail";
type Params={params:Promise<{slug:string}>,searchParams:Promise<{farbe?:string;laenge?:string}>};
export function generateStaticParams(){return products.map(p=>({slug:p.slug}));}
export async function generateMetadata({params}:Params):Promise<Metadata>{
  return {title:(await getStoreProduct((await params).slug))?.name||"Produkt"};
}
export default async function ProductPage({params,searchParams}:Params){
  const product=await getStoreProduct((await params).slug);
  if(!product)notFound();
  const {farbe,laenge}=await searchParams;
  return <ShopLayout><ProductDetail product={product} initialColor={farbe} initialLength={laenge}/></ShopLayout>;
}
