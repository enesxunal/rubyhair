import type {MetadataRoute} from "next";
import {publicShopEnabled} from "@/lib/seo";
import {guides} from "@/lib/hair-guide-articles";
export default function sitemap():MetadataRoute.Sitemap{
 // Search engines must never index unapproved Vercel previews.
 if(!publicShopEnabled())return [];
 const origin="https://rubyhair.de";
 const paths=["/","/kollektionen/","/kollektionen/tape-in-extensions/","/kollektionen/keratin-bondings/",
   "/produkt/tape-in-extensions/","/produkt/keratin-bondings/",
   "/ratgeber/",...guides.map(g=>`/ratgeber/${g.slug}/`),"/kontakt/","/versand-zahlung/",
   "/rechtliches/impressum/","/rechtliches/datenschutz/","/rechtliches/agb/","/rechtliches/widerruf/"];
 return paths.map(path=>({url:origin+path,changeFrequency:"weekly" as const,priority:path==="/"?1:.6}));
}
