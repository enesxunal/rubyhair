"use server";
import {redirect} from "next/navigation";
import {isAdmin} from "@/lib/admin-auth";
import {prepareKlarnaQaProduct,beginKlarnaQaPayment,captureKlarnaQaPayment,cancelKlarnaQaPayment,KlarnaQaError} from "@/lib/qa-live-klarna";
function reason(e:unknown){
 if(e instanceof KlarnaQaError&&/^[A-Z_]{4,85}$/.test(e.reason))return e.reason;
 console.error("KLARNA_QA_ACTION_FAILURE",{category:e instanceof Error?e.name:"unknown"});
 return "KLARNA_ACTION_FAILED";
}
export async function prepareKlarnaQaProductAction(){
 if(!await isAdmin())redirect("/admin/login");
 try{await prepareKlarnaQaProduct()}catch(e){redirect("/admin/testbestellung?klarnaError="+encodeURIComponent(reason(e)))}
 redirect("/admin/testbestellung?klarnaStatus=prepared");
}
export async function startKlarnaQaPaymentAction(data:FormData){
 if(!await isAdmin())redirect("/admin/login");
 let url:string;
 try{
  url=await beginKlarnaQaPayment({
   name:String(data.get("buyerName")||""),email:String(data.get("buyerEmail")||""),
   confirmedSeller:data.get("confirmSeller")==="on",
   confirmedTax:data.get("confirmTax")==="on",
   confirmedCharge:data.get("confirmCharge")==="on"
  });
 }catch(e){redirect("/admin/testbestellung?klarnaError="+encodeURIComponent(reason(e)))}
 redirect(url);
}
export async function captureKlarnaQaPaymentAction(data:FormData){
 if(!await isAdmin())redirect("/admin/login");
 if(data.get("confirmKlarnaCapture")!=="on")redirect("/admin/testbestellung?klarnaError=KLARNA_CAPTURE_CONFIRMATION_REQUIRED");
 let id:string;
 try{id=(await captureKlarnaQaPayment(String(data.get("reservationKey")||""))).orderId}
 catch(e){redirect("/admin/testbestellung?klarnaError="+encodeURIComponent(reason(e)))}
 redirect("/admin/testbestellung?klarnaPaid="+encodeURIComponent(id));
}
export async function cancelKlarnaQaPaymentAction(data:FormData){
 if(!await isAdmin())redirect("/admin/login");
 try{await cancelKlarnaQaPayment(String(data.get("orderId")||""))}
 catch(e){redirect("/admin/testbestellung?klarnaError="+encodeURIComponent(reason(e)))}
 redirect("/admin/testbestellung?klarnaStatus=cancelled");
}
