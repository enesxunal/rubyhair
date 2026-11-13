import type {Metadata} from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {AlertCircle,CheckCircle2,Boxes,ArrowUpRight} from "lucide-react";
import { isAdmin } from "@/lib/admin-auth";
import { getPrisma } from "@/lib/prisma";
import {saveVariantAction,saveProductAction} from "../actions";
import AdminShell from "../admin-shell";
import AdminVariantBulk from "@/components/admin-variant-bulk";

export const metadata:Metadata={title:"Ruby Hair Verwaltung",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export const runtime="nodejs";

export default async function Admin({searchParams}:{searchParams:Promise<{updated?:string;productUpdated?:string;bestand?:string}>}){
  if(!await isAdmin())redirect("/admin/login");
  const {updated,productUpdated,bestand}=await searchParams;
  const db=getPrisma();
  const products=await db.product.findMany({include:{variants:{orderBy:{colorLabel:"asc"}}},orderBy:{name:"asc"}});
  const count=products.reduce((n,p)=>n+p.variants.length,0);
  const unknown=products.reduce((n,p)=>n+p.variants.filter(v=>v.stockQuantity===null).length,0);
  const zero=products.reduce((n,p)=>n+p.variants.filter(v=>v.stockQuantity===0).length,0);
  const verified=count-unknown;
  const verifiedPercent=count?Math.round(verified/count*100):0;
  const mode=["unbekannt","null","verifiziert"].includes(bestand||"")?bestand:"alle";
  const matches=(stock:number|null)=>mode==="alle"||mode==="unbekannt"&&stock===null||mode==="null"&&stock===0||mode==="verifiziert"&&stock!==null;
  return <AdminShell current="products" title="Produkte & Bestand." description="Artikeltexte, Preise und Varianten verwalten. Leere Bestandsfelder bedeuten unbekannt – nicht ausverkauft.">
    <section className="rh-admin-panel-card rh-studio-products-health">
      <div className="rh-studio-products-health-head">
        <div><span className="rh-admin-overline">LAGER / QUALITÄTSKONTROLLE</span><h2>{verifiedPercent}% Bestandsdaten geprüft</h2>
          <p>{verified} von {count} Varianten mit bekannter Stückzahl. Unbekannt ist nicht dasselbe wie ausverkauft.</p></div>
        {unknown?<AlertCircle size={27}/>:<CheckCircle2 size={27}/>}
      </div>
      <div className="rh-admin-inventory-bar" aria-label={verified+" von "+count+" Varianten mit bekannter Stückzahl"}><span style={{width:verifiedPercent+"%"}}/></div>
      <div className="rh-studio-products-totals"><span><b>{products.length}</b> Produkte</span><span><b>{count}</b> Varianten</span>
        <span><b>{unknown}</b> Mengen unbekannt</span><span><b>{zero}</b> Ausverkauft (0)</span></div>
    </section>
    <nav className="rh-studio-product-jump" aria-label="Zu Produkten springen">
      <strong>PRODUKTÜBERSICHT</strong>
      {products.map(p=><Link key={p.id} href={"#produkt-"+p.id}>{p.name} <span>{p.variants.length} Varianten</span><ArrowUpRight size={14}/></Link>)}
    </nav>
    <p className="rh-admin-warning">Wichtig: Der Shop ist eine Vorschau. Preise und Bestände kannst du verwalten, aber Live-Bestellungen und Zahlungen bleiben gesperrt.</p>
    <nav className="rh-admin-stock-filters" aria-label="Bestandsfilter">
      {[
        {value:"alle",name:"Alle Varianten",n:count},
        {value:"unbekannt",name:"Unbekannt",n:unknown},
        {value:"null",name:"Bestand 0",n:zero},
        {value:"verifiziert",name:"Mit Stückzahl",n:count-unknown}
      ].map(f=><a key={f.value}
        href={f.value==="alle"?"/admin/produkte":"/admin/produkte?bestand="+f.value}
        aria-current={mode===f.value?"page":undefined}
        className={mode===f.value?"is-active":undefined}>{f.name} <b>{f.n}</b></a>)}
    </nav>
    {updated&&<p role="status" className="rh-admin-success">{updated==="bulk"?"Alle Aenderungen gespeichert.":"Variante gespeichert."}</p>}
    {productUpdated&&<p role="status" className="rh-admin-success">Produkt gespeichert.</p>}
    {products.map(product=>{const visible=product.variants.filter(v=>matches(v.stockQuantity));if(!visible.length&&mode!=="alle")return null;return <section className="rh-admin-product" key={product.id} id={"produkt-"+product.id}>
      <h2>{product.name} <small>{visible.length} von {product.variants.length} Varianten</small></h2>
      <details className="rh-admin-product-details">
        <summary>Produkttexte und Hauptbild bearbeiten</summary>
        <form action={saveProductAction} className="rh-admin-product-form">
          <input type="hidden" name="id" value={product.id}/>
          <label>Name <input name="name" required minLength={3} maxLength={120} defaultValue={product.name}/></label>
          <label>Ueberschrift <input name="headline" maxLength={180} defaultValue={product.headline}/></label>
          <label>Beschreibung <textarea name="intro" required minLength={10} maxLength={1800} defaultValue={product.intro} rows={4}/></label>
          <label>Packungsinhalt <input name="pack" required maxLength={100} defaultValue={product.pack}/></label>
          <label>Material <input name="material" required maxLength={100} defaultValue={product.material}/></label>
          <label>Hauptbild (nur /media/ lokale Datei) <input name="image" required maxLength={200} defaultValue={product.image}/></label>
          <label className="rh-admin-active"><input name="active" type="checkbox" defaultChecked={product.active}/> Produkt aktiv</label>
          <button type="submit">Produkt speichern</button>
        </form>
      </details>
      <AdminVariantBulk productId={product.id} variants={visible.map(v=>({
        id:v.id,colorLabel:v.colorLabel,lengthLabel:v.lengthLabel,image:v.image,
        priceCents:v.priceCents,stockQuantity:v.stockQuantity,active:v.active
      }))}/>
    </section>;})}
  </AdminShell>;
}
