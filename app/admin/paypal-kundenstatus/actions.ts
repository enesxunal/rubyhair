"use server";
import {after} from "next/server";
import {redirect} from "next/navigation";
import {isAdmin} from "@/lib/admin-auth";
import {getPrisma} from "@/lib/prisma";
import {finalizePayPalCheckout} from "@/lib/customer-order-finalize";
import {runCustomerJobs} from "@/lib/customer-automation";
/** Admin-only provider-read, exact-capture reconciliation. NEVER initiates a payment. */
export async function reconcileCapturedPayPalCustomerOrder(data:FormData){
 if(!await isAdmin())redirect("/admin/login");
 const number=data.get("orderNumber");
 if(typeof number!=="string"||!/^\d{1,10}$/.test(number))redirect("/admin/bestellungen");
 const target="/admin/paypal-kundenstatus?orderNumber="+encodeURIComponent(number);
 const order=await getPrisma().order.findUnique({where:{orderNumber:BigInt(number)},select:{id:true,status:true,testOnly:true,paymentReference:true}});
 if(!order||order.testOnly||!order.paymentReference||order.paymentReference.startsWith("KLARNA-")||
  !["pending_payment","payment_confirmed","preparing","shipped","delivered"].includes(order.status))
  redirect(target+"&result=review");
 let ok=false;
 try{const settled=await finalizePayPalCheckout(order.id,false,order.paymentReference);ok=settled.paid}catch{}
 if(ok){after(async()=>{try{await runCustomerJobs(2)}catch{}});redirect(target+"&result=paid")}
 redirect(target+"&result=review");
}
