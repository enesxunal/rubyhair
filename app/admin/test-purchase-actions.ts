"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {isAdmin} from "@/lib/admin-auth";
import {prepareHiddenQaProduct} from "@/lib/internal-test-product";

/** Staff-only preparatory action: database catalog setup, no payment or order. */
export async function prepareHiddenQaProductAction(){
 if(!await isAdmin())redirect("/admin/login");
 try{
  await prepareHiddenQaProduct();
 }catch(e){
  console.error("RUBY_QA_PRODUCT_PREPARATION_FAILED",e instanceof Error?e.name:"unknown");
  redirect("/admin/testbestellung?status=failed");
 }
 revalidatePath("/admin/testbestellung");
 redirect("/admin/testbestellung?status=created");
}
