import type {Metadata} from "next";
import Link from "next/link";
import {after} from "next/server";
import {getPrisma} from "@/lib/prisma";
import {giftOnlySignature} from "@/lib/customer-checkout";
import {runCustomerJobs} from "@/lib/customer-automation";
import ShopLayout from "@/components/site-shell";
export const metadata:Metadata={title:"Geschenkgutschein erfolgreich eingelöst",robots:{index:false,follow:false},referrer:"no-referrer"};
export const dynamic="force-dynamic",runtime="nodejs";
export default async function GiftOnlySuccess({searchParams}:{searchParams:Promise<{orderId?:string;state?:string}>}){
 const p=await searchParams;
 const valid=Boolean(p.orderId&&/^[0-9a-f-]{36}$/i.test(p.orderId)&&p.state&&giftOnlySignature(p.orderId)===p.state);
 const order=valid?await getPrisma().order.findUnique({where:{id:p.orderId},include:{invoice:true}}):null;
 const paid=Boolean(order&&!order.testOnly&&order.status==="payment_confirmed"&&order.giftAppliedCents===order.totalCents&&order.invoice);
 if(paid)after(async()=>{try{await runCustomerJobs(2)}catch{}});
 return <ShopLayout><section className="rh-shell rh-gift-result"><div className="rh-eyebrow">RUBY HAIR / BESTELLUNG</div><h1>{paid?"Bestellung bestätigt.":"Bestellung wird geprüft."}</h1>
  <p>{paid?"Dein Geschenkgutschein wurde erfolgreich angerechnet. Es ist keine weitere Zahlung nötig. Deine Bestellbestätigung und Rechnung werden per E-Mail versendet.":"Der Bestellstatus konnte noch nicht bestätigt werden. Bitte nicht erneut bestellen, bevor die Prüfung abgeschlossen ist."}</p>
  <Link href="/konto/">Zu meinem Kundenkonto</Link><Link href="/kontakt/">Kontakt zu Ruby Hair</Link></section></ShopLayout>;
}
