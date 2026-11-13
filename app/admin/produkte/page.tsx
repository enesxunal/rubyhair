import type {Metadata} from "next";
import { redirect } from "next/navigation";
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
  const mode=["unbekannt","null","verifiziert"].includes(bestand||"")?bestand:"alle";
  const matches=(stock:number|null)=>mode==="alle"||mode==="unbekannt"&&stock===null||mode==="null"&&stock===0||mode==="verifiziert"&&stock!==null;
  return <AdminShell current="products" title="Produkte & Bestand." description="Artikeltexte, Preise und Varianten verwalten. Leere Bestandsfelder bedeuten unbekannt – nicht ausverkauft.">
    <div className="rh-admin-pill-row"><span className="rh-admin-stat-pill">{products.length} Produkte</span>
      <span className="rh-admin-stat-pill">{count} Varianten</span>
      <span className="rh-admin-stat-pill is-alert">{unknown} unbekannte Lagerbestände</span>
    </div>
    <p className="rh-admin-warning">Kundenbestellungen und Zahlungen sind gesperrt. Bestand ohne Angabe bedeutet: nicht verifiziert.</p>
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
