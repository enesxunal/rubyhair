import "server-only";
import { z } from "zod";
import { getStoreCatalog } from "@/lib/catalog-server";

const cartItem=z.object({
  id:z.number().int().positive(),
  quantity:z.number().int().min(1).max(99)
}).strict();
export const quoteRequestSchema=z.object({
  lines:z.array(cartItem).min(1).max(30)
}).strict().superRefine((data,ctx)=>{
  const ids=new Set<number>();
  let quantity=0;
  for(const [index,line] of data.lines.entries()){
    if(ids.has(line.id))ctx.addIssue({code:"custom",path:["lines",index,"id"],message:"Duplicate variation"});
    ids.add(line.id);
    quantity+=line.quantity;
  }
  if(quantity>99)ctx.addIssue({code:"custom",path:["lines"],message:"Too many items"});
});
export type QuoteRequest=z.infer<typeof quoteRequestSchema>;
export type QuoteLine={
  id:number;quantity:number;productName:string;color:string;length:string;
  unitCents:number|null;lineCents:number|null;
  status:"available"|"unverified-stock"|"out-of-stock"|"unknown-variation";
  stockQuantity:number|null;
};
export type CartQuote={
  source:"postgresql"|"imported-preview";
  currency:"EUR";lines:QuoteLine[];subtotalCents:number;
  needsReview:boolean;checkoutEnabled:false;
  message:string;
};
// This is a read-only estimate. The future checkout MUST create the order from
// server-side prices in a PostgreSQL transaction with inventory reservation.
export async function buildCartQuote(request:QuoteRequest):Promise<CartQuote>{
  const catalog=await getStoreCatalog();
  const map=new Map(catalog.products.flatMap(p=>p.variations.map(v=>[v.id,{p,v}] as const)));
  let subtotalCents=0;
  const lines:QuoteLine[]=request.lines.map(item=>{
    const entry=map.get(item.id);
    if(!entry)return {
      id:item.id,quantity:item.quantity,productName:"",color:"",length:"",
      unitCents:null,lineCents:null,stockQuantity:null,status:"unknown-variation"
    };
    const {p,v}=entry;
    const stockQuantity=v.stock_quantity??null;
    const unitCents=Math.round(v.price*100);
    const lineCents=unitCents*item.quantity;
    const status:QuoteLine["status"]=!v.available||!v.purchasable ||
      (stockQuantity!==null&&stockQuantity<item.quantity)
      ? "out-of-stock":stockQuantity===null?"unverified-stock":"available";
    subtotalCents+=lineCents;
    return {
      id:item.id,quantity:item.quantity,productName:p.name,
      color:v.color_label,length:v.length_label,unitCents,lineCents,
      stockQuantity,status
    };
  });
  return {
    source:catalog.source,currency:"EUR",lines,subtotalCents,
    needsReview:lines.some(line=>line.status!=="available"),
    checkoutEnabled:false,
    message:"Unverbindliche Vorschau. Keine Bestellung oder Zahlung moeglich."
  };
}
