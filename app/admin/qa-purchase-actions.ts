"use server";
import {redirect} from "next/navigation";
import {isAdmin} from "@/lib/admin-auth";
import {beginOneEuroQaPayment,confirmOneEuroQaPayment,cancelPendingOneEuroQaOrder,QaPaymentError} from "@/lib/qa-live-paypal";

function reason(e:unknown){
 if(e instanceof QaPaymentError&&/^[A-Z_]{4,75}$/.test(e.reason))return e.reason;
 console.error("RUBY_QA_PAYMENT_ACTION_ERROR",{category:e instanceof Error?e.name:"unexpected"});
 return "QA_ACTION_FAILED";
}
export async function startOneEuroQaPaymentAction(formData:FormData){
 if(!await isAdmin())redirect("/admin/login");
 let paypalUrl:string;
 try{
  paypalUrl=await beginOneEuroQaPayment({
   name:String(formData.get("buyerName")||""),email:String(formData.get("buyerEmail")||""),
   confirmedSeller:formData.get("confirmSeller")==="on",
   confirmedTax:formData.get("confirmTax")==="on",
   confirmedCharge:formData.get("confirmCharge")==="on"
  });
 }catch(e){redirect("/admin/testbestellung?qaError="+encodeURIComponent(reason(e)))}
 redirect(paypalUrl);
}
export async function captureOneEuroQaPaymentAction(formData:FormData){
 if(!await isAdmin())redirect("/admin/login");
 if(formData.get("confirmCapture")!=="on")redirect("/admin/testbestellung?qaError=CAPTURE_CONFIRMATION_REQUIRED");
 let orderId:string;
 try{
  const result=await confirmOneEuroQaPayment(String(formData.get("paypalOrderId")||""));
  orderId=result.orderId;
 }catch(e){redirect("/admin/testbestellung?qaError="+encodeURIComponent(reason(e)))}
 redirect("/admin/testbestellung?paid="+encodeURIComponent(orderId));
}
export async function cancelPendingOneEuroQaPaymentAction(formData:FormData){
 if(!await isAdmin())redirect("/admin/login");
 try{await cancelPendingOneEuroQaOrder(String(formData.get("orderId")||""))}
 catch(e){redirect("/admin/testbestellung?qaError="+encodeURIComponent(reason(e)))}
 redirect("/admin/testbestellung?status=qa_cancelled");
}
