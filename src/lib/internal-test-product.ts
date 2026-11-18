import "server-only";
import {getPrisma} from "@/lib/prisma";

/** Internal merchant-only QA product. Never include it in getStoreCatalog().
 * Deliberately not purchasable until real PSP/order/invoice lifecycle is ready.
 */
export const QA_PRODUCT_SLUG="rubyhair-intern-qa-1-eur";
const QA_VARIANT_COLOR="qa-only";
const QA_VARIANT_LENGTH="single";
export const QA_PRICE_CENTS=100;

export async function getHiddenQaProduct(){
 const p=await getPrisma().product.findUnique({where:{slug:QA_PRODUCT_SLUG},include:{variants:true}});
 if(!p)return null;
 const v=p.variants.find(v=>v.colorCode===QA_VARIANT_COLOR&&v.lengthCode===QA_VARIANT_LENGTH);
 return {id:p.id,slug:p.slug,productActive:p.active,variantId:v?.id??null,variantActive:v?.active??null,priceCents:v?.priceCents??null,stockQuantity:v?.stockQuantity??null};
}

export async function prepareHiddenQaProduct(){
 const db=getPrisma();
 return db.$transaction(async tx=>{
  const product=await tx.product.upsert({
   where:{slug:QA_PRODUCT_SLUG},update:{},create:{
    slug:QA_PRODUCT_SLUG,name:"Ruby Hair - Interner 1 EUR Testartikel",
    originalName:"Interner Zahlungstest - Keine Lieferung",headline:"Nur interne QA",
    intro:"Nur fuer eine autorisierte 1-EUR-Testbestellung; keine regulare Ware.",
    pack:"1 Testartikel",material:"INTERNAL_QA",currency:"EUR",image:"/assets/hero-brunette.webp",active:false
   }
  });
  if(product.active||product.currency!=="EUR"||product.material!=="INTERNAL_QA")throw new Error("QA_PRODUCT_STATE_UNSAFE");
  const v=await tx.variant.upsert({
   where:{productId_colorCode_lengthCode:{productId:product.id,colorCode:QA_VARIANT_COLOR,lengthCode:QA_VARIANT_LENGTH}},
   update:{},create:{
    productId:product.id,colorCode:QA_VARIANT_COLOR,colorLabel:"Nur interne QA",
    lengthCode:QA_VARIANT_LENGTH,lengthLabel:"Einmaliger Test",priceCents:QA_PRICE_CENTS,
    stockQuantity:1,image:"/assets/hero-brunette.webp",active:false
   }
  });
  if(v.active||v.priceCents!==QA_PRICE_CENTS||v.stockQuantity===null||v.stockQuantity<0)throw new Error("QA_VARIANT_STATE_UNSAFE");
  return {slug:product.slug,priceCents:v.priceCents,hidden:!product.active&&!v.active,variantId:v.id};
 });
}
