import type { Metadata } from "next";
import Link from "next/link";
import ShopLayout from "@/components/site-shell";
import { ArrowUpRight, Droplets, Brush, Moon, CalendarDays, Sparkles, HelpCircle } from "lucide-react";

export const metadata:Metadata={
  title:"Hair Guide – Auswahl & Pflege",
  description:"Ruby Hair Hair Guide: Keratin Bondings oder Tape-in Extensions wählen, Echthaar richtig pflegen, waschen, bürsten und vor dem Schlafen schützen."
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
    answer:"Laut Ruby Hair bestehen Keratin Bondings und Tape-in Extensions aus 100 % Echthaar. Beachte die individuellen Angaben zur jeweiligen Produktvariante."
  },
  {
    question:"Wie viele Extensions sind in einer Packung?",
    answer:"Im derzeitigen Produktkatalog sind bei Keratin Bondings 25 einzelne Bondings und bei Tape-in Extensions 10 einzelne Tape-in Strähnen pro Packung angegeben."
  },
  {
    question:"Welche Länge ist die richtige?",
    answer:"Die verfügbaren Längen werden für jede Farbe direkt im Produkt angezeigt. Welche Länge optisch und technisch sinnvoll ist, hängt von deiner Ausgangslänge und dem gewünschten Look ab."
  },
  {
    question:"Wie viele Packungen brauche ich?",
    answer:"Als Orientierung nennt der bestehende Produktkatalog 2–4 Packungen für dünnes, 4–5 für normales und 5–6 für dickes Haar. Der tatsächliche Bedarf kann je nach Methode, Haarstruktur und gewünschter Fülle abweichen. Lass dich im Zweifel individuell beraten."
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
        <p>Dein Weg zu den passenden Extensions: Methode und Farbe auswählen, richtig pflegen und lange Freude an deinem Look haben.</p>
        <a href="#pflege" className="rh-editorial-cta">PFLEGE ENTDECKEN <ArrowUpRight size={18}/></a>
      </div>
      <div className="rh-editorial-image">
        <img src="/assets/story-blonde.webp" alt="Lange blonde Haare – Inspiration für den Ruby Hair Hair Guide"/>
        <span>RUBY HAIR / BEAUTY ESSENTIALS</span>
      </div>
    </section>

    <section className="rh-guide-methods rh-shell" id="methoden">
      <div className="rh-section-heading"><div><div className="rh-eyebrow">01 / DEINE METHODE</div><h2>Find your <em>fit.</em></h2></div>
        <p>Zwei Methoden, viele Looks. Entdecke die Unterschiede und wähle die passende Produktkollektion.</p></div>
      <div className="rh-guide-method-grid">
        <article>
          <div className="rh-guide-method-photo"><img src="/media/keratin-bonding-bg-2c257f54c.png" alt="Keratin Bondings"/></div>
          <div className="rh-guide-method-info"><div className="rh-eyebrow">01 / KERATIN</div><h3>Keratin Bondings</h3>
            <p>Einzelne Echthaarsträhnen mit Keratin-Verbindungsstellen. Die Auswahl der richtigen Menge und Befestigung gehört in professionelle Hände.</p>
            <div className="rh-guide-method-facts"><span>100 % Echthaar</span><span>25 Bondings / Packung</span></div>
            <Link href="/kollektionen/keratin-bondings/">KERATIN ENTDECKEN <ArrowUpRight size={17}/></Link>
          </div>
        </article>
        <article>
          <div className="rh-guide-method-photo"><img src="/media/tape-in-extensions-bg-17a4f5094.png" alt="Tape-in Extensions"/></div>
          <div className="rh-guide-method-info"><div className="rh-eyebrow">02 / TAPE-IN</div><h3>Tape-in Extensions</h3>
            <p>Echthaar-Extensions mit Tape-Verbindungen. Auch hier sind eine passende Platzierung und fachgerechte Anwendung wichtig.</p>
            <div className="rh-guide-method-facts"><span>100 % Echthaar</span><span>10 Tape-ins / Packung</span></div>
            <Link href="/kollektionen/tape-in-extensions/">TAPE-IN ENTDECKEN <ArrowUpRight size={17}/></Link>
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
        <h2>Answers for <em>you.</em></h2></div><p>Antworten zu Produktarten, Pflege, Packungsinhalt und Farbwahl.</p></div>
      <div className="rh-faq-layout">
        <div className="rh-faq-aside"><HelpCircle size={30} strokeWidth={1.3}/><h3>Du bist unsicher?</h3><p>Wir helfen dir bei der Auswahl von Methode, Farbe und Länge.</p>
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
      <Link href="/kollektionen/" className="rh-editorial-cta">ALLE EXTENSIONS ENTDECKEN <ArrowUpRight size={17}/></Link>
    </div></section>
  </ShopLayout>;
}
