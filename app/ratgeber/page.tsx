import type {Metadata} from "next";
import Link from "next/link";
import ShopLayout from "@/components/site-shell";
export const metadata:Metadata={title:"Hair Guide"};
export default function HairGuide(){
  return <ShopLayout><section className="rh-shell rh-info-page">
    <div className="rh-eyebrow">RUBY HAIR / HAIR GUIDE</div>
    <h1>Dein Weg zum<br/><em>Signature Look.</em></h1>
    <p>Bei der Wahl deiner Extensions kommt es auf Methode, Länge, Farbe und deine eigene Haarstruktur an. Eine individuelle Beratung hilft bei der passenden Auswahl.</p>
    <div className="rh-product-facts">
      <details open><summary>Keratin Bondings</summary><p>In einer Packung befinden sich laut dem übernommenen Produktkatalog 25 einzelne Keratin-Bondings aus Echthaar.</p></details>
      <details><summary>Tape-in Extensions</summary><p>Eine Packung enthält laut dem übernommenen Produktkatalog 10 einzelne Tape-in Extensions aus Echthaar.</p></details>
      <details><summary>Wie viel brauche ich?</summary><p>Der ursprüngliche Katalog nennt zur groben Orientierung 2–4 Packungen bei dünnem, 4–5 bei normalem und 5–6 bei dickem Haar. Die Menge muss für deinen Look individuell bestätigt werden.</p></details>
    </div>
    <Link href="/kollektionen/" className="rh-buy-button">KOLLEKTIONEN ENTDECKEN <span>↗</span></Link>
  </section></ShopLayout>;
}
