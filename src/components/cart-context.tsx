"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { byVariation } from "@/lib/catalog";
import {trackRubyEvent} from "@/lib/storefront-analytics";

export type CartLine = { id:number; quantity:number };
type CartState = {
  lines:CartLine[]; count:number; loaded:boolean;
  add:(id:number,quantity?:number)=>void;
  update:(id:number,quantity:number)=>void;
  remove:(id:number)=>void;
  clear:()=>void;
};
const Context=createContext<CartState|null>(null);
const KEY="rubyhair-cart-v1";
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
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>{
    try{setLines(normalise(JSON.parse(localStorage.getItem(KEY)||"[]")))}catch{setLines([])}
    setLoaded(true);
  },[]);
  useEffect(()=>{if(loaded)localStorage.setItem(KEY,JSON.stringify(lines))},[lines,loaded]);
  const value=useMemo<CartState>(()=>({
    lines,loaded,count:lines.reduce((sum,line)=>sum+line.quantity,0),
    add(id,quantity=1){
      if(!byVariation(id))return;
      trackRubyEvent("add_to_cart");
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
    clear(){setLines([])}
  }),[lines,loaded]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCart(){
  const state=useContext(Context);
  if(!state)throw new Error("CartProvider is required");
  return state;
}
