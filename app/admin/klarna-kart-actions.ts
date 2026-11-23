"use server";
import {redirect} from "next/navigation";
import {isAdmin} from "@/lib/admin-auth";
import {loadPaymentValue} from "@/lib/payment-secrets";
import {KlarnaClient} from "@/lib/klarna-provider-core";

/** The merchant explicitly initiates this one-time, non-purchasable Klarna probe.
 * Creates a short-lived provider session only, never a Ruby Hair order, HPP URL,
 * authorization, capture or customer payment. */
export async function probeKlarnaCardAvailability(){
 if(!await isAdmin())redirect("/admin/login");
 let result="inconclusive";
 try{
  const [username,password,merchantId]=await Promise.all([
   loadPaymentValue("klarna","live","username"),loadPaymentValue("klarna","live","password"),loadPaymentValue("klarna","live","merchantId")
  ]);
  if(!username||!password||!merchantId)result="not_configured";
  else{
   const check=await new KlarnaClient(username,password).createCardMethodProbeSession();
   // Klarna may group card payments under pay_now. Do not overclaim eligibility.
   result=check.categories.includes("pay_by_card")?"explicit_card":
    check.categories.includes("pay_now")?"pay_now_only":
    check.categories.includes("klarna")?"generic_klarna_only":
    check.categories.length?"other_categories":"no_categories";
  }
 }catch(e){
  const error=e instanceof Error?e.message:"UNKNOWN";
  result=error==="KLARNA_HTTP_401"?"rejected":error==="KLARNA_HTTP_403"?"forbidden":"unavailable";
  console.error("RUBY_KLARNA_CARD_METHOD_PROBE",{result});
 }
 redirect("/admin/klarna-kart-durum?ergebnis="+result);
}
