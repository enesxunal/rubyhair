import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {Gift,Wallet,Mail,CheckCircle2,Clock3,ArrowUpRight} from "lucide-react";
import {isAdmin} from "@/lib/admin-auth";
import {getPrisma} from "@/lib/prisma";
import {euroGift} from "@/lib/gift-cards/rules";
import {loadPurchaseAttributions} from "@/lib/admin-purchase-attribution";
import AdminPurchaseSource from "@/components/admin-purchase-source";
import AdminShell from "../admin-shell";
export const metadata:Metadata={title:"Geschenkgutscheine | Ruby Hair Verwaltung",robots:{index:false,follow:false}};
export const dynamic="force-dynamic",runtime="nodejs";
export default async function GiftAdmin(){
 if(!await isAdmin())redirect("/admin/login");
 const db=getPrisma();
 const [purchases,cards,redemptions]=await Promise.all([
  db.giftPurchase.findMany({take:60,orderBy:{createdAt:"desc"},select:{id:true,cartOrderId:true,createdAt:true,status:true,amountCents:true,buyerEmail:true,recipientEmail:true,recipientName:true,delivery:true,buyerMailStatus:true,recipientMailStatus:true,card:{select:{faceCents:true,balanceCents:true,status:true}}}}),
  db.giftCard.findMany({select:{faceCents:true,balanceCents:true,status:true}}),
  db.giftRedemption.findMany({where:{state:"settled"},select:{amountCents:true}})
 ]);
 const giftAttr=await loadPurchaseAttributions("gift",purchases.filter(p=>!p.cartOrderId).map(p=>p.id)).catch(()=>null);
 const cartAttr=await loadPurchaseAttributions("order",purchases.flatMap(p=>p.cartOrderId?[p.cartOrderId]:[])).catch(()=>null);
 const sold=cards.reduce((n,c)=>n+c.faceCents,0),outstanding=cards.filter(c=>c.status==="active").reduce((n,c)=>n+c.balanceCents,0),spent=redemptions.reduce((n,r)=>n+r.amountCents,0);
 return <AdminShell current="gifts" title="Geschenkgutscheine." description="Verkaufte Gutscheine, verbleibendes Guthaben und digitale Zustellung im Überblick.">
   <div className="rh-admin-kpi-grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))"}}>
    {[{title:"Aktivierte Gutscheine",value:String(cards.length),icon:Gift},{title:"Verkauft",value:euroGift(sold),icon:CheckCircle2},{title:"Offenes Guthaben",value:euroGift(outstanding),icon:Wallet},{title:"Eingelöst",value:euroGift(spent),icon:CheckCircle2}].map(x=><div key={x.title} className="rh-admin-kpi"><div className="rh-admin-kpi-top"><span>{x.title}</span><x.icon size={18}/></div><strong style={{fontSize:27}}>{x.value}</strong></div>)}
   </div>
   <section className="rh-admin-panel-card" style={{marginTop:22}}>
    <div className="rh-admin-card-title"><div><span>DIGITALE GESCHENKE</span><h2>Letzte Käufe</h2></div><Link href="/geschenkgutschein/" target="_blank">Im Shop ansehen <ArrowUpRight size={15}/></Link></div>
    <p className="rh-admin-muted">Ein Code wird ausschließlich nach verifiziertem PayPal-Capture aktiviert. Offene Zahlungen bleiben ohne Guthaben. Gutschein- und Bestellzahlungen werden separat protokolliert.</p>
    {purchases.length===0?<div className="rh-admin-empty"><Gift size={26}/><p>Noch keine Geschenkgutscheine verkauft.</p></div>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
     <thead><tr style={{borderBottom:"1px solid #e4d9db",textAlign:"left"}}><th style={{padding:12}}>Datum / Käufer</th><th style={{padding:12}}>Geschenk</th><th style={{padding:12}}>Status</th><th style={{padding:12}}>Betrag</th><th style={{padding:12}}>Guthaben</th><th style={{padding:12}}>E-Mail</th><th style={{padding:12}}>Herkunft</th></tr></thead>
     <tbody>{purchases.map(p=><tr key={p.id} style={{borderBottom:"1px solid #eee6e7"}}><td style={{padding:12}}><strong>{p.createdAt.toLocaleDateString("de-DE",{timeZone:"Europe/Berlin"})}</strong><div>{p.buyerEmail}</div></td>
      <td style={{padding:12}}>{p.recipientName}<div style={{color:"#866a79"}}>{p.delivery==="email"?"E-Mail-Zustellung":"Zum Download"}</div></td>
      <td style={{padding:12}}>{p.card?.status==="active"?"Aktiv":p.status==="pending"?"Zahlung offen":p.status}</td>
      <td style={{padding:12}}>{euroGift(p.amountCents)}</td><td style={{padding:12}}>{p.card?euroGift(p.card.balanceCents):"–"}</td>
      <td style={{padding:12}}><span>{p.buyerMailStatus}</span>{p.delivery==="email"&&<div>{p.recipientMailStatus}</div>}</td><td style={{padding:12}}><AdminPurchaseSource value={p.cartOrderId?cartAttr?.get(p.cartOrderId):giftAttr?.get(p.id)} unavailable={p.cartOrderId?cartAttr===null:giftAttr===null}/></td></tr>)}</tbody>
    </table></div>}
   </section>
 </AdminShell>;
}
