import type {Metadata} from "next";
import {redirect} from "next/navigation";
import Link from "next/link";
import {CreditCard,ShieldCheck} from "lucide-react";
import AdminShell from "../admin-shell";
import {isAdmin} from "@/lib/admin-auth";
import {lastCardQaOrder} from "@/lib/qa-card-one-euro";
import CardQaForm from "./card-qa-form";
export const metadata:Metadata={title:"1 EUR Karten-Livetest | Ruby Hair",robots:{index:false,follow:false}};
export const runtime="nodejs",dynamic="force-dynamic";
export default async function CardQaPage(){
 if(!await isAdmin())redirect("/admin/login");
 const existing=await lastCardQaOrder();
 return <AdminShell current="testorder" title="1 EUR Karten-Livetest" description="Sicherer, separater PayPal Card Fields Test. Nur Administratoren.">
  <section className="rh-admin-panel-card" style={{marginTop:17,padding:"clamp(20px,3vw,34px)",borderRadius:12,maxWidth:820}}>
   <div className="rh-admin-card-title"><div><span>RUBY HAIR / PAYPAL LIVE / ADMIN ONLY</span><h2>Visa / Mastercard live testen</h2></div><CreditCard size={24}/></div>
   <div style={{display:"flex",gap:16,alignItems:"center",background:"#f8f0f3",border:"1px solid #ecdde3",padding:20,borderRadius:9,marginTop:22}}>
    <div style={{fontFamily:"Georgia,serif",fontSize:43,color:"#5d3949",whiteSpace:"nowrap"}}>1,00 EUR</div>
    <div style={{fontSize:12,lineHeight:1.7,color:"#6b5661"}}>Einmaliger realer Testbetrag inklusive 19 % USt. Keine Ware, kein Versand, kein Eingriff in die normalen Shop-Bestellungen.</div>
   </div>
   <p style={{display:"flex",gap:8,alignItems:"center",marginTop:17,fontSize:12,lineHeight:1.7}}><ShieldCheck size={17} color="#52744e"/> Kartennummer, Ablaufdatum und CVV werden nur in PayPal-gesicherten Feldern eingegeben.</p>
   {existing&&<p style={{fontSize:13,color:"#97546e",marginTop:18}}>Es existiert bereits ein interner Karten-Testauftrag #{String(existing.orderNumber)} ({existing.status}). Ein weiterer Auftrag wird nicht erstellt. Falls PayPal noch keine Zahlung erfasst hat, kann dieselbe Bestellung erneut bestaetigt werden.</p>}
   <CardQaForm existingOrderId={existing?.id} existingPaypalOrderId={existing?.paymentReference||undefined}/>
  </section>
  <p style={{fontSize:12,marginTop:16}}><Link href="/admin/testbestellung">Andere interne Testbestellungen</Link></p>
 </AdminShell>;
}
