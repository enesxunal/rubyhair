import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import ShopLayout from "@/components/site-shell";
import {getPrisma} from "@/lib/prisma";
import {getCustomerAccount} from "@/lib/customer-account";
import {safeCustomerTrackingUrl} from "@/lib/customer-account-rules";
import CustomerLogoutButton from "@/components/customer-logout-button";
import CustomerAccountSettings from "@/components/customer-account-settings";
import {FileText,Package,Truck,ShieldCheck,ArrowUpRight,Gift} from "lucide-react";
import {giftViewUrl,euroGift} from "@/lib/gift-cards/rules";
export const metadata:Metadata={title:"Mein Konto – Bestellungen & Rechnungen",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export const runtime="nodejs";
const euro=(c:number)=>new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(c/100);
const statusText:Record<string,string>={pending_payment:"Zahlung ausstehend",payment_authorized:"Zahlung autorisiert",payment_confirmed:"Bezahlt",preparing:"Wird vorbereitet",shipped:"Versendet",delivered:"Zugestellt",cancelled:"Storniert",failed:"Fehlgeschlagen",refunded:"Erstattung vermerkt"};
const addressText=(value:unknown)=>{
 if(!value||typeof value!=="object"||Array.isArray(value))return null;
 const a=value as Record<string,unknown>;
 const str=(key:string)=>typeof a[key]==="string"?String(a[key]).slice(0,125):"";
 const street=str("street"),postalCode=str("postalCode"),city=str("city");
 return street&&postalCode&&city?`${street}, ${postalCode} ${city}`:null;
};
export default async function MyAccount(){
 const customer=await getCustomerAccount();
 if(!customer)redirect("/konto/anmelden/");
 const orders=await getPrisma().order.findMany({
  where:{customerEmail:{equals:customer.email,mode:"insensitive"},testOnly:false},
  include:{lines:{include:{variant:{include:{product:true}}}},giftPurchases:{select:{id:true,amountCents:true,recipientName:true,status:true}},invoice:{select:{invoiceNumber:true}}},
  orderBy:{createdAt:"desc"},take:30
 });
 const addresses=[...new Set(orders.map(x=>addressText(x.shippingAddress)).filter((x):x is string=>Boolean(x)))].slice(0,3);
 const giftPurchases=await getPrisma().giftPurchase.findMany({where:{buyerEmail:customer.email,status:"captured"},select:{id:true,recipientName:true,amountCents:true,createdAt:true},orderBy:{createdAt:"desc"},take:15});
 return <ShopLayout><div className="rh-shell rh-account-dashboard">
  <nav className="rh-breadcrumb"><Link href="/">Startseite</Link><span>/</span><span>Mein Konto</span></nav>
  <header className="rh-account-dashboard-header"><div><div className="rh-eyebrow">RUBY HAIR / MEIN KONTO</div><h1>Willkommen{customer.firstName?`, ${customer.firstName}`:""}.</h1><p>{customer.email}</p></div><CustomerLogoutButton/></header>
  <section className="rh-account-summary" aria-label="Kontoübersicht"><div><Package size={22}/><strong>{orders.length}{orders.length===30?"+":""}</strong><span>Bestellungen</span></div><div><FileText size={22}/><strong>{orders.filter(x=>x.invoice).length}</strong><span>Rechnungen</span></div><div><Truck size={22}/><strong>{orders.filter(x=>Boolean(x.trackingNumber)).length}</strong><span>Sendungsverfolgungen</span></div></section>
  <section className="rh-account-orders"><div className="rh-account-heading"><h2>Deine Bestellungen</h2><span>Die letzten 30 Bestellungen</span></div>
   {orders.length===0?<div className="rh-account-empty"><Package size={30}/><h3>Noch keine Bestellungen</h3><p>Hier erscheinen deine Bestellungen, sobald du mit dieser E-Mail-Adresse bei Ruby Hair einkaufst.</p><Link href="/kollektionen/">Extensions entdecken <ArrowUpRight size={16}/></Link></div>:orders.map(o=>{
     const tracking=safeCustomerTrackingUrl(o.trackingCarrier,o.trackingNumber);
     return <article className="rh-account-order" key={o.id}>
      <div className="rh-account-order-top"><div><span>BESTELLUNG</span><strong>#{o.orderNumber.toString()}</strong><small>{o.createdAt.toLocaleDateString("de-DE",{timeZone:"Europe/Berlin",dateStyle:"medium"})}</small></div><div><span>STATUS</span><strong>{statusText[o.status]||"In Bearbeitung"}</strong><small>{euro(o.totalCents)}</small></div></div>
      <div className="rh-account-order-lines">{o.lines.map(l=><div key={l.id}><span>{l.variant.product.name} · {l.variant.colorLabel} · {l.variant.lengthLabel} × {l.quantity}</span><strong>{euro(l.lineTotalCents)}</strong></div>)}
       {o.giftPurchases.map(g=><div key={g.id}><span>Ruby Hair Geschenkgutschein für {g.recipientName} · {g.status==="captured"?"Bezahlt":"Zahlung ausstehend"}</span><strong>{euro(g.amountCents)}</strong></div>)}</div>
      <div className="rh-account-order-actions">{o.invoice&&<a href={`/api/konto/rechnung/${o.id}`} download><FileText size={16}/> Rechnung als PDF</a>}
      {tracking&&<a href={tracking} target="_blank" rel="noopener noreferrer"><Truck size={16}/> DHL-Sendung verfolgen <ArrowUpRight size={14}/></a>}
      {!o.invoice&&!tracking&&<span>Updates erhältst du auch per E-Mail.</span>}</div>
     </article>;
    })}
  </section>
  {giftPurchases.length>0&&<section className="rh-account-orders" style={{marginTop:36}}><div className="rh-account-heading"><h2>Deine Geschenkgutscheine</h2><span>Bereits bezahlte Geschenke</span></div>
   <div className="rh-account-address-grid">{giftPurchases.map(g=><div className="rh-account-saved-address" key={g.id}><Gift size={22} color="#81516a"/><strong style={{display:"block",fontSize:18,marginTop:13}}>{euroGift(g.amountCents)}</strong><p>Für {g.recipientName} · {g.createdAt.toLocaleDateString("de-DE")}</p><Link href={giftViewUrl(g.id)}>Geschenkkarte anzeigen ↗</Link></div>)}</div>
  </section>}
  {!customer.hasPassword&&<div className="rh-account-legacy-notice"><ShieldCheck size={20}/><p>Dein Konto wurde bisher ohne Passwort genutzt. <Link href="/konto/anmelden/">Bestätige deine E-Mail erneut und lege deinen Namen und dein Passwort fest.</Link></p></div>}
  <CustomerAccountSettings firstName={customer.firstName||""} lastName={customer.lastName||""} email={customer.email}/>
  <section className="rh-account-addresses"><div><h2>Adressen früherer Bestellungen</h2><p>Diese Daten stammen aus vergangenen Bestellungen und bleiben unverändert.</p></div>
    {addresses.length?<ul>{addresses.map(a=><li key={a}>{a}</li>)}</ul>:<p>Es liegen keine Lieferadressen aus früheren Bestellungen vor.</p>}
  </section>
  <p className="rh-account-trust"><ShieldCheck size={17}/> Deine Rechnungen und Bestellungen sind nur nach einer verifizierten Anmeldung sichtbar. Ein Kundenkonto ist für einen Kauf nicht erforderlich.</p>
 </div></ShopLayout>;
}
