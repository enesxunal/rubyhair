import type {Metadata} from "next";
import {redirect} from "next/navigation";
import Link from "next/link";
import {ShieldCheck,LockKeyhole,FlaskConical,AlertTriangle,CheckCircle2,CreditCard,FileText,Package,Mail} from "lucide-react";
import AdminShell from "../admin-shell";
import {isAdmin} from "@/lib/admin-auth";
import {getHiddenQaProduct,QA_PRICE_CENTS} from "@/lib/internal-test-product";
import {getPrisma} from "@/lib/prisma";
import {prepareHiddenQaProductAction} from "../test-purchase-actions";
import {verifyStoredPaymentProvider} from "../payment-check-action";
export const metadata:Metadata={title:"1 EUR Testbestellung | Ruby Hair Admin",robots:{index:false,follow:false}};
export const runtime="nodejs";export const dynamic="force-dynamic";
export default async function TestPurchasePage({searchParams}:{searchParams:Promise<{status?:string;probe?:string}>}){
 if(!await isAdmin())redirect("/admin/login");
 const params=await searchParams;
 const status=params.status;
 const probe=params.probe||"";
 const probeStates:Record<string,string>={
  paypal_authenticated:"PayPal Live-Zugang hat den OAuth-Test bestanden. Es wurde kein Geld abgebucht.",
  paypal_credentials_missing:"PayPal-Zugangsdaten sind unvollständig.",
  paypal_rejected:"PayPal hat die Zugangsdaten abgelehnt. Kontozugang kontrollieren.",
  paypal_unavailable:"PayPal ist vom Server aus derzeit nicht erreichbar.",
  paypal_inconclusive:"Der PayPal-Test war nicht eindeutig. Keine Zahlung freigeschaltet.",
  klarna_credentials_missing:"Klarna-Zugangsdaten sind unvollständig.",
  klarna_rejected:"Klarna hat die Zugangsdaten abgelehnt.",
  klarna_unavailable:"Klarna ist vom Server aus derzeit nicht erreichbar.",
  klarna_inconclusive:"Klarna-Sitzungstest nicht eindeutig. Ein echter Checkout-Test ist weiterhin erforderlich.",
 };
 const [qa,credentials]=await Promise.all([
  getHiddenQaProduct(),
  getPrisma().paymentIntegrationSetting.findMany({where:{environment:"live",provider:{in:["paypal","klarna","smtp","dhl"]}},select:{provider:true,field:true}})
 ]);
 const fields=new Map<string,Set<string>>();
 for(const setting of credentials){if(!fields.has(setting.provider))fields.set(setting.provider,new Set());fields.get(setting.provider)!.add(setting.field)}
 const paypalReady=["clientId","clientSecret","webhookId"].every(x=>fields.get("paypal")?.has(x));
 const klarnaReady=["username","password","merchantId"].every(x=>fields.get("klarna")?.has(x));
 const smtpReady=fields.get("smtp")?.has("password")===true;
 const dhlReady=["clientId","clientSecret","username","password","billingNumber"].every(x=>fields.get("dhl")?.has(x));
 return <AdminShell current="testorder" title="1 € Live-Test vorbereiten."
   description="Nur für Administratoren. Der Testartikel bleibt aus dem Shop verborgen, bis Zahlung, Rechnungen und Benachrichtigungen vollständig verifiziert sind.">
  {status==="created"&&<p className="rh-admin-success" role="status">Interner 1-€-Testartikel sicher vorbereitet. Keine Zahlung und keine Bestellung wurden ausgelöst.</p>}
  {status==="failed"&&<p className="rh-admin-warning" role="alert">Testartikel konnte nicht sicher erstellt werden. Bitte die Daten und den Server prüfen.</p>}
  {probe&&probeStates[probe]&&<p role="status" className={probe==="paypal_authenticated"?"rh-admin-success":"rh-admin-warning"}>{probeStates[probe]}</p>}
  <section className="rh-admin-panel-card" style={{marginTop:15}}>
   <div className="rh-admin-card-title"><div><span>RUBY HAIR / INTERNAL QA ONLY</span><h2>Versteckter Testartikel</h2></div><FlaskConical size={24}/></div>
   <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:30,margin:"22px 0"}}>
    <div style={{background:"#f8f1f4",padding:25,minWidth:180,borderRadius:6}}>
      <span style={{display:"block",fontSize:12,letterSpacing:1}}>INTERNE TESTBESTELLUNG</span>
      <strong style={{display:"block",fontFamily:"Georgia,serif",fontSize:40,color:"#512b3c",paddingTop:8}}>1,00 €</strong>
      <span style={{fontSize:12,color:"#84747b"}}>Nicht im öffentlichen Katalog</span>
    </div>
    <div style={{flex:1,minWidth:230}}>
     <p><strong>Status: </strong>{qa?.productActive||qa?.variantActive?"WARNUNG: Sichtbarkeit prüfen":qa?"Angelegt · Inaktiv · Versteckt":"Noch nicht angelegt"}</p>
     <p><strong>Preis: </strong>{qa?(qa.priceCents===QA_PRICE_CENTS?"1,00 €":"Preis prüfen"):"1,00 € (geplant)"}</p>
     <p><strong>Lager: </strong>{qa?.stockQuantity??"1 (geplant)"} · Nur QA, keine reguläre Ware</p>
     {!qa&&<form action={prepareHiddenQaProductAction}><button type="submit" className="rh-admin-mail-test-button"><LockKeyhole size={17}/> Versteckten Testartikel vorbereiten</button></form>}
    </div>
   </div>
  </section>
  <section className="rh-admin-panel-card" style={{marginTop:20}}>
   <div className="rh-admin-card-title"><div><span>GATE / KEINE LIVE-BESTELLUNG AUSLÖSEN</span><h2>Was für den 1-€-Test fehlt</h2></div><ShieldCheck size={24}/></div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(205px,1fr))",gap:13,marginTop:18}}>
    {[
      {title:"Testartikel",ready:!!qa&&!qa.productActive&&!qa.variantActive&&qa.priceCents===100,icon:Package},
      {title:"PayPal Live-Zugang hinterlegt",ready:paypalReady,icon:CreditCard},
      {title:"Klarna Live-Zugang hinterlegt",ready:klarnaReady,icon:CreditCard},
      {title:"IONOS SMTP-Passwort hinterlegt",ready:smtpReady,icon:Mail},
      {title:"DHL-API-Daten hinterlegt",ready:dhlReady,icon:Package},
      {title:"Rechtsgültige PDF-Rechnung",ready:false,icon:FileText},
      {title:"Checkout + Webhook + Bestellereignisse",ready:false,icon:ShieldCheck},
     ].map(item=><div key={item.title} style={{border:"1px solid #e7dee2",padding:15,borderRadius:5}}>
       <item.icon size={18}/><p style={{fontSize:13,fontWeight:700}}>{item.title}</p><p style={{fontSize:11,color:item.ready?"#397347":"#9a5565"}}>{item.ready?"Eingerichtet (Funktionstest ausstehend)":"Noch nicht vollständig"}</p>
     </div>)}
   </div>
   <div style={{marginTop:22,borderTop:"1px solid #e8dde2",paddingTop:20}}>
    <p style={{fontSize:13,fontWeight:700}}>Zahlungsanbieter verbinden – nur Lese-/Authentifizierungsprüfung</p>
    <p className="rh-admin-muted">Die folgenden Prüfungen lösen weder einen Kauf noch eine Abbuchung aus. Ein erfolgreicher API-Login ersetzt keinen signierten Webhook, keine Bestellabwicklung und keine Rechnung.</p>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:15}}>
     <form action={verifyStoredPaymentProvider}><input type="hidden" name="provider" value="paypal"/><button disabled={!paypalReady} type="submit" className="rh-admin-mail-test-button">PayPal-Zugang prüfen</button></form>
     <form action={verifyStoredPaymentProvider}><input type="hidden" name="provider" value="klarna"/><button disabled={!klarnaReady} type="submit" className="rh-admin-mail-test-button">Klarna-Zugang prüfen</button></form>
    </div>
   </div>
   <p className="rh-admin-warning" style={{marginTop:20}}><AlertTriangle size={17}/> Eine vorbereitete Variante ist noch kein Kauf. Es gibt keinen echten 1-€-Bezahlbutton und keine Rechnung, bis der Zahlungsstatus signiert verifiziert und eine einmalige Rechnungsnummer vergeben wird.</p>
   <p style={{display:"flex",flexWrap:"wrap",gap:18,marginTop:18}}><Link href="/admin/zahlungen">Zahlungszugänge konfigurieren</Link><Link href="/admin/benachrichtigungen">E-Mail & SMTP testen</Link><Link href="/admin/bestellungen">Bestellungen ansehen</Link></p>
  </section>
 </AdminShell>;
}
