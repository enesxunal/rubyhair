import type {Metadata} from "next";
import ShopLayout from "@/components/site-shell";
import {CartPage} from "@/components/cart-page";
import {cartRecoveryEnabled} from "@/lib/cart-recovery";
import {shippingDeCents} from "@/lib/customer-checkout";
export const metadata:Metadata={title:"Warenkorb",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default function Page(){return <ShopLayout><CartPage shippingCents={shippingDeCents()} recoveryEnabled={cartRecoveryEnabled()}/></ShopLayout>}
