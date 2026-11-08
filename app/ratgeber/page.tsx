import type { Metadata } from "next";
import Link from "next/link";
import ShopLayout from "@/components/site-shell";
import { ArrowUpRight, Droplets, Brush, Moon, CalendarDays, Sparkles, HelpCircle } from "lucide-react";

export const metadata:Metadata={
  title:"Hair Guide – Auswahl & Pflege",
  description:"Ruby Hair Hair Guide: Tape-in Extensions in kurzer und langer Variante wählen und Echthaar richtig pflegen."
};
const careSteps=[
  {
    number:"01",
    title:"Haare schonend waschen",
    intro:"Wasche deine Extensions sorgfältig, ohne die Verbindungsstellen unnötig zu belasten.",
    note:"Ruby Hair empfiehlt, ungefähr zweimal pro Woche zu waschen und den Kopf dabei aufrecht zu halten.",
    icon:Droplets
  },
  {
    number:"02",
    title:"Vorsichtig entwirren",
    intro:"Beginne beim Bürsten an den Spitzen und arbeite dich langsam nach oben vor.",
    note:"Bürste das Haar nicht tropfnass. Besonders an den Verbindungspunkten behutsam vorgehen.",
    icon:Brush
  },
  {
    number:"03",
    title:"Gut vorbereitet schlafen",
    intro:"Vor dem Schlafen trocknen lassen und sanft bürsten.",
    note:"Ein lockerer Zopf oder eine lose Bindung kann helfen, Verfilzungen über Nacht zu vermeiden.",
    icon:Moon
  },
  {
    number:"04",
    title:"Pflege-Termine einhalten",
    intro:"Extensions benötigen regelmäßige professionelle Kontrolle und Pflege.",
    note:"Halte die mit deiner Stylistin oder deinem Stylisten vereinbarten Termine ein.",
    icon:CalendarDays
  }
];
const faqs=[
  {
    question:"Sind Ruby Hair Extensions aus Echthaar?",
    answer:"Ruby Hair Tape-in Extensions bestehen laut Produktangaben aus 100 % Echthaar. Beachte die Angaben zur gewählten Variante."
  },
  {
    question:"Wie viele Extensions sind in einer Packung?",
    answer:"Im derzeitigen Ruby Hair Katalog enthält eine Packung 10 einzelne Tape-in Extensions."
  },
  {
    question:"Welche Länge ist die richtige?",
    answer:"Die verfügbaren Längen werden für jede Farbe direkt im Produkt angezeigt. Welche Länge optisch und technisch sinnvoll ist, hängt von deiner Ausgangslänge und dem gewünschten Look ab."
  },
  {
    question:"Wie viele Packungen brauche ich?",
    answer:"Als Orientierung nennt der bestehende Produktkatalog 2–4 Packungen für dünnes, 3–4 für normales und 6–8 für dickes Haar. Der tatsächliche Bedarf kann je nach Methode, Haarstruktur und gewünschter Fülle abweichen. Lass dich im Zweifel individuell beraten."
  },
  {
    question:"Kann ich mit Extensions schlafen?",
    answer:"Ja. Ruby Hair empfiehlt, das Haar vor dem Schlafen vollständig zu trocknen, sanft zu bürsten und locker zusammenzubinden oder zu flechten."
  },
  {
    question:"Wie wasche ich meine Haarverlängerung?",
    answer:"Wasche schonend und möglichst aufrecht, damit die Verbindungspunkte nicht unnötig belastet werden. Ruby Hair nennt ungefähr zwei Haarwäschen pro Woche als Orientierung."
  },
  {
    question:"Was ist bei der Farbwahl wichtig?",
    answer:"Bildschirmfarben können von echten Farbtönen abweichen. Vergleiche den Farbton daher nicht nur mit dem dargestellten Foto und nutze bei Unsicherheit die persönliche Beratung."
  }
];
export default function HairGuide(){
  return <ShopLayout>
    <section className="rh-editorial-hero rh-shell">
      <div className="rh-editorial-copy">
        <nav className="rh-breadcrumb" aria-label="Breadcrumb"><Link href="/">Startseite</Link><span>/</span><span>Hair Guide</span></nav>
        <div className="rh-eyebrow">RUBY HAIR / THE HAIR GUIDE</div>
        <h1>Good hair.<br/><em>Great care.</em></h1>
        <p>Wähle Länge und Farbe deiner Tape-in Extensions. Dazu die wichtigsten Pflegetipps.</p>
        <a href="#pflege" className="rh-editorial-cta">PFLEGE ENTDECKEN <ArrowUpRight size={18}/></a>
      </div>
      <div className="rh-editorial-image">
        <img src="/assets/story-blonde.webp" alt="Lange blonde Haare – Inspiration für den Ruby Hair Hair Guide"/>
        <span>RUBY HAIR / BEAUTY ESSENTIALS</span>
      </div>
    </section>

    <section className="rh-guide-methods rh-shell" id="methoden">
      <div className="rh-section-heading"><div><div className="rh-eyebrow">01 / DEINE METHODE</div><h2>Find your <em>fit.</em></h2></div>
        <p>Wähle die Länge deiner Tape-in Extensions.</p></div>
      <div className="rh-guide-method-grid">
        <article>
          <div className="rh-guide-method-photo"><img src="/media/tape-in-extensions-bg-17a4f5094.png" alt="Ruby Hair Tape-in Kurz"/></div>
          <div className="rh-guide-method-info"><h3>Tape-in Kurz</h3>
            <p>45–50 cm Echthaar-Extensions.</p>
            <div className="rh-guide-method-facts"><span>100 % Echthaar</span><span>10 Tape-ins / Packung</span></div>
            <Link href="/kollektionen/tape-in-extensions/?laenge=45-50-cm">TAPE-IN KURZ ANSEHEN <ArrowUpRight size={17}/></Link>
          </div>
        </article>
        <article>
          <div className="rh-guide-method-photo"><img src="/media/60-3-scaled-e99a55c0d.jpg" alt="Ruby Hair Tape-in Lang"/></div>
          <div className="rh-guide-method-info"><h3>Tape-in Lang</h3>
            <p>55–60 cm Echthaar-Extensions.</p>
            <div className="rh-guide-method-facts"><span>100 % Echthaar</span><span>10 Tape-ins / Packung</span></div>
            <Link href="/kollektionen/tape-in-extensions/?laenge=55-60-cm">TAPE-IN LANG ANSEHEN <ArrowUpRight size={17}/></Link>
          </div>
        </article>
      </div>
    </section>

    <section className="rh-guide-care" id="pflege"><div className="rh-shell">
      <div className="rh-section-heading"><div><div className="rh-eyebrow">02 / PFLEGE ROUTINE</div>
        <h2>Care for your <em>hair.</em></h2></div><p>Vier einfache Schritte aus den Ruby Hair Pflegehinweisen für deine tägliche Routine.</p></div>
      <div className="rh-care-grid">
        {careSteps.map(step=><article key={step.number}>
          <div className="rh-care-top"><span>{step.number} / 04</span><step.icon size={27} strokeWidth={1.4}/></div>
          <h3>{step.title}</h3><p>{step.intro}</p><small>{step.note}</small>
        </article>)}
      </div>
    </div></section>

    <section className="rh-guide-faq rh-shell" id="faq">
      <div className="rh-section-heading"><div><div className="rh-eyebrow">03 / GUT ZU WISSEN</div>
        <h2>Answers for <em>you.</em></h2></div><p>Antworten zu Pflege, Länge und Farbwahl.</p></div>
      <div className="rh-faq-layout">
        <div className="rh-faq-aside"><HelpCircle size={30} strokeWidth={1.3}/><h3>Du bist unsicher?</h3><p>Wir helfen dir bei Farbe und Länge.</p>
          <Link href="/kontakt/">PERSÖNLICH BERATEN LASSEN <ArrowUpRight size={17}/></Link>
        </div>
        <div className="rh-product-facts rh-faq-details">
          {faqs.map((faq,i)=><details key={faq.question} open={i===0}>
            <summary>{faq.question}</summary><p>{faq.answer}</p>
          </details>)}
        </div>
      </div>
    </section>

    <section className="rh-editorial-outro"><div className="rh-shell">
      <Sparkles size={26} strokeWidth={1.3}/>
      <div><span className="rh-eyebrow">NEXT STEP / YOUR SIGNATURE LOOK</span><h2>Ready for your<br/><em>new look?</em></h2></div>
      <Link href="/kollektionen/" className="rh-editorial-cta">TAPE-IN LÄNGEN ENTDECKEN <ArrowUpRight size={17}/></Link>
    </div></section>
  </ShopLayout>;
}
