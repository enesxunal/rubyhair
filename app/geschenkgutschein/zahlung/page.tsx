import type {Metadata} from "next";
import Link from "next/link";
import {after} from "next/server";
import {GiftError,reconcileGiftPurchase} from "@/lib/gift-cards/server";
import {giftCheckoutSignature,verifyGiftSignature,giftViewUrl} from "@/lib/gift-cards/rules";
import {deliverGiftEmails} from "@/lib/gift-cards/mail";
import ShopLayout from "@/components/site-shell";
import VerifiedGiftPurchase from "@/components/verified-gift-purchase";
export const metadata:Metadata={title:"Geschenkgutschein – Zahlungsbestätigung",robots:{index:false,follow:false},referrer:"no-referrer"};
export const dynamic="force-dynamic",runtime="nodejs",maxDuration=60;
export default async function GiftReturn({searchParams}:{searchParams:Promise<{id?:string;state?:string;token?:string;cancel?:string}>}){
 const p=await searchParams;
 const valid=Boolean(p.id&&/^[0-9a-f-]{36}$/i.test(p.id)&&p.state&&verifyGiftSignature(p.id,p.state,"pay-return"));
 let title="Zahlung wird geprüft",message="Bitte führe keine zweite Zahlung aus, solange wir den Zahlungsstatus prüfen.",link="";
 if(!valid){title="Ungültiger Zahlungslink";message="Bitte kontaktiere unser Team."}
 else if(p.cancel){title="PayPal wurde verlassen";message="Es liegt noch keine bestätigte Zahlung vor. Bitte vermeide eine doppelte Bestellung."}
 else if(!p.token||!/^[A-Za-z0-9_-]{8,60}$/.test(p.token)){message="Der PayPal-Status wird noch abgeglichen. Bitte keine neue Zahlung starten."}
 else{
  try{
   const result=await reconcileGiftPurchase(p.id!,true,p.token);
   if(result.paid){title="Dein Geschenk ist bereit";message="Der Geschenkgutschein wurde nach bestätigter Zahlung aktiviert. Du kannst ihn jetzt ansehen und als Bild speichern.";
    link=giftViewUrl(p.id!);after(async()=>{try{await deliverGiftEmails(2)}catch{}});
   }
  }catch(e){message=e instanceof GiftError&&e.code==="PAYMENT_NOT_YET_VERIFIED"?"Der Zahlungseingang wird noch geprüft. Bitte nicht erneut bezahlen.":"Die Zahlung wird abgeglichen. Bitte kontaktiere Ruby Hair, bevor du erneut bezahlst."}
 }
 return <ShopLayout><div className="rh-shell rh-gift-result"><div className="rh-eyebrow">RUBY HAIR / GESCHENKGUTSCHEIN</div><h1>{title}</h1><p>{message}</p>{link&&<VerifiedGiftPurchase purchaseId={p.id!}/>} {link&&<Link className="rh-gift-primary" href={link}>Gutschein ansehen & herunterladen ↗</Link>}<Link href="/kontakt/" className="rh-gift-text-link">Kontakt zum Ruby Hair Team</Link></div></ShopLayout>;
}
