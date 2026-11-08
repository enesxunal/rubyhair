import type {Metadata} from "next";
import Link from "next/link";
import {AtSign,MapPin,ArrowUpRight,Instagram} from "lucide-react";
import ShopLayout from "@/components/site-shell";
import ContactComposer from "@/components/contact-composer";
export const metadata:Metadata={
  title:"Kontakt & persönliche Beratung",
  description:"Ruby Hair Kontakt: Beratung zu Tape-in Extensions, Längen und Haarfarben. Ruby Hair, Klara Straße 19, 45130 Essen. info@rubyhair.de."
};
export default function Contact(){
  return <ShopLayout>
    <section className="rh-editorial-hero rh-contact-hero rh-shell">
      <div className="rh-editorial-copy">
        <nav className="rh-breadcrumb"><Link href="/">Startseite</Link><span>/</span><span>Kontakt</span></nav>
        <div className="rh-eyebrow">RUBY HAIR / LET'S TALK</div>
        <h1>Let&apos;s talk<br/><em>about hair.</em></h1>
        <p>Ob neue Extensions, passende Farbe oder eine Frage zu deiner Bestellung: Wir helfen dir gerne weiter.</p>
        <a className="rh-editorial-cta" href="mailto:info@rubyhair.de">E-MAIL SCHREIBEN <ArrowUpRight size={18}/></a>
      </div>
      <div className="rh-editorial-image"><img src="/assets/hero-brunette.webp" alt="Ruby Hair Extension-Inspiration in warmen Brauntönen"/>
        <span>RUBY HAIR / ESSEN</span></div>
    </section>
    <section className="rh-contact-body rh-shell">
      <div className="rh-section-heading"><div><div className="rh-eyebrow">01 / SO ERREICHST DU UNS</div>
        <h2>We're here <em>for you.</em></h2></div><p>Du kannst Ruby Hair direkt kontaktieren oder deine Nachricht zunächst im E-Mail-Entwurf vorbereiten.</p></div>
      <div className="rh-contact-methods">
        <a href="mailto:info@rubyhair.de"><AtSign size={25} strokeWidth={1.4}/><span>PER E-MAIL</span><strong>info@rubyhair.de</strong><ArrowUpRight size={17}/></a>
        <div><MapPin size={25} strokeWidth={1.4}/><span>IN ESSEN</span><strong>Klara Straße 19<br/>45130 Essen, Deutschland</strong>
          <a href="https://www.google.com/maps/search/?api=1&query=Klara+Strasse+19+45130+Essen" target="_blank" rel="noopener noreferrer">AUF KARTE ANSEHEN <ArrowUpRight size={15}/></a></div>
        <a href="https://www.instagram.com/rubyhair.de/" target="_blank" rel="noopener noreferrer"><Instagram size={25} strokeWidth={1.4}/><span>INSTAGRAM</span><strong>@rubyhair.de</strong><ArrowUpRight size={17}/></a>
      </div>
    </section>
    <section className="rh-contact-form-section"><div className="rh-shell rh-contact-form-layout">
      <div className="rh-contact-form-intro">
        <span className="rh-eyebrow">02 / DEINE NACHRICHT</span>
        <h2>A little <em>hello.</em></h2>
        <p>Beschreibe kurz, was du suchst. Bei bestehenden Bestellungen hilft uns deine Bestellnummer.</p>
        <div className="rh-contact-small-note">HINWEIS: Das Formular erstellt einen E-Mail-Entwurf in deinem Mailprogramm. Es ist noch kein Online-Kontaktformular mit Serverversand.</div>
      </div>
      <ContactComposer/>
    </div></section>
    <section className="rh-contact-bottom rh-shell"><div className="rh-eyebrow">NEU BEI RUBY HAIR?</div>
      <h2>Start with the <em>Hair Guide.</em></h2>
      <p>Die wichtigsten Antworten zur Auswahl und Pflege findest du in unserem Guide.</p>
      <Link href="/ratgeber/" className="rh-editorial-cta">HAIR GUIDE ENTDECKEN <ArrowUpRight size={17}/></Link>
    </section>
  </ShopLayout>;
}
