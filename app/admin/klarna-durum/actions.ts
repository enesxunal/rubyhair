"use server";
import {redirect} from "next/navigation";
import {after} from "next/server";
import {isAdmin} from "@/lib/admin-auth";
import {reconcileVerifiedKlarnaCapture} from "@/lib/klarna-live-reconciliation";
import {deliverQueuedOrderEmails} from "@/lib/customer-automation";

export async function reconcileAlreadyCapturedKlarnaAction(form:FormData){
 if(!await isAdmin())redirect("/admin/login");
 const id=String(form.get("orderId")||"");
 if(!/^[0-9a-f-]{36}$/i.test(id)||form.get("confirmNoNewCharge")!=="on")redirect("/admin/klarna-durum?status=invalid");
 try{
  await reconcileVerifiedKlarnaCapture(id);
  after(async()=>{try{await deliverQueuedOrderEmails(5)}catch(e){console.error("RUBY_KLARNA_RECONCILED_MAIL_PENDING",e instanceof Error?e.name:"UNKNOWN")}});
 }catch(e){
  console.error("RUBY_KLARNA_READ_ONLY_RECONCILIATION_FAILED",e instanceof Error?e.name:"UNKNOWN");
  redirect("/admin/klarna-durum?status=review");
 }
 redirect("/admin/klarna-durum?status=reconciled");
}
