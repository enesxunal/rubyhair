import type {Product,Variation} from "@/lib/catalog";
import priceHistory from "../../scripts/price-change-20261117.json";

/**
 * Ruby Hair Black Friday 2026: 20 Nov 00:00 CET through 30 Nov 23:59:59 CET.
 * Both boundaries are Berlin local time. Date arithmetic is UTC-safe and
 * price reductions are applied at the server boundary (never trusting client).
 * No original prices or gift-card denominations are mutated in PostgreSQL.
 */
export const BLACK_FRIDAY_START="2026-11-19T23:00:00.000Z";
export const BLACK_FRIDAY_END="2026-11-30T23:00:00.000Z"; // exclusive
export const BLACK_FRIDAY_PERCENT=15;
export const BLACK_FRIDAY_CAMPAIGN="rubyhair-black-friday-2026";

export function blackFridayActive(now:Date=new Date()){
 const t=now.getTime();
 return t>=Date.parse(BLACK_FRIDAY_START)&&t<Date.parse(BLACK_FRIDAY_END);
}
export function blackFridayEligible(slug:string,material?:string){
 // Product promotion, not stored-value vouchers, gift cards, hidden QA items
 return !/(gutschein|gift|test|intern|qa-only)/i.test(slug) &&
   !/INTERNAL_QA/i.test(material||"");
}
export function blackFridayUnitCents(regularCents:number,slug:string,now:Date=new Date(),material?:string){
 if(!blackFridayActive(now)||!blackFridayEligible(slug,material))return regularCents;
 if(!Number.isSafeInteger(regularCents)||regularCents<=0)return regularCents;
 return Math.round(regularCents*(100-BLACK_FRIDAY_PERCENT)/100);
}
type HistoryRecord={slug:string;legacyId:number;beforeCents:number;afterCents:number};
const previousPriceByLegacyId=new Map<number,HistoryRecord>(
 (priceHistory.variants as HistoryRecord[]).map(v=>[v.legacyId,v])
);
/** Prior documented amount (17 Nov), not a claim about older undocumented changes. */
export function documentedEarlierPriceCents(legacyId:number,slug:string,currentCents:number){
 const row=previousPriceByLegacyId.get(legacyId);
 return row?.slug===slug?Math.min(currentCents,row.beforeCents):null;
}
export function blackFridayCatalog(products:Product[],now:Date=new Date()):Product[]{
 if(!blackFridayActive(now))return products;
 return products.map(product=>{
  if(!blackFridayEligible(product.slug,product.material))return product;
  const variations:Variation[]=product.variations.map(v=>{
   if(!v.available||!v.purchasable)return v;
   const regularCents=Math.round(v.price*100);
   const discounted=blackFridayUnitCents(regularCents,product.slug,now,product.material);
   const history=documentedEarlierPriceCents(v.id,product.slug,regularCents);
   return {...v,price:discounted/100,original_price:regularCents/100,
     documented_prior_price:history===null?undefined:history/100};
  });
  const priced=variations.filter(v=>v.available&&v.purchasable);
  const discountedPrices=priced.map(v=>v.price);
  const originals=priced.map(v=>v.original_price??v.price);
  return {...product,variations,
   min_price:discountedPrices.length?Math.min(...discountedPrices):product.min_price,
   max_price:discountedPrices.length?Math.max(...discountedPrices):product.max_price,
   original_min_price:originals.length?Math.min(...originals):undefined
  };
 });
}
