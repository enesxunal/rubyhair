"use server";
import {redirect} from "next/navigation";
import {revalidatePath,revalidateTag} from "next/cache";
import {isAdmin} from "@/lib/admin-auth";
import {cancelVerifiedKlarnaOrder} from "@/lib/admin-order-cancellation";
export async function cancelOrderAction(data:FormData){
 if(!await isAdmin())redirect("/admin/login");
 const number=String(data.get("number")||"");
 if(!/^[1-9][0-9]{0,12}$/.test(number)||data.get("confirm")!=="on")redirect("/admin/stornierung?result=invalid");
 let result="review";
 try{await cancelVerifiedKlarnaOrder(BigInt(number));result="success";revalidateTag("rubyhair-live-catalog","max")}catch{console.warn("RUBY_ADMIN_CANCEL_REVIEW")}
 revalidatePath("/admin/bestellungen");revalidatePath("/admin/analytics");revalidatePath("/admin");
 redirect("/admin/stornierung?order="+number+"&result="+result);
}
