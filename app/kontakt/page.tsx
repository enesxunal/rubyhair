import type {Metadata} from "next";
import Link from "next/link";
import ShopLayout from "@/components/site-shell";
export const metadata:Metadata={title:"Kontakt & Beratung"};
export default function Contact(){
  return <ShopLayout><section className="rh-shell rh-info-page">
    <div className="rh-eyebrow">RUBY HAIR / KONTAKT</div>
    <h1>Schönes Haar beginnt<br/><em>mit Beratung.</em></h1>
    <p>Du hast Fragen zu Farbe, Länge oder der passenden Methode? Unsere Kontaktinformationen werden vor der offiziellen Veröffentlichung geprüft und auf dieser Seite ergänzt.</p>
    <Link href="/kollektionen/" className="rh-buy-button">EXTENSIONS ENTDECKEN <span>↗</span></Link>
  </section></ShopLayout>;
}
