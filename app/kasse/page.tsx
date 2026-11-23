import type {Metadata} from "next";
import {redirect} from "next/navigation";
import ShopLayout from "@/components/site-shell";
import CheckoutPreview from "@/components/checkout-preview";
import {isAdmin} from "@/lib/admin-auth";
import {getVariantTestState} from "@/lib/live-variant-qa";
import {publicCheckoutMode,shippingDeCents} from "@/lib/customer-checkout";
import type {LiveVariantTestView} from "@/components/live-variant-test-section";

export const metadata:Metadata={
 title:"Kasse – Ruby Hair",
 description:"Ruby Hair – sicherer Checkout, Lieferadresse und Zahlungsarten.",
 robots:{index:false,follow:false}
};
export const dynamic="force-dynamic";
type Query={liveTest?:string;paypalToken?:string;testError?:string;testPaid?:string;testStatus?:string};
export default async function Checkout({searchParams}:{searchParams:Promise<Query>}){
 const p=await searchParams;
 const admin=await isAdmin();
 if(p.liveTest==="1"&&!admin)redirect("/admin/login");
 let test:LiveVariantTestView|null=null;
 if(admin){
  const s=await getVariantTestState();
  if(p.liveTest==="1"||(publicCheckoutMode()==="disabled"&&(s.ready||s.pending))){
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
 }
 const mode=publicCheckoutMode();
 const active=mode==="public"||mode==="klarna_public"||mode==="payments_public"||mode==="admin_test"&&admin?mode:"disabled";
 return <ShopLayout><CheckoutPreview liveTest={test} checkoutMode={active} shippingCents={shippingDeCents()} cardFieldsEnabled={process.env.RUBY_PAYPAL_CARD_FIELDS_ENABLED==="true"&&active!=="disabled"&&active!=="klarna_public"} applePayEnabled={process.env.RUBY_PAYPAL_APPLE_PAY_ENABLED==="true"&&active!=="disabled"&&active!=="klarna_public"} googlePayEnabled={process.env.RUBY_PAYPAL_GOOGLE_PAY_ENABLED==="true"&&active!=="disabled"&&active!=="klarna_public"}/></ShopLayout>;
}
