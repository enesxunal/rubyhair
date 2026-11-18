"use server";
import {redirect} from "next/navigation";
import {isAdmin} from "@/lib/admin-auth";
import {beginVariantTest,captureVariantTest,cancelVariantTest,reconcileCapturedVariantTest,VariantTestError} from "@/lib/live-variant-qa";

function errorCode(e:unknown){
 if(e instanceof VariantTestError&&/^[A-Z_]{5,88}$/.test(e.reason))return e.reason;
 console.error("LIVE_VARIANT_TEST_ACTION_FAILED",e instanceof Error?e.name:"unknown");
 return "VARIANT_TEST_ACTION_FAILED";
}
export async function startLiveVariantTestAction(form:FormData){
 if(!await isAdmin())redirect("/admin/login");
 if(form.get("variationId")!=="886")redirect("/kasse?liveTest=1&testError=WRONG_VARIANT");
 let url:string;
 try{
  url=await beginVariantTest({
   name:String(form.get("buyerName")||""),
   email:String(form.get("buyerEmail")||""),
   confirmedSeller:form.get("confirmSeller")==="on",
   confirmedTax:form.get("confirmTax")==="on",
   confirmedCharge:form.get("confirmCharge")==="on"
  });
 }catch(e){redirect("/kasse?liveTest=1&testError="+encodeURIComponent(errorCode(e)))}
 redirect(url);
}
export async function captureLiveVariantTestAction(form:FormData){
 if(!await isAdmin())redirect("/admin/login");
 if(form.get("confirmCapture")!=="on")redirect("/kasse?liveTest=1&testError=CAPTURE_CONFIRMATION_REQUIRED");
 let invoiceNumber:string;
 try{
  const result=await captureVariantTest(String(form.get("paypalOrderId")||""));
  invoiceNumber=result.invoiceNumber;
 }catch(e){redirect("/kasse?liveTest=1&testError="+encodeURIComponent(errorCode(e)))}
 redirect("/kasse?liveTest=1&testPaid="+encodeURIComponent(invoiceNumber));
}
export async function cancelLiveVariantTestAction(form:FormData){
 if(!await isAdmin())redirect("/admin/login");
 try{await cancelVariantTest(String(form.get("orderId")||""))}
 catch(e){redirect("/kasse?liveTest=1&testError="+encodeURIComponent(errorCode(e)))}
 redirect("/kasse?liveTest=1&testStatus=cancelled");
}

/** Administrator explicitly reconciles an already-completed PayPal payment.
 * Never initiates a new charge. */
export async function reconcileLiveVariantTestAction(form:FormData){
 if(!await isAdmin())redirect("/admin/login");
 if(form.get("confirmNoCharge")!=="on")redirect("/admin/paypal-durum");
 let invoiceNumber:string;
 try{const done=await reconcileCapturedVariantTest();invoiceNumber=done.invoiceNumber}
 catch(e){redirect("/kasse?liveTest=1&testError="+encodeURIComponent(errorCode(e)))}
 redirect("/kasse?liveTest=1&testPaid="+encodeURIComponent(invoiceNumber));
}
