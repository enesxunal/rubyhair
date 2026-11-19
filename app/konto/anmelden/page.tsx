import type {Metadata} from "next";
import ShopLayout from "@/components/site-shell";
import CustomerLoginPanel from "@/components/customer-login-panel";
export const metadata:Metadata={title:"Anmelden oder Konto erstellen",robots:{index:false,follow:false},referrer:"no-referrer"};
export const dynamic="force-dynamic";
export default function Login(){return <ShopLayout><div className="rh-shell rh-account-login-page"><CustomerLoginPanel/></div></ShopLayout>}
