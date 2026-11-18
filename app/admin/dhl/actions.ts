"use server";
import {redirect} from "next/navigation";
import {isAdmin} from "@/lib/admin-auth";
import {checkDhlAuthFromAdmin} from "@/lib/dhl-api";

/** No label, payment, tracking number or DB mutation; just DHL OAuth. */
export async function verifyDhlCredentialsAction(){
 if(!await isAdmin())redirect("/admin/login");
 let outcome:"authenticated"|"credentials_missing"|"unauthorized"|"unavailable"="unavailable";
 try{outcome=await checkDhlAuthFromAdmin("live")}
 catch(e){console.error("RUBY_DHL_AUTH_TEST_FAILED",e instanceof Error?e.name:"UNKNOWN")}
 redirect("/admin/dhl?status="+outcome);
}
