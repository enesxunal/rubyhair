import type {Product} from "@/lib/catalog";
export function availableHomeVariants(product?:Product,length?:string,color?:string){
 return (product?.variations||[]).filter(v=>v.available&&v.purchasable&&(!length||v.length===length)&&(!color||v.color===color)&&Number.isFinite(v.price)&&v.price>0);
}
export function homeCollectionSummary(product?:Product,length?:string){
 const available=availableHomeVariants(product,length);
 return {colors:new Set(available.map(v=>v.color)).size,minPrice:available.length?Math.min(...available.map(v=>v.price)):null};
}
