import type {Metadata} from "next";
import ShopLayout from "@/components/site-shell";
import CheckoutPreview from "@/components/checkout-preview";
import {isAdmin} from "@/lib/admin-auth";
import {getVariantTestState} from "@/lib/live-variant-qa";
import type {LiveVariantTestView} from "@/components/live-variant-test-section";

export const metadata:Metadata={
 title:"Kasse – Ruby Hair",
 description:"Ruby Hair – Warenkorb und Kasse. Zahlungen für reguläre Kunden sind noch nicht aktiviert.",
 robots:{index:false,follow:false}
};
export const dynamic="force-dynamic";
type Query={liveTest?:string;paypalToken?:string;testError?:string;testPaid?:string;testStatus?:string};
export default async function Checkout({searchParams}:{searchParams:Promise<Query>}){
 const p=await searchParams;
 let test:LiveVariantTestView|null=null;
 if(p.liveTest==="1"&&await isAdmin()){
  const s=await getVariantTestState();
  const supplied=typeof p.paypalToken==="string"&&/^[A-Za-z0-9_-]{8,60}$/.test(p.paypalToken)?p.paypalToken:null;
  test={
   ready:s.ready,priceCents:s.priceCents,
   pending:s.pending?{id:s.pending.id,hasReference:Boolean(s.pending.paymentReference)}:null,
   completed:s.completed?{id:s.completed.id,invoiceNumber:s.completed.invoice?.invoiceNumber||null}:null,
   approvedPaypalToken:s.pending?.paymentReference===supplied?supplied:null,
   error:typeof p.testError==="string"?p.testError:null,
   status:typeof p.testStatus==="string"?p.testStatus:null,
   paid:typeof p.testPaid==="string"?p.testPaid:null
  };
 }
 return <ShopLayout><CheckoutPreview liveTest={test}/></ShopLayout>;
}
