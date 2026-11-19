import {z} from "zod";
/** Browser-safe gift card draft; price and fulfillment validated again on checkout. */
const name=z.string().trim().min(2).max(80).refine(v=>!/[<>\r\n\x00-\x1f]/.test(v));
const message=z.string().trim().max(180).refine(v=>!/[<>\x00-\x1f]/.test(v));
export const giftCartItemSchema=z.object({
 id:z.string().uuid(),amountCents:z.number().int().min(1000).max(50000),
 recipientName:name,senderName:name.optional(),message:message.optional(),
 recipientEmail:z.email().max(254).optional(),theme:z.enum(["classic","soft","black"]),
 delivery:z.enum(["download","email"])
}).strict().superRefine((data,ctx)=>{
 if(data.delivery==="email"&&!data.recipientEmail)ctx.addIssue({code:"custom",path:["recipientEmail"],message:"Recipient email required"});
});
export type GiftCartItem=z.infer<typeof giftCartItemSchema>;
export const normaliseGiftCart=(value:unknown):GiftCartItem[]=>{
 if(!Array.isArray(value))return [];
 const seen=new Set<string>(),items:GiftCartItem[]=[];
 for(const row of value.slice(0,10)){
  const parsed=giftCartItemSchema.safeParse(row);
  if(!parsed.success||seen.has(parsed.data.id))continue;
  seen.add(parsed.data.id);items.push(parsed.data);
  if(items.length===5)break;
 }
 return items;
};
export const giftCartTotal=(value:readonly GiftCartItem[])=>value.reduce((sum,x)=>sum+x.amountCents,0);
