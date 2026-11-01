import type {Metadata} from "next";
import Link from "next/link";
import ShopLayout from "@/components/site-shell";
export const metadata:Metadata={title:"Kasse – noch nicht freigegeben"};
export default function Checkout(){
  return <ShopLayout><section className="rh-shell rh-checkout-preview">
    <div className="rh-eyebrow">RUBY HAIR / CHECKOUT</div><h1>Deine Bestellung.<br/><em>Bald ganz einfach.</em></h1>
    <p>Die neue Ruby Hair Kasse wird erst freigeschaltet, nachdem sichere Zahlung, Versand, Steuern und Bestellbestätigung vollständig getestet sind.</p>
    <p>Auf dieser Vorschauseite werden weder Zahlungen noch Kunden- oder Adressdaten entgegengenommen.</p>
    <p><Link href="/versand-zahlung/">Informationen zu Versand, Zahlung und Rücksendung ↗</Link></p>
    <Link className="rh-buy-button" href="/warenkorb/">ZURÜCK ZUM WARENKORB<span>↗</span></Link>
  </section></ShopLayout>;
}
