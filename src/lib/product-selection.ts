import type {Variation} from "@/lib/catalog";
export function buyableVariant(v:Variation){return v.available&&v.purchasable&&(v.stock_quantity==null||v.stock_quantity>0)}
export function initialProductVariant(variants:Variation[],color?:string,length?:string){
 const matches=variants.filter(v=>!color||v.color===color);
 const pool=matches.length?matches:variants;
 return (length?pool.find(v=>v.length===length&&buyableVariant(v))||pool.find(v=>v.length===length):undefined)||pool.find(buyableVariant)||pool[0];
}
export function variantAfterColorChange(choices:Variation[],length?:string){
 return choices.find(v=>v.length===length&&buyableVariant(v))||choices.find(buyableVariant)||choices.find(v=>v.length===length)||choices[0];
}
export function remainingCartStock(v:Variation|undefined,already:number){
 if(!v||!buyableVariant(v))return 0;
 return Math.max(0,Math.min(99,v.stock_quantity??99)-Math.max(0,already));
}
