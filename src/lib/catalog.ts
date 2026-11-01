import imported from "@/data/products.json";

export type Variation = {
  id: number; color: string; color_label: string; length: string;
  length_label: string; price: number; available: boolean;
  purchasable: boolean; image: string;
};
export type Product = {
  id: number; slug: string; name: string; original_name: string;
  headline: string; intro: string; pack: string; material: string;
  currency: string; image: string; min_price: number; max_price: number;
  variations: Variation[];
};
type SourceProduct = Product & { category: string };
const source = imported.products as Record<string, SourceProduct>;
export const products: Product[] = Object.values(source).map((item) => ({
  id:item.id,slug:item.slug,name:item.name,original_name:item.original_name,
  headline:item.headline,intro:item.intro,pack:item.pack,material:item.material,
  currency:item.currency,image:item.image,min_price:item.min_price,
  max_price:item.max_price,variations:item.variations
}));
export const bySlug = (slug: string) => products.find(item=>item.slug===slug);
export const byVariation = (id: number) => {
  for(const product of products) {
    const variation = product.variations.find(v=>v.id===id);
    if(variation)return {product,variation};
  }
  return null;
};
export const euros = (price: number) => new Intl.NumberFormat("de-DE",{
  style:"currency",currency:"EUR"
}).format(price);
export const colorsFor = (p:Product) => {
  const map = new Map<string,Variation[]>();
  for(const variant of p.variations) {
    const list = map.get(variant.color)||[];
    list.push(variant);
    map.set(variant.color,list);
  }
  return map;
};
export const productSnapshotTime = imported.synced_at;
