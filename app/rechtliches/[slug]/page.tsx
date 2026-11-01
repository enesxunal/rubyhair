import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import ShopLayout from "@/components/site-shell";
const pages:Record<string,string>={
  impressum:"Impressum",
  datenschutz:"Datenschutzerklärung",
  agb:"Allgemeine Geschäftsbedingungen",
  widerruf:"Widerruf & Rückgabe"
};
export function generateStaticParams(){return Object.keys(pages).map(slug=>({slug}));}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  return {title:pages[(await params).slug]||"Rechtliche Informationen"};
}
export default async function Legal({params}:{params:Promise<{slug:string}>}){
  const slug=(await params).slug;
  if(!pages[slug])notFound();
  return <ShopLayout><section className="rh-shell rh-info-page">
    <div className="rh-eyebrow">RUBY HAIR / INFORMATIONEN</div>
    <h1>{pages[slug]}</h1>
    <p>Die rechtlich verbindlichen Angaben für den neuen, eigenständigen Ruby Hair Online-Shop werden vor der Veröffentlichung durch den Shopbetreiber bereitgestellt und geprüft.</p>
    <p>Diese Designvorschau nimmt keine Bestellungen, Adressen oder Zahlungen entgegen. Platzhaltertexte ersetzen keine rechtlich erforderlichen Informationen.</p>
    <Link href="/" className="rh-buy-button">ZUR STARTSEITE <span>↗</span></Link>
  </section></ShopLayout>;
}
