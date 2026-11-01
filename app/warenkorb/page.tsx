import type {Metadata} from "next";
import ShopLayout from "@/components/site-shell";
import {CartPage} from "@/components/cart-page";
export const metadata:Metadata={title:"Warenkorb"};
export default function Page(){return <ShopLayout><CartPage/></ShopLayout>;}
