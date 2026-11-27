import {z} from "zod";
export const META_FUNNEL_CHOICE="ruby_meta_funnel_choice_v1";
export const META_FUNNEL_COOKIE="ruby_meta_funnel_consent_v1";
export const META_FUNNEL_EVENT="ruby-meta-consent-saved";
const item=z.object({id:z.number().int().positive().max(2147483647),quantity:z.number().int().min(1).max(99),unitCents:z.number().int().min(101).max(1000000)}).strict();
export const metaFunnelSchema=z.object({
 event:z.enum(["ViewContent","AddToCart","InitiateCheckout"]),
 eventId:z.string().uuid(),
 source:z.enum(["/produkt/tape-in-extensions","/produkt/keratin-bondings","/haar-anprobe","/kasse"]),
 items:z.array(item).min(1).max(30),
 couponCode:z.literal("BLACKFRIDAY").optional()
}).strict().superRefine((d,ctx)=>{
 const total=d.items.reduce((n,i)=>n+i.quantity,0);
 const validSource=d.event==="InitiateCheckout"?d.source==="/kasse":d.event==="ViewContent"?d.source.startsWith("/produkt/"):d.source!=="/kasse";
 if(!validSource||new Set(d.items.map(i=>i.id)).size!==d.items.length||total>99||(d.event!=="InitiateCheckout"&&d.items.length!==1)||(d.event==="ViewContent"&&total!==1))ctx.addIssue({code:"custom",message:"Invalid funnel event"});
});
export type MetaFunnelInput=z.infer<typeof metaFunnelSchema>;
export type MetaFunnelItem=MetaFunnelInput["items"][number];
export type MetaFunnelEvent=MetaFunnelInput["event"];
export function metaFunnelData(items:MetaFunnelItem[]){
 return {content_type:"product",content_ids:items.map(i=>String(i.id)),contents:items.map(i=>({id:String(i.id),quantity:i.quantity,item_price:i.unitCents/100})),num_items:items.reduce((n,i)=>n+i.quantity,0),value:items.reduce((n,i)=>n+i.quantity*i.unitCents,0)/100,currency:"EUR"};
}
export function quoteMatchesFunnel(d:MetaFunnelInput,q:{source:string;needsReview:boolean;couponError:boolean;lines:{id:number;quantity:number;unitCents:number|null;status:string}[]}){
 if(q.source!=="postgresql"||q.couponError||q.lines.length!==d.items.length||(d.event!=="ViewContent"&&q.needsReview))return false;
 return d.items.every(i=>q.lines.some(l=>l.id===i.id&&l.quantity===i.quantity&&l.unitCents===i.unitCents&&(d.event==="ViewContent"?l.status!=="unknown-variation":l.status==="available")));
}
