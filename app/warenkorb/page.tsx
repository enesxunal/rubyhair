import type {Metadata} from "next";
import ShopLayout from "@/components/site-shell";
import {CartPage} from "@/components/cart-page";
import {shippingDeCents} from "@/lib/customer-checkout";
export const metadata:Metadata={title:"Warenkorb"};
export default function Page(){return <ShopLayout><CartPage shippingCents={shippingDeCents()}/></ShopLayout>}
