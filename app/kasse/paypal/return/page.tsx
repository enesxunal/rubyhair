import type {Metadata} from "next";
import {after} from "next/server";
import {verifyCheckoutSignature} from "@/lib/customer-checkout";
import {finalizePayPalCheckout} from "@/lib/customer-order-finalize";
import {runCustomerJobs} from "@/lib/customer-automation";
export const metadata:Metadata={title:"PayPal Zahlung | Ruby Hair",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export const maxDuration=60;
export default async function CustomerPayPalReturn({searchParams}:{searchParams:Promise<{orderId?:string;state?:string;token?:string;cancel?:string}>}){
 const p=await searchParams;
 const valid=typeof p.orderId==="string"&&/^[0-9a-f-]{36}$/i.test(p.orderId)&&
   typeof p.state==="string"&&verifyCheckoutSignature(p.orderId,"paypal",p.state);
 let title="Zahlung wird geprüft",message="Bitte starte keine weitere Zahlung, während wir den Status überprüfen.";
 if(!valid){title="Ungültiger Zahlungslink";message="Bitte kontaktiere Ruby Hair mit deiner Bestellnummer.";}
 else if(p.cancel){title="PayPal wurde verlassen";message="Die Bestellung ist noch nicht als bezahlt bestätigt. Bitte prüfe den Status, bevor du einen neuen Kauf startest.";}
 else if(!p.token||!/^[A-Za-z0-9_-]{8,60}$/.test(p.token)){
  title="PayPal Rückmeldung unvollständig";message="Deine Bestellung wird geprüft; bitte nicht erneut bezahlen.";
 }else{
  try{
   const done=await finalizePayPalCheckout(p.orderId!,true,p.token);
   if(done.paid){title="Zahlung bestätigt";message=`Deine Rechnung ${done.invoiceNumber} wurde erstellt. Die Bestellbestätigung wird automatisch per E-Mail verschickt.`;
    after(async()=>{try{await runCustomerJobs(2)}catch{}});
   }
  }catch{title="Zahlung wird geprüft";message="Der Zahlungsanbieter oder die Bestellbestätigung ist noch nicht synchronisiert. Bitte kein zweites Mal bezahlen.";}
 }
 return <main className="rh-shell" style={{padding:"90px 20px",maxWidth:780,margin:"auto"}}>
  <h1>{title}</h1><p>{message}</p><p><a href="/kontakt/">Kontakt zum Ruby Hair Team</a></p>
 </main>;
}
