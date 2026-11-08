import Link from "next/link";
import type {Metadata} from "next";
import ShopLayout from "@/components/site-shell";
import {tapeInLengths,tapeInLengthHref} from "@/lib/tape-in-lengths";
export const metadata:Metadata={title:"Tape-in Extensions – Kurz & Lang",description:"Ruby Hair Tape-in Echthaar Extensions in 45–50 cm und 55–60 cm. Wähle deine Haarlänge und den Farbton.",alternates:{canonical:"/kollektionen/"}};
export default function Collections(){
  return <ShopLayout>
    <section className="rh-landing rh-length-landing"><div className="rh-shell">
      <h1>Deine <em>Länge.</em></h1>
      <p>Tape-in Extensions in zwei Längen.</p>
    </div></section>
    <section className="rh-categories rh-shell rh-length-index" aria-label="Tape-in Längen wählen">
      {tapeInLengths.map((item,index)=><Link href={tapeInLengthHref(item.key)} className="rh-category-tile" key={item.key}>
        <div className="rh-category-photo"><img src={item.image} alt={item.alt}/><span className="rh-length-tag">{item.label}</span></div>
        <div className="rh-category-label"><h2>{item.title}</h2><span className="rh-arrow" aria-hidden="true">↗</span></div>
      </Link>)}
    </section>
  </ShopLayout>;
}
