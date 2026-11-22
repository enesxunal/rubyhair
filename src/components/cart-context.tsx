"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { byVariation } from "@/lib/catalog";
import {blackFridayActive,BLACK_FRIDAY_CODE} from "@/lib/black-friday";
import {giftCartItemSchema,normaliseGiftCart,type GiftCartItem} from "@/lib/gift-cards/cart-schema";
import {trackRubyEvent} from "@/lib/storefront-analytics";
import {trackRubyMetaEvent} from "@/lib/meta-pixel";
import {trackRubyGA4Event} from "@/lib/google-analytics";

export type CartLine = { id:number; quantity:number };
type CartState = {
  lines:CartLine[]; gifts:GiftCartItem[]; count:number; loaded:boolean; couponCode:string; setCouponCode:(code:string)=>void;
  addGift:(gift:GiftCartItem)=>boolean;
  removeGift:(id:string)=>void;
  clearPurchased:(lines:CartLine[],giftIds:string[])=>void;
  add:(id:number,quantity?:number)=>void;
  update:(id:number,quantity:number)=>void;
  remove:(id:number)=>void;
  clear:()=>void;
};
const Context=createContext<CartState|null>(null);
const KEY="rubyhair-cart-v1";
const GIFT_KEY="rubyhair-gift-cart-v1";
const COUPON_KEY="rubyhair-promo-code-v1";
const normalise=(v:unknown):CartLine[]=>{
  if(!Array.isArray(v))return [];
  const byId=new Map<number,number>();
  for(const row of v){
    if(!row||typeof row!=="object")continue;
    const id=Number((row as CartLine).id);
    const quantity=Number((row as CartLine).quantity);
    if(Number.isInteger(id)&&Number.isInteger(quantity)&&quantity>=1&&quantity<=99&&byVariation(id)) {
      byId.set(id,Math.min(99,(byId.get(id)||0)+quantity));
    }
  }
  return Array.from(byId,([id,quantity])=>({id,quantity}));
};
export function CartProvider({children}:{children:React.ReactNode}){
  const [lines,setLines]=useState<CartLine[]>([]);
  const [gifts,setGifts]=useState<GiftCartItem[]>([]);
  const [couponCode,setCouponCodeState]=useState("");
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>{
    try{setLines(normalise(JSON.parse(localStorage.getItem(KEY)||"[]")))}catch{setLines([])}
    try{setGifts(normaliseGiftCart(JSON.parse(localStorage.getItem(GIFT_KEY)||"[]")))}catch{setGifts([])}
    try{const saved=(localStorage.getItem(COUPON_KEY)||"").trim().toUpperCase().slice(0,32);setCouponCodeState(saved===BLACK_FRIDAY_CODE&&!blackFridayActive()?"":saved)}catch{setCouponCodeState("")}
    setLoaded(true);
  },[]);
  useEffect(()=>{if(loaded)try{localStorage.setItem(KEY,JSON.stringify(lines))}catch{}},[lines,loaded]);
  useEffect(()=>{if(loaded)try{localStorage.setItem(GIFT_KEY,JSON.stringify(gifts))}catch{}},[gifts,loaded]);
  useEffect(()=>{if(loaded)try{localStorage.setItem(COUPON_KEY,couponCode)}catch{}},[couponCode,loaded]);
  const value=useMemo<CartState>(()=>({
    lines,gifts,loaded,couponCode,setCouponCode(code){setCouponCodeState(code.trim().toUpperCase().slice(0,32))},count:lines.reduce((sum,line)=>sum+line.quantity,0)+gifts.length,
    addGift(gift){
      const parsed=giftCartItemSchema.safeParse(gift);
      if(!parsed.success||gifts.length>=5||gifts.some(g=>g.id===gift.id))return false;
      setGifts(prev=>[...prev,parsed.data]);
      trackRubyEvent("add_to_cart");trackRubyMetaEvent("AddToCart");trackRubyGA4Event("add_to_cart");
      return true;
    },
    removeGift(id){setGifts(prev=>prev.filter(g=>g.id!==id))},
    clearPurchased(purchasedLines,purchasedGiftIds){
      setGifts(prev=>prev.filter(x=>!purchasedGiftIds.includes(x.id)));
      setLines(prev=>prev.flatMap(line=>{
        const bought=purchasedLines.find(p=>p.id===line.id)?.quantity||0;
        return line.quantity>bought?[{...line,quantity:line.quantity-bought}]:[];
      }));
    },
    add(id,quantity=1){
      if(!byVariation(id))return;
      trackRubyEvent("add_to_cart");
      trackRubyMetaEvent("AddToCart");
      trackRubyGA4Event("add_to_cart");
      setLines(prev=>{
        const rest=prev.filter(x=>x.id!==id);
        const existing=prev.find(x=>x.id===id)?.quantity||0;
        return [...rest,{id,quantity:Math.min(99,existing+Math.max(1,Math.floor(quantity)))}];
      });
    },
    update(id,quantity){
      if(!byVariation(id))return;
      setLines(prev=>quantity<=0?prev.filter(x=>x.id!==id):
        prev.map(x=>x.id===id?{...x,quantity:Math.min(99,Math.max(1,Math.floor(quantity)))}:x));
    },
    remove(id){setLines(prev=>prev.filter(x=>x.id!==id))},
    clear(){setLines([]);setGifts([])}
  }),[lines,gifts,loaded,couponCode]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCart(){
  const state=useContext(Context);
  if(!state)throw new Error("CartProvider is required");
  return state;
}
