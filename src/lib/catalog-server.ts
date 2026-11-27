import "server-only";
import {unstable_cache} from "next/cache";
import {cache} from "react";
import {retryReadOnly} from "@/lib/db-read-retry";
import {singleFlight} from "@/lib/single-flight";
import { databaseConfigured, getPrisma } from "@/lib/prisma";
import { products as importedProducts, type Product, type Variation } from "@/lib/catalog";
import {customerTapeMainImage} from "@/lib/customer-tape-images";
import {blackFridayCatalog} from "@/lib/black-friday";

// Share one bounded read across marketing pages and serverless requests.
// The provider pool intermittently reports P1001/P2024; frequent 15-second
// revalidations amplified the load. Catalog is now refreshed every minute.
// Customer cart quotations and checkout still validate real stock and prices.
// Checkout, reservations and payments NEVER use this read cache.
// Administrator writes invalidate the tag immediately.
const readLiveProducts=singleFlight(async ():Promise<Product[]>=>{
  const dbProducts=await retryReadOnly(()=>getPrisma().product.findMany({
    where:{active:true},include:{variants:{orderBy:{legacyId:"asc"}}},orderBy:{name:"asc"}
  }),{report:code=>console.warn("RUBY_CATALOG_READ_RETRY",{code})});
  const products:Product[]=dbProducts.map(p=>{
    const variations:Variation[]=p.variants.map(v=>({
      id:v.legacyId ?? -1,
      color:v.colorCode,color_label:v.colorLabel,
      length:v.lengthCode,length_label:v.lengthLabel,
      price:v.priceCents/100,
      available:v.active&&(v.stockQuantity===null||v.stockQuantity>0),
      purchasable:v.active&&(v.stockQuantity===null||v.stockQuantity>0),
      stock_quantity:v.stockQuantity,
      image:customerTapeMainImage(p.slug,v.colorCode,v.image)
    }));
    const prices=variations.filter(v=>v.available).map(v=>v.price);
    return {
      id:p.legacyId??-1,
      slug:p.slug,name:p.name,original_name:p.originalName,
      headline:p.headline,intro:p.intro,pack:p.pack,material:p.material,
      currency:p.currency,image:p.image,
      min_price:prices.length?Math.min(...prices):0,
      max_price:prices.length?Math.max(...prices):0,
      variations
    };
  });
  return products;
});
const liveProducts=unstable_cache(async()=>readLiveProducts(),["rubyhair-live-store-catalog-v3",process.env.RUBY_SELFHOST_DB?"selfhost":"managed"],{revalidate:60,tags:["rubyhair-live-catalog"]});
export const getStoreCatalog=cache(async ():Promise<{source:"postgresql"|"imported-preview";products:Product[]}>=>{
  if(!databaseConfigured())return {source:"imported-preview",products:importedProducts};
  // A failed database read still fails closed; never display fabricated stock.
  return {source:"postgresql",products:await liveProducts()};
});
export async function getStoreProduct(slug:string){
  const catalog=await getStoreCatalog();
  return blackFridayCatalog(catalog.products).find(p=>p.slug===slug);
}
