import {colorsFor, type Product, type Variation} from "@/lib/catalog";

/**
 * Requested storefront shade names, as supplied by the Ruby Hair merchant on 2026-11-18.
 * This is a DISPLAY checklist, not permission to create sellable color/length variants.
 */
export const RUBY_TAPE_IN_SHADES=[
 {code:"1",label:"1"},
 {code:"1b",label:"1b"},
 {code:"2",label:"2"},
 {code:"2b",label:"2b"},
 {code:"4",label:"4"},
 {code:"6",label:"6"},
 {code:"7",label:"7"},
 {code:"8",label:"8"},
 {code:"9a",label:"9A"},
 {code:"10",label:"10"},
 {code:"60",label:"60"},
 {code:"ari",label:"ARI"},
 {code:"eve",label:"EVE"},
 {code:"banu",label:"Banu"},
 {code:"bronde",label:"BRONDE"},
 {code:"loui",label:"LOUI"},
 {code:"ruby",label:"RUBY"},
 {code:"silver",label:"SILVER"}
] as const;

/** The only reference-only color has an existing Keratin photograph, NOT an authorized Tape-in product. */
const UNLISTED_REFERENCE_IMAGES:Record<string,string>={
 "1b":"/media/1b-600x600-ed411886a.jpg"
};

export type ShadeCard={
 color:string;
 label:string;
 image:string;
 variants:Variation[];
 selectedVariants:Variation[];
 available:Variation[];
 status:"listed"|"unavailable"|"not-listed";
 referenceOnly:boolean;
};

export function collectionShadeCards(product:Product,selectedLength?:string):ShadeCard[]{
 const groups=colorsFor(product);
 if(product.slug!=="tape-in-extensions"){
  return Array.from(groups.entries()).map(([color,variants])=>{
   const selectedVariants=selectedLength?variants.filter(v=>v.length===selectedLength):variants;
   const available=selectedVariants.filter(v=>v.available&&v.purchasable);
   const sample=available[0]||selectedVariants[0]||variants[0];
   return {
    color,label:sample.color_label,image:sample.image,variants,selectedVariants,available,
    status:selectedVariants.length===0?"not-listed":available.length===0?"unavailable":"listed",
    referenceOnly:false
   } satisfies ShadeCard;
  }).filter(x=>x.selectedVariants.length).sort((a,b)=>new Intl.Collator("de",{numeric:true,sensitivity:"base"}).compare(a.label,b.label));
 }
 const merchantMap:Map<string,string>=new Map(RUBY_TAPE_IN_SHADES.map(x=>[x.code,x.label]));
 const codes=[...merchantMap.keys(),...Array.from(groups.keys()).filter(x=>!merchantMap.has(x))];
 return codes.map(color=>{
  const variants=groups.get(color)||[];
  const selectedVariants=selectedLength?variants.filter(v=>v.length===selectedLength):variants;
  const available=selectedVariants.filter(v=>v.available&&v.purchasable);
  const sample=available[0]||selectedVariants[0]||variants[0];
  const image=sample?.image||UNLISTED_REFERENCE_IMAGES[color];
  // Do not guess pictures or prices for unsupported colors.
  if(!image)return null;
  return {
   color,label:sample?.color_label||merchantMap.get(color)||color.toUpperCase(),image,
   variants,selectedVariants,available,
   status:selectedVariants.length===0?"not-listed":available.length===0?"unavailable":"listed",
   referenceOnly:variants.length===0
  } satisfies ShadeCard;
 }).filter((x):x is ShadeCard=>x!==null);
}
