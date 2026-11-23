import type {Metadata} from "next";
import {redirect} from "next/navigation";
import Link from "next/link";
import {isAdmin} from "@/lib/admin-auth";
import {probeKlarnaCardAvailability} from "../klarna-kart-actions";
export const metadata:Metadata={title:"Klarna Karten-Eignung – Ruby Hair",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
const statuses:Record<string,{label:string;detail:string}>={
 explicit_card:{label:"PAY_BY_CARD ausdrücklich gemeldet",detail:"Klarna hat die Kartenmethode als eigenen Identifier gemeldet. Ein echter Checkout- und Konto-freier Kartentest steht weiterhin aus."},
 pay_now_only:{label:"Pay Now vorhanden – Kartenzahlung NICHT nachgewiesen",detail:"Klarna meldet pay_now, aber nicht PAY_BY_CARD einzeln. Das kann Überweisung, Lastschrift oder Karte bedeuten. Kein unabhängiges Kartenangebot freischalten."},
 generic_klarna_only:{label:"Nur allgemeine Klarna-Kategorie gemeldet",detail:"Die API bündelt Zahlungsarten unter Klarna. Ob Kartenzahlung ohne Klarna-Anmeldung verfügbar ist, kann daraus nicht abgeleitet werden."},
 other_categories:{label:"Andere Zahlungsmethoden gemeldet",detail:"Keine eindeutige Kartenbestätigung aus den vom Anbieter verfügbaren Kategorien."},
 no_categories:{label:"Keine Kategorien zurückgegeben",detail:"Der Anbieter hat keine verifizierbare Zahlungsartenliste geliefert."},
 not_configured:{label:"Live-Klarna-Zugang nicht vollständig",detail:"Keine Sitzung gestartet."},
 rejected:{label:"Klarna-Zugang abgelehnt",detail:"Keine Zahlungsfreigabe."},
 forbidden:{label:"Klarna-Konto für diese Aktion nicht berechtigt",detail:"Bitte merchant access prüfen."},
 unavailable:{label:"Klarna-Prüfung fehlgeschlagen",detail:"Keine verbindliche Aussage zur Kartenverfügbarkeit."},
 inconclusive:{label:"Noch kein eindeutiges Prüfergebnis",detail:"Die Prüfung wurde noch nicht durchgeführt."}
};
export default async function KlarnaCardStatus({searchParams}:{searchParams:Promise<{ergebnis?:string}>}){
 if(!await isAdmin())redirect("/admin/login");
 const params=await searchParams;
 const state=statuses[params.ergebnis||""]||statuses.inconclusive;
 return <main style={{maxWidth:800,margin:"48px auto",padding:28,color:"#3b2833",fontFamily:"system-ui,sans-serif",lineHeight:1.65}}>
  <p style={{fontSize:11,letterSpacing:2,color:"#99677e"}}>RUBY HAIR / ADMIN / ZAHLUNGSMETHODEN</p>
  <h1 style={{fontFamily:"Georgia,serif",fontWeight:400,fontSize:38}}>Klarna · Kreditkarte prüfen</h1>
  <p>Einmaliger Live-API-Test für Deutschland (EUR, 100 €) ohne Kundendaten. Er erstellt ausschließlich eine temporäre Klarna-Zahlungssitzung: keine Bestellung, kein Zahlungslink, keine Autorisierung oder Abbuchung.</p>
  <section style={{padding:22,border:"1px solid #d9c3ce",borderRadius:10,background:"#f8f1f4",margin:"22px 0"}}>
   <strong>Prüfergebnis: {state.label}</strong><p>{state.detail}</p>
  </section>
  <form action={probeKlarnaCardAvailability}>
   <button type="submit" style={{padding:"13px 19px",background:"#583a47",color:"white",border:0,borderRadius:7,cursor:"pointer"}}>Klarna Live-Zahlungsarten abfragen</button>
  </form>
  <p style={{fontSize:12,color:"#816b77",marginTop:15}}>Die Prüfung ist nicht gleichbedeutend mit einer genehmigten separaten Kartenzahlung. Ein Pay-Now-Eintrag allein belegt keine Karte ohne Klarna-Konto.</p>
  <Link href="/admin/testbestellung">Zurück zu Zahlungs-Tests</Link>
 </main>;
}
