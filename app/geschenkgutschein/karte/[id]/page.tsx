import type {Metadata} from "next";
import Link from "next/link";
import {getPaidGiftByLink} from "@/lib/gift-cards/server";
import {euroGift} from "@/lib/gift-cards/rules";
import ShopLayout from "@/components/site-shell";
import ShareGiftButton from "@/components/gift-share-button";
export const metadata:Metadata={title:"Persönlicher Ruby Hair Geschenkgutschein",robots:{index:false,follow:false},referrer:"no-referrer"};
export const runtime="nodejs",dynamic="force-dynamic";
export default async function GiftCardPage({params,searchParams}:{params:Promise<{id:string}>,searchParams:Promise<{sign?:string}>}){
 const {id}=await params,sign=(await searchParams).sign||"";
 const gift=await getPaidGiftByLink(id,sign);
 if(!gift)return <ShopLayout><section className="rh-shell rh-gift-error"><h1>Geschenkkarte nicht verfügbar.</h1><p>Dieser Link ist ungültig oder die Zahlung wurde noch nicht bestätigt.</p><Link href="/kontakt/">Kontakt zum Support</Link></section></ShopLayout>;
 const img=`/api/gutschein/bild/${id}?sign=${sign}`;
 return <ShopLayout><section className="rh-shell rh-gift-card-page">
   <nav className="rh-breadcrumb"><Link href="/">Startseite</Link><span>/</span><span>Dein Geschenk</span></nav>
   <div className="rh-eyebrow">RUBY HAIR / EIN GESCHENK FÜR DICH</div><h1>Schönheit, die bleibt.</h1>
   <p>Dieser Gutschein ist bezahlt und bereit zum Verschenken. Lade die Karte als hochauflösendes Bild herunter oder teile sie mit einer besonderen Person.</p>
   <img className="rh-gift-delivered-image" src={img} alt={`Ruby Hair Geschenkgutschein für ${gift.purchase.recipientName} im Wert von ${euroGift(gift.purchase.amountCents)}`}/>
   <div className="rh-gift-delivered-actions"><a className="rh-gift-primary" href={img+"&download=1"} download="ruby-hair-geschenkgutschein.png">Als PNG herunterladen</a><ShareGiftButton imageUrl={img}/></div>
   <div className="rh-gift-redeem-info"><span>DEIN GUTSCHEINCODE</span><strong>{gift.code}</strong><small>Guthaben: {euroGift(gift.purchase.card?.balanceCents||0)} · Einlösbar im Ruby Hair Onlineshop.</small></div>
   <p className="rh-gift-share-warning">Wichtig: Wer den Gutscheincode besitzt, kann das Guthaben einlösen. Teile ihn nur mit der Person, die du beschenken möchtest.</p>
  </section></ShopLayout>;
}
