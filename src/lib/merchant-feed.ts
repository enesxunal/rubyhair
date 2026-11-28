import type {Product} from "@/lib/catalog";
import {buyableVariant} from "@/lib/product-selection";
const xml=(v:string|number)=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[c]!)).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,"");
const tag=(key:string,v:string|number)=>`<g:${key}>${xml(v)}</g:${key}>`;
const publicSlugs=new Set(["tape-in-extensions","keratin-bondings"]);
export function buildMerchantFeed(products:Product[],origin:string,shippingCents:number){
 const rows:string[]=[];const ids=new Set<number>();
 for(const p of products){
  if(!publicSlugs.has(p.slug)||p.currency!=="EUR"||p.material==="INTERNAL_QA")continue;
  for(const v of p.variations){
   if(!Number.isSafeInteger(v.id)||v.id<=0||v.id===886||ids.has(v.id)||!buyableVariant(v)||!Number.isFinite(v.price)||v.price<=1)continue;
   let image:URL;try{image=new URL(v.image,origin)}catch{continue}
   if(image.origin!==origin||image.protocol!=="https:")continue;
   const link=new URL("/produkt/"+p.slug,origin);link.searchParams.set("farbe",v.color);link.searchParams.set("laenge",v.length);
   ids.add(v.id);
   const title=`${p.name} – ${v.color_label} – ${v.length_label}`.slice(0,150);
   const description=`${p.intro} Farbe: ${v.color_label}. Länge: ${v.length_label}. Packungsinhalt: ${p.pack}. Material: ${p.material}.`.slice(0,5000);
   rows.push("<item>"+tag("id","RH-"+v.id)+tag("title",title)+tag("description",description)+tag("link",link.href)+tag("image_link",image.href)+tag("availability","in_stock")+tag("price",v.price.toFixed(2)+" EUR")+tag("condition","new")+tag("brand","Ruby Hair")+tag("item_group_id","rubyhair-"+p.slug)+tag("color",v.color_label)+tag("size",v.length_label)+tag("material",p.material)+tag("product_type","Haarverlängerungen > "+p.name)+"<g:shipping>"+tag("country","DE")+tag("price",(shippingCents/100).toFixed(2)+" EUR")+"</g:shipping></item>");
  }
 }
 return '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Ruby Hair Extensions</title><link>'+xml(origin)+'</link><description>Aktuell verfügbare Ruby Hair Extensions</description>'+rows.join("\n")+'</channel></rss>';
}
