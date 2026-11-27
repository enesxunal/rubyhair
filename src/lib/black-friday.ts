import type {Product} from "@/lib/catalog";
import priceHistory from "../../scripts/price-change-20261117.json";

/** Automatic sale during the campaign. Database keeps list prices. */
export const BLACK_FRIDAY_START="2026-11-19T23:00:00.000Z";
export const BLACK_FRIDAY_END="2026-11-30T23:00:00.000Z"; // exclusive, 01 Dec 00:00 CET
export const BLACK_FRIDAY_PERCENT=15;
export const BLACK_FRIDAY_CODE="BLACKFRIDAY";
export const BLACK_FRIDAY_CAMPAIGN="rubyhair-black-friday-2026";

export function blackFridayActive(now:Date=new Date()){
 const t=now.getTime();
 return t>=Date.parse(BLACK_FRIDAY_START)&&t<Date.parse(BLACK_FRIDAY_END);
}
export const normalizedPromoCode=(code?:string)=>code?.trim().toUpperCase()||"";
export function blackFridayCouponValid(code:string|undefined,now:Date=new Date()){
 return normalizedPromoCode(code)===BLACK_FRIDAY_CODE&&blackFridayActive(now);
}
export function blackFridayEligible(slug:string,material?:string){
 return !/(gutschein|gift|test|intern|qa-only)/i.test(slug)&&!/INTERNAL_QA/i.test(material||"");
}
// Integer-cent rounding per physical product unit, matching order line/invoice/provider.
export function blackFridayUnitCents(regularCents:number,slug:string,now:Date=new Date(),material?:string,couponCode?:string){
 if(!blackFridayActive(now)||(normalizedPromoCode(couponCode)&&!blackFridayCouponValid(couponCode,now))||!blackFridayEligible(slug,material))return regularCents;
 if(!Number.isSafeInteger(regularCents)||regularCents<=0)return regularCents;
 return Math.round(regularCents*(100-BLACK_FRIDAY_PERCENT)/100);
}
type HistoryRecord={slug:string;legacyId:number;beforeCents:number;afterCents:number};
const previousPriceByLegacyId=new Map<number,HistoryRecord>((priceHistory.variants as HistoryRecord[]).map(v=>[v.legacyId,v]));
/** Prior documented amount (17 Nov), not proof of 30-day minimum. */
export function documentedEarlierPriceCents(legacyId:number,slug:string,currentCents:number){
 const row=previousPriceByLegacyId.get(legacyId);
 return row?.slug===slug?Math.min(currentCents,row.beforeCents):null;
}
// Display-only projection. Cart and checkout must use the untouched list price.
export function blackFridayCatalog(products:Product[],now:Date=new Date()):Product[]{
 if(!blackFridayActive(now))return products;
 return products.map(p=>{
  if(!blackFridayEligible(p.slug,p.material))return p;
  const variations=p.variations.map(v=>({...v,price:blackFridayUnitCents(Math.round(v.price*100),p.slug,now,p.material)/100}));
  const prices=variations.filter(v=>v.available).map(v=>v.price);
  return {...p,variations,min_price:prices.length?Math.min(...prices):0,max_price:prices.length?Math.max(...prices):0};
 });
}
