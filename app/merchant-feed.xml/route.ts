import {getStoreCatalog} from "@/lib/catalog-server";
import {blackFridayCatalog} from "@/lib/black-friday";
import {buildMerchantFeed} from "@/lib/merchant-feed";
import {shippingDeCents} from "@/lib/customer-checkout";
import {publicShopEnabled,siteOrigin} from "@/lib/seo";
export const runtime="nodejs",dynamic="force-dynamic";
const headers={"Cache-Control":"no-store","X-Robots-Tag":"noindex"};
export async function GET(){
 if(!publicShopEnabled())return new Response(null,{status:404,headers});
 try{
  const catalog=await getStoreCatalog();
  if(catalog.source!=="postgresql")return new Response(null,{status:503,headers});
  return new Response(buildMerchantFeed(blackFridayCatalog(catalog.products),siteOrigin(),shippingDeCents()),{headers:{...headers,"Content-Type":"application/rss+xml; charset=utf-8"}});
 }catch{return new Response(null,{status:503,headers})}
}
