"use client";
import {useState} from "react";
import {useFormStatus} from "react-dom";
import {Save} from "lucide-react";
import {saveVariantBatchAction} from "../../app/admin/actions";

type Row={id:string;colorLabel:string;lengthLabel:string;image:string;priceCents:number;stockQuantity:number|null;active:boolean};

const colorSort=new Intl.Collator("de",{numeric:true,sensitivity:"base"});

function Submit({dirty}:{dirty:boolean}){
  const {pending}=useFormStatus();
  return <button type="submit" className="rh-admin-bulk-save" disabled={!dirty||pending}>
    <Save size={16}/>{pending?"Wird gespeichert ...":"Alle Änderungen speichern"}
  </button>;
}
export default function AdminVariantBulk({productId,variants}:{productId:string;variants:Row[]}){
  const [dirty,setDirty]=useState(false);
  const sortedVariants=[...variants].sort((a,b)=>colorSort.compare(a.colorLabel,b.colorLabel)||colorSort.compare(a.lengthLabel,b.lengthLabel));
  return <form action={saveVariantBatchAction} onChange={()=>setDirty(true)} className="rh-admin-bulk-form">
    <input type="hidden" name="productId" value={productId}/>
    <div className="rh-admin-bulk-top"><p>Preise, Bestand und Sichtbarkeit aller Varianten gleichzeitig bearbeiten. Leerer Bestand = unbekannt.</p><Submit dirty={dirty}/></div>
    <div className="rh-admin-table-wrap"><table className="rh-admin-bulk-table">
      <thead><tr><th>Farbe</th><th>Länge</th><th>Preis (EUR)</th><th>Bestand</th><th>Aktiv</th></tr></thead>
      <tbody>{sortedVariants.map(v=><tr key={v.id}>
        <td><img src={v.image} alt="" width={46} height={46}/><span>{v.colorLabel}</span>
          <input type="hidden" name="variantId" value={v.id}/>
          <input type="hidden" name={v.id+":beforePriceCents"} value={v.priceCents}/>
          <input type="hidden" name={v.id+":beforeStock"} value={v.stockQuantity??""}/>
          <input type="hidden" name={v.id+":beforeActive"} value={v.active?"1":"0"}/>
        </td>
        <td>{v.lengthLabel}</td>
        <td><input name={v.id+":priceEUR"} aria-label={"Preis "+v.colorLabel+" "+v.lengthLabel+" in Euro"} type="number" min="0.01" max="10000" step="0.01" defaultValue={(v.priceCents/100).toFixed(2)} required/></td>
        <td><input name={v.id+":stockQuantity"} aria-label={"Bestand "+v.colorLabel+" "+v.lengthLabel} type="number" min="0" max="1000000" step="1" defaultValue={v.stockQuantity??""} placeholder="Unbekannt"/></td>
        <td><label className="rh-admin-active"><input name={v.id+":active"} type="checkbox" defaultChecked={v.active}/><span>Aktiv</span></label></td>
      </tr>)}</tbody>
    </table></div>
    <div className="rh-admin-bulk-bottom"><span role="status">{dirty?"Nicht gespeicherte Änderungen":"Keine Änderungen"}</span><Submit dirty={dirty}/></div>
  </form>;
}
