import type {Metadata} from "next";
import ShopLayout from "@/components/site-shell";
import CheckoutPreview from "@/components/checkout-preview";
export const metadata:Metadata={
  title:"Kasse – unverbindliche Vorschau",
  description:"Ruby Hair – unverbindliche Kassenansicht. Bestellungen und Zahlungen sind in der neuen Shop-Vorschau noch nicht aktiviert.",
  robots:{index:false,follow:false}
};
export default function Checkout(){
  return <ShopLayout><CheckoutPreview/></ShopLayout>;
}
