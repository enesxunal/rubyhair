import type {Metadata} from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { getPrisma } from "@/lib/prisma";
import { logoutAction, saveVariantAction } from "./actions";

export const metadata:Metadata={title:"Ruby Hair Verwaltung",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export const runtime="nodejs";

export default async function Admin({searchParams}:{searchParams:Promise<{updated?:string}>}){
  if(!await isAdmin())redirect("/admin/login");
  const {updated}=await searchParams;
  const db=getPrisma();
  const [products,orders]=await Promise.all([
    db.product.findMany({include:{variants:{orderBy:{colorLabel:"asc"}}},orderBy:{name:"asc"}}),
    db.order.count()
  ]);
  return <main className="rh-admin-panel">
    <header className="rh-admin-bar"><div><small>RUBY HAIR</small><h1>Shop-Verwaltung</h1></div>
      <form action={logoutAction}><button type="submit">Abmelden</button></form>
    </header>
    <section className="rh-admin-highlights">
      <div><strong>{products.length}</strong><span>Produkte</span></div>
      <div><strong>{products.reduce((sum,p)=>sum+p.variants.length,0)}</strong><span>Varianten</span></div>
      <div><strong>{orders}</strong><span>Bestellungen (derzeit deaktiviert)</span></div>
    </section>
    <p className="rh-admin-warning">Kundenbestellungen und Zahlungen sind gesperrt. Bestand ohne Angabe bedeutet: nicht verifiziert.</p>
    {updated&&<p role="status" className="rh-admin-success">Variante gespeichert.</p>}
    {products.map(product=><section className="rh-admin-product" key={product.id}>
      <h2>{product.name} <small>{product.variants.length} Varianten</small></h2>
      <div className="rh-admin-table-wrap"><table>
        <thead><tr><th>Farbe</th><th>Länge</th><th>Preis (Cent)</th><th>Bestand</th><th>Aktiv</th><th>Aktion</th></tr></thead>
        <tbody>{product.variants.map(v=><tr key={v.id}>
          <td><img src={v.image} alt="" width={46} height={46}/><span>{v.colorLabel}</span></td>
          <td>{v.lengthLabel}</td>
          <td colSpan={4}><form action={saveVariantAction} className="rh-admin-variant-form">
            <input type="hidden" name="id" value={v.id}/>
            <label className="rh-admin-sr" htmlFor={"price-"+v.id}>Preis in Cent</label>
            <input id={"price-"+v.id} aria-label="Preis in Cent" name="priceCents" type="number" min="1" max="1000000" step="1" defaultValue={v.priceCents} required/>
            <label className="rh-admin-sr" htmlFor={"stock-"+v.id}>Bestand, leer bei unbekannt</label>
            <input id={"stock-"+v.id} aria-label="Bestand" name="stockQuantity" type="number" min="0" max="1000000" step="1" defaultValue={v.stockQuantity??""} placeholder="Unbekannt"/>
            <label className="rh-admin-active"><input type="checkbox" name="active" defaultChecked={v.active}/> Aktiv</label>
            <button type="submit">Speichern</button>
          </form></td>
        </tr>)}</tbody>
      </table></div>
    </section>)}
  </main>;
}
