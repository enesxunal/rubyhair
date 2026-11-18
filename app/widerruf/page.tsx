import type {Metadata} from "next";
import Link from "next/link";
import ShopLayout from "@/components/site-shell";
import WithdrawalForm from "@/components/withdrawal-form";
export const metadata:Metadata={
 title:"Vertrag widerrufen | Ruby Hair",
 description:"Widerruf für deine Ruby Hair Online-Bestellung in zwei Schritten erklären.",
 robots:{index:false,follow:false}
};
export default function WithdrawalPage(){return <ShopLayout>
 <section className="rh-shell" style={{paddingTop:48,paddingBottom:32}}>
  <nav className="rh-breadcrumb" aria-label="Breadcrumb"><Link href="/">Startseite</Link><span>/</span><span>Vertrag widerrufen</span></nav>
  <div className="rh-eyebrow">RUBY HAIR / WIDERRUF</div>
  <h1>Vertrag <em>widerrufen.</em></h1>
  <p style={{maxWidth:730,lineHeight:1.8}}>Du kannst deinen über unseren Online-Shop geschlossenen Vertrag hier elektronisch widerrufen. Die Erklärung benötigt keinen Grund und erfolgt in zwei Schritten. Du erhältst eine Eingangsbestätigung per E-Mail.</p>
  <WithdrawalForm/>
  <p style={{maxWidth:730}}>Alternativ kannst du deinen Widerruf jederzeit per E-Mail an <a href="mailto:info@rubyhair.de">info@rubyhair.de</a> erklären. Weitere Informationen findest du in unserer <Link href="/rechtliches/widerruf/">Widerrufsbelehrung</Link>.</p>
 </section>
 </ShopLayout>;}
