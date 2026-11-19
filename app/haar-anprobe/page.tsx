import "../../src/styles/tryon.css";
import type {Metadata} from "next";
import ShopLayout from "@/components/site-shell";
import HairTryonLab from "@/components/hair-tryon-lab";
import {products as catalogProducts} from "@/lib/catalog";

export const metadata:Metadata={
 title:"Hair Preview Lab – Extensions vorher & nachher",
 description:"Ruby Hair Extensions – KI-gestützte Vorher/Nachher-Vorschau. Wähle echte Tape-in-Farben und vergleiche deine Bilder lokal im Browser.",
 robots:{index:false,follow:false}
};

const products=catalogProducts.filter(p=>p.slug==="tape-in-extensions").map(p=>({
 slug:p.slug,name:p.name,pack:p.pack,material:p.material,
 variants:p.variations.map(v=>({
   color:v.color_label,code:v.color,length:v.length_label,image:v.image,
   key:p.slug+"-"+String(v.id)
 }))
}));

export default function HairTryonPage(){
 return <ShopLayout><HairTryonLab products={products}/></ShopLayout>;
}
