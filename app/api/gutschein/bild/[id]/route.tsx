import {getPaidGiftByLink} from "@/lib/gift-cards/server";
import {renderGiftCardImage} from "@/lib/gift-cards/render";
export const runtime="nodejs",dynamic="force-dynamic";
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const url=new URL(req.url),sign=url.searchParams.get("sign")||"";
 const gift=await getPaidGiftByLink(id,sign);
 if(!gift)return new Response("Not found",{status:404,headers:{"Cache-Control":"no-store"}});
 const image=renderGiftCardImage(gift.purchase,gift.code);
 image.headers.set("Cache-Control","private, no-store, max-age=0");
 image.headers.set("X-Robots-Tag","noindex, nofollow");
 image.headers.set("Referrer-Policy","no-referrer");
 if(url.searchParams.get("download")==="1")image.headers.set("Content-Disposition",'attachment; filename="ruby-hair-geschenkgutschein.png"');
 return image;
}
