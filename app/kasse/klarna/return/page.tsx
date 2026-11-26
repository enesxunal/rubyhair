import {recordCheckoutDiagnostic} from "@/lib/checkout-diagnostics";
import type {Metadata} from "next";
import {after} from "next/server";
import {runCustomerJobs} from "@/lib/customer-automation";
import {verifyCheckoutSignature} from "@/lib/customer-checkout";
import {confirmKlarnaCheckout} from "@/lib/customer-order-finalize";
export const metadata:Metadata={title:"Klarna Zahlung | Ruby Hair",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export const maxDuration=60;
export default async function KlarnaReturn({searchParams}:{searchParams:Promise<{orderId?:string;state?:string;sid?:string;order_id?:string;result?:string}>}){
 const p=await searchParams;
 let title="Klarna-Status wird geprüft",message="Bitte keine neue Bestellung starten, bis die Prüfung abgeschlossen ist.";
 if(!p.orderId||!p.state||!/^[0-9a-f-]{36}$/i.test(p.orderId)||!verifyCheckoutSignature(p.orderId,"klarna",p.state)){
  title="Ungültiger Zahlungslink";message="Bitte kontaktiere Ruby Hair.";
 }else if(p.result==="success"&&p.sid&&p.order_id){
  try{const out=await confirmKlarnaCheckout(p.orderId,p.sid,p.order_id);
   if(out.authorized){title="Klarna-Bestellung bestätigt";message="Deine Zahlung ist autorisiert. Sie wird beim Versand automatisch eingezogen und du erhältst dann deine Rechnung per E-Mail.";
    after(async()=>{try{await runCustomerJobs(2)}catch{}});
   }
  }catch{after(()=>recordCheckoutDiagnostic("klarna","return","RETURN_REVIEW","server",p.orderId));message="Die Klarna-Bestellung wird noch mit dem Zahlungsanbieter abgeglichen. Bitte nicht erneut bezahlen.";}
 }else if(["cancel","back","failure","error"].includes(p.result||"")){
  after(()=>recordCheckoutDiagnostic("klarna","return",p.result==="failure"?"KLARNA_RETURN_FAILURE":p.result==="error"?"KLARNA_RETURN_ERROR":p.result==="back"?"KLARNA_RETURN_BACK":"RETURN_CANCELLED","server",p.orderId));title="Klarna nicht abgeschlossen";message="Es wurde noch keine bestätigte Zahlung hinterlegt. Bitte kontaktiere uns, bevor du erneut bestellst.";
 }
 return <main className="rh-shell" style={{padding:"90px 20px",maxWidth:780,margin:"auto"}}><h1>{title}</h1><p>{message}</p><p><a href="/kontakt/">Kontakt</a></p></main>;
}
