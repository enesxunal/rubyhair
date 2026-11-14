import Link from "next/link";
import type {Metadata} from "next";
import ShopLayout from "@/components/site-shell";
import {tapeInLengths,tapeInLengthHref} from "@/lib/tape-in-lengths";
export const metadata:Metadata={title:"Tape-in & Keratin Extensions",description:"Ruby Hair Tape-in Extensions in 45–50 cm und 55–60 cm sowie Keratin Bondings.",alternates:{canonical:"/kollektionen/"}};
export default function Collections(){
  return <ShopLayout>
    <section className="rh-landing rh-length-landing"><div className="rh-shell">
      <h1>Deine <em>Länge.</em></h1>
      <p>Tape-in Extensions und Keratin Bondings.</p>
    </div></section>
    <section className="rh-categories rh-shell rh-length-index" aria-label="Tape-in Längen wählen">
      {tapeInLengths.map((item)=><Link href={tapeInLengthHref(item.key)} className="rh-category-tile" key={item.key}>
        <div className="rh-category-photo"><img src={item.image} alt={item.alt}/><span className="rh-length-tag">{item.label}</span></div>
        <div className="rh-category-label"><h2>{item.title}</h2><span className="rh-arrow" aria-hidden="true">↗</span></div>
      </Link>)}
      <Link href="/kollektionen/keratin-bondings/" className="rh-category-tile rh-category-keratin">
        <div className="rh-category-photo"><img src="/media/1006-300x400-0854ea8f2.jpg" alt="Keratin Bondings Echthaar"/></div>
        <div className="rh-category-label"><h2>Keratin Bondings</h2><span className="rh-arrow" aria-hidden="true">↗</span></div>
      </Link>
    </section>
  </ShopLayout>;
}
