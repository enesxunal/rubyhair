import type {MetadataRoute} from "next";
import {publicShopEnabled} from "@/lib/seo";
export default function sitemap():MetadataRoute.Sitemap{
 // Search engines must never index unapproved Vercel previews.
 if(!publicShopEnabled())return [];
 const origin="https://rubyhair.de";
 const paths=["/","/kollektionen/","/kollektionen/tape-in-extensions/?laenge=45-50-cm",
   "/kollektionen/tape-in-extensions/?laenge=55-60-cm","/produkt/tape-in-extensions/",
   "/ratgeber/","/kontakt/","/versand-zahlung/",
   "/rechtliches/impressum/","/rechtliches/datenschutz/","/rechtliches/agb/","/rechtliches/widerruf/"];
 return paths.map(path=>({url:origin+path,changeFrequency:"weekly" as const,priority:path==="/"?1:.6}));
}
