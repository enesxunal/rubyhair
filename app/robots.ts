import type {MetadataRoute} from "next";
import {publicShopEnabled} from "@/lib/seo";
export default function robots():MetadataRoute.Robots{
 if(!publicShopEnabled())return {rules:{userAgent:"*",disallow:"/"}};
 return {
  rules:{userAgent:"*",allow:"/",disallow:["/admin/","/api/","/warenkorb/","/kasse/","/suche/","/haar-anprobe/"]},
  sitemap:"https://rubyhair.de/sitemap.xml"
 };
}
