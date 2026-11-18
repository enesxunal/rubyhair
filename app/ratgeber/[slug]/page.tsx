import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import ShopLayout from "@/components/site-shell";
import {guideBySlug,guides} from "@/lib/hair-guide-articles";
import {absoluteSiteUrl} from "@/lib/seo";

type Params={params:Promise<{slug:string}>};
export function generateStaticParams(){return guides.map(g=>({slug:g.slug}));}
export async function generateMetadata({params}:Params):Promise<Metadata>{
 const article=guideBySlug((await params).slug);
 if(!article)return {title:"Ratgeber"};
 return {title:article.title,description:article.description,alternates:{canonical:`/ratgeber/${article.slug}/`},
  openGraph:{type:"article",title:article.title,description:article.description,locale:"de_DE"}};
}
export default async function GuideArticlePage({params}:Params){
 const article=guideBySlug((await params).slug);
 if(!article)notFound();
 const url=absoluteSiteUrl(`/ratgeber/${article.slug}/`);
 const schema={"@context":"https://schema.org","@type":"Article",headline:article.title,description:article.description,
  inLanguage:"de-DE",datePublished:"2026-11-18",dateModified:"2026-11-18",mainEntityOfPage:url,
  author:{"@type":"Organization",name:"Ruby Hair"},publisher:{"@type":"Organization",name:"Ruby Hair"}};
 return <ShopLayout>
   <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,"\\u003c")}}/>
   <div className="rh-shell rh-guide-article">
    <nav className="rh-breadcrumb" aria-label="Breadcrumb"><Link href="/">Startseite</Link><span>/</span><Link href="/ratgeber/">Ratgeber</Link><span>/</span><span>{article.title}</span></nav>
    <header className="rh-guide-article-head"><span className="rh-eyebrow">RUBY HAIR / RATGEBER · {article.readingMinutes} MIN. LESEZEIT</span>
     <h1>{article.title}</h1><p>{article.lead}</p></header>
    <div className="rh-guide-article-grid">
     <main className="rh-guide-article-main">{article.sections.map((section,i)=><section key={section.title} id={`abschnitt-${i+1}`}>
      <h2>{section.title}</h2>{section.paragraphs.map(paragraph=><p key={paragraph}>{paragraph}</p>)}
     </section>)}</main>
     <aside className="rh-guide-article-aside"><span className="rh-eyebrow">DEIN NÄCHSTER SCHRITT</span>
      <h2>Die passenden Extensions finden.</h2><p>Vergleiche verfügbare Farben und Längen direkt bei Ruby Hair.</p>
      <Link href={article.ctaHref}>{article.cta} ↗</Link><Link href="/kontakt/">Persönliche Beratung</Link>
     </aside>
    </div>
    <section className="rh-guide-article-more"><h2>Weitere Haarpflege- und Extensions-Tipps</h2>
     <div>{guides.filter(g=>g.slug!==article.slug).map(g=><Link href={`/ratgeber/${g.slug}/`} key={g.slug}>{g.title}<span>Artikel lesen ↗</span></Link>)}</div>
    </section>
   </div>
  </ShopLayout>;
}
