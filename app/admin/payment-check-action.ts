"use server";
import {redirect} from "next/navigation";
import {isAdmin} from "@/lib/admin-auth";
import {verifyPaymentConnection,type ConnectionProvider} from "@/lib/provider-connection-check";

/** Only authenticated merchants can initiate no-charge provider connectivity probes. */
export async function verifyStoredPaymentProvider(formData:FormData){
 if(!await isAdmin())redirect("/admin/login");
 const provider=formData.get("provider");
 if(provider!=="paypal"&&provider!=="klarna")redirect("/admin/testbestellung?probe=invalid");
 let result:"authenticated"|"credentials_missing"|"rejected"|"unavailable"|"inconclusive"="inconclusive";
 try{result=await verifyPaymentConnection(provider as ConnectionProvider)}
 catch(e){console.error("RUBY_PROVIDER_AUTH_PROBE_FAILED",{provider,category:e instanceof Error?e.name:"unexpected"})}
 redirect("/admin/testbestellung?probe="+provider+"_"+result);
}
