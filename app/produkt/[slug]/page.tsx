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
    openGraph:{title:product?.name||"Ruby Hair Extensions",description:product?.intro||"Ruby Hair Echthaar Extensions",images:product?[{url:product.image}]:[]}};
}
export default async function ProductPage({params,searchParams}:Params){
  const product=await getStoreProduct((await params).slug);
  if(!product)notFound();
  const {farbe,laenge}=await searchParams;
  const productUrl=absoluteSiteUrl(`/produkt/${product.slug}/`);
  const structured={
    "@context":"https://schema.org", "@type":"ProductGroup",
    "name":product.name,"description":product.intro,
    "productGroupID":`rubyhair-${product.slug}`,
    "image":[absoluteSiteUrl(product.image)],
    "brand":{"@type":"Brand","name":"Ruby Hair"},
    "material":product.material,
    "url":productUrl,
    "variesBy":["https://schema.org/color","https://schema.org/size"],
    "hasVariant":product.variations.filter(v=>v.id>0).map(v=>({
      "@type":"Product","name":`${product.name} – ${v.color_label} – ${v.length_label}`,
      "sku":`RH-${v.id}`,"color":v.color_label,"size":v.length_label,
      "image":absoluteSiteUrl(v.image),
      "offers":{"@type":"Offer","priceCurrency":"EUR","price":v.price.toFixed(2),
       "availability":v.purchasable?"https://schema.org/InStock":"https://schema.org/OutOfStock",
       "itemCondition":"https://schema.org/NewCondition",
       "url":productUrl+`?farbe=${encodeURIComponent(v.color)}&laenge=${encodeURIComponent(v.length)}`}
    }))
  };
  return <ShopLayout>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structured).replace(/</g,"\\u003c")}}/>
    <ProductDetail product={product} initialColor={farbe} initialLength={laenge}/>
  </ShopLayout>;
}
