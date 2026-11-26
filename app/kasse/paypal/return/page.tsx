import {createHmac} from "node:crypto";
import type {MetaPurchaseData} from "@/lib/meta-pixel";
import {recordCheckoutDiagnostic} from "@/lib/checkout-diagnostics";
import type {Metadata} from "next";
import {after} from "next/server";
import {verifyCheckoutSignature,verifyWalletCheckoutSignature,type WalletCheckoutMethod} from "@/lib/customer-checkout";
import {finalizePayPalCheckout} from "@/lib/customer-order-finalize";
import {runCustomerJobs} from "@/lib/customer-automation";
import {deliverGiftEmails} from "@/lib/gift-cards/mail";
import CheckoutSuccessClear from "@/components/checkout-success-clear";
import {getPrisma} from "@/lib/prisma";
import {giftViewUrl} from "@/lib/gift-cards/rules";
export const metadata:Metadata={title:"PayPal Zahlung | Ruby Hair",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export const maxDuration=60;
export default async function CustomerPayPalReturn({searchParams}:{searchParams:Promise<{orderId?:string;state?:string;token?:string;cancel?:string;wallet?:string}>}){
 const p=await searchParams;
 const walletMethod=p.wallet==="apple_pay"||p.wallet==="google_pay"?p.wallet as WalletCheckoutMethod:null;
 const walletValid=Boolean(walletMethod&&typeof p.orderId==="string"&&/^[0-9a-f-]{36}$/i.test(p.orderId)&&
  typeof p.state==="string"&&verifyWalletCheckoutSignature(p.orderId!,walletMethod!,p.state));
 const valid=typeof p.orderId==="string"&&/^[0-9a-f-]{36}$/i.test(p.orderId)&&typeof p.state==="string"&&
  (walletValid||(!p.wallet&&verifyCheckoutSignature(p.orderId,"paypal",p.state)));
 let title="Zahlung wird geprüft",message="Bitte starte keine weitere Zahlung, während wir den Status überprüfen.";
 let paid=false;
 if(!valid){title="Ungültiger Zahlungslink";message="Bitte kontaktiere Ruby Hair mit deiner Bestellnummer.";}
 else if(p.cancel){after(()=>recordCheckoutDiagnostic(walletMethod||"paypal","return","RETURN_CANCELLED","server",p.orderId));title="PayPal wurde verlassen";message="Die Bestellung ist noch nicht als bezahlt bestätigt. Bitte prüfe den Status, bevor du einen neuen Kauf startest.";}
 else if(!p.token||!/^[A-Za-z0-9_-]{8,60}$/.test(p.token)){
  after(()=>recordCheckoutDiagnostic(walletMethod||"paypal","return","RETURN_INCOMPLETE","server",p.orderId));title="PayPal Rückmeldung unvollständig";message="Deine Bestellung wird geprüft; bitte nicht erneut bezahlen.";
 }else{
  try{
   // Wallet purchases are captured by the signed, server-verified API before redirect.
   // Never run a second capture from a browser navigation.
   const done=walletValid?await (async()=>{
    const order=await getPrisma().order.findUnique({where:{id:p.orderId!},
      select:{status:true,paymentReference:true,invoice:{select:{invoiceNumber:true}}}});
    return {paid:order?.status==="payment_confirmed"&&order.paymentReference===p.token&&Boolean(order.invoice),
      invoiceNumber:order?.invoice?.invoiceNumber||null};
   })():await finalizePayPalCheckout(p.orderId!,true,p.token);
   if(done.paid){paid=true;title="Zahlung bestätigt";message=`Deine Rechnung ${done.invoiceNumber} wurde erstellt. Die Bestellbestätigung wird automatisch per E-Mail verschickt.`;
    after(async()=>{try{await Promise.all([runCustomerJobs(2),deliverGiftEmails(5)])}catch{}});
   }
  }catch{after(()=>recordCheckoutDiagnostic(walletMethod||"paypal","return","RETURN_REVIEW","server",p.orderId));title="Zahlung wird geprüft";message="Der Zahlungsanbieter oder die Bestellbestätigung ist noch nicht synchronisiert. Bitte kein zweites Mal bezahlen.";}
 }
 // Read only a recent, genuinely captured order. No historic conversions are replayed.
 let purchase:MetaPurchaseData|undefined;
 if(paid&&valid&&process.env.SESSION_SECRET){
  try{
   const row=await getPrisma().order.findFirst({where:{id:p.orderId!,testOnly:false,status:"payment_confirmed",currency:"EUR",invoice:{isNot:null},payments:{some:{eventType:"PAYMENT.CAPTURE.COMPLETED",provider:"paypal",receivedAt:{gte:new Date(Math.max(Date.parse("2026-11-26T17:10:00Z"),Date.now()-30*60000))}}}},select:{id:true,totalCents:true,giftAppliedCents:true}});
   if(row&&row.totalCents>row.giftAppliedCents)purchase={value:(row.totalCents-row.giftAppliedCents)/100,currency:"EUR",eventId:createHmac("sha256",process.env.SESSION_SECRET).update("ruby-meta-purchase:"+row.id).digest("hex")};
  }catch{/* Analytics may never prevent the paid confirmation. */}
 }
 const purchasedGifts=paid&&valid?await getPrisma().giftPurchase.findMany({
  where:{cartOrderId:p.orderId!,status:"captured",card:{isNot:null}},select:{id:true,recipientName:true},orderBy:{createdAt:"asc"}
 }):[];
 return <main className="rh-shell" style={{padding:"90px 20px",maxWidth:780,margin:"auto"}}>
  <h1>{title}</h1><p>{message}</p>{valid&&paid&&<CheckoutSuccessClear orderId={p.orderId!} purchase={purchase}/>}
  {purchasedGifts.length>0&&<section className="rh-gift-paid-links"><h2>Deine Geschenkkarten</h2>
   <p>Deine digitalen Geschenke sind bezahlt. Du kannst jede Karte jetzt ansehen und als Bild speichern. Die E-Mail-Zustellung wird automatisch bearbeitet.</p>
   {purchasedGifts.map(g=><a className="rh-gift-primary" key={g.id} href={giftViewUrl(g.id)}>Geschenkgutschein für {g.recipientName} ansehen ↗</a>)}
  </section>}
  <p><a href="/konto/">Mein Kundenkonto</a> · <a href="/kollektionen/">Weiter einkaufen</a> · <a href="/kontakt/">Kontakt zum Ruby Hair Team</a></p>
 </main>;
}
