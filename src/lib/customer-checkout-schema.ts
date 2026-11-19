import {z} from "zod";
import {giftCartItemSchema} from "@/lib/gift-cards/cart-schema";

const simple=z.string().trim().min(2).max(85).refine(s=>!/[<>\r\n\x00-\x1f]/.test(s));
const postal=z.string().regex(/^\d{5}$/);
const address=z.object({firstName:simple,lastName:simple,street:simple.max(120),postalCode:postal,city:simple,country:z.literal("DE")}).strict();
export const checkoutInput=z.object({
 key:z.string().uuid(),provider:z.enum(["paypal","klarna"]),
 lines:z.array(z.object({id:z.number().int().positive(),quantity:z.number().int().min(1).max(99)}).strict()).max(30),
 gifts:z.array(giftCartItemSchema).max(5).default([]),
 shipping:address,billing:address.optional(),email:z.email().max(254),giftCode:z.string().min(10).max(45).optional(),consent:z.literal(true)
}).strict().superRefine((v,ctx)=>{
 if(!v.lines.length&&!v.gifts.length)ctx.addIssue({code:"custom",path:["lines"],message:"Cart is empty"});
 if(v.gifts.length&&v.provider!=="paypal")ctx.addIssue({code:"custom",path:["provider"],message:"Digital gift cards require PayPal"});
 if(v.gifts.length&&v.giftCode)ctx.addIssue({code:"custom",path:["giftCode"],message:"Existing vouchers cannot be used to buy a new voucher"});
 if(v.lines.length+v.gifts.length>30)ctx.addIssue({code:"custom",path:["gifts"],message:"Too many invoice lines"});
 const giftIds=new Set<string>();for(const [i,gift] of v.gifts.entries()){
  if(giftIds.has(gift.id))ctx.addIssue({code:"custom",path:["gifts",i,"id"],message:"Duplicate gift"});
  giftIds.add(gift.id);
 }
 const ids=new Set<number>();let qty=0;
 for(const [i,l] of v.lines.entries()){if(ids.has(l.id))ctx.addIssue({code:"custom",path:["lines",i],message:"Duplicate variant"});ids.add(l.id);qty+=l.quantity;}
 if(qty>99)ctx.addIssue({code:"custom",path:["lines"],message:"Cart too large"});
});
export type CustomerCheckoutInput=z.infer<typeof checkoutInput>;
