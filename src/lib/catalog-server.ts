import "server-only";
import { databaseConfigured, getPrisma } from "@/lib/prisma";
import { products as importedProducts, type Product, type Variation } from "@/lib/catalog";

export async function getStoreCatalog():Promise<{source:"postgresql"|"imported-preview";products:Product[]}>{
  if(!databaseConfigured()){
    return { source:"imported-preview", products:importedProducts };
  }
  // Fail closed on a configured but unavailable database: no silent stale price/stock.
  const dbProducts=await getPrisma().product.findMany({
    where:{active:true},include:{variants:{orderBy:{legacyId:"asc"}}},orderBy:{name:"asc"}
  });
  const products:Product[]=dbProducts.map(p=>{
    const variations:Variation[]=p.variants.map(v=>({
      id:v.legacyId ?? -1,
      color:v.colorCode,color_label:v.colorLabel,
      length:v.lengthCode,length_label:v.lengthLabel,
      price:v.priceCents/100,
      available:v.active&&(v.stockQuantity===null||v.stockQuantity>0),
      purchasable:v.active&&(v.stockQuantity===null||v.stockQuantity>0),
      stock_quantity:v.stockQuantity,
      image:v.image
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
  return {source:"postgresql",products};
}
export async function getStoreProduct(slug:string){
  const catalog=await getStoreCatalog();
  return catalog.products.find(p=>p.slug===slug);
}
