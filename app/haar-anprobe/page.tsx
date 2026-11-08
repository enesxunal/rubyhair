import type {Metadata} from "next";
import ShopLayout from "@/components/site-shell";
import HairTryonLab from "@/components/hair-tryon-lab";
import catalog from "@/data/products.json";

export const metadata:Metadata={
 title:"Hair Preview Lab – Extensions vorher & nachher",
 description:"Ruby Hair Extensions – privates Vorher/Nachher-Testlabor. Wähle echte Tape-in-Farben und vergleiche deine Bilder lokal im Browser.",
 robots:{index:false,follow:false}
};

const products=Object.values(catalog.products).filter(p=>p.slug==="tape-in-extensions").map(p=>({
 slug:p.slug,name:p.name,pack:p.pack,material:p.material,
 variants:p.variations.map(v=>({
   color:v.color_label,length:v.length_label,image:v.image,
   key:p.slug+"-"+String(v.id)
 }))
}));

export default function HairTryonPage(){
 return <ShopLayout><HairTryonLab products={products}/></ShopLayout>;
}
