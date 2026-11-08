import type { Metadata } from "next";
import HomeFrontend from "@/components/home-frontend";
import { getStoreCatalog } from "@/lib/catalog-server";
export const dynamic="force-dynamic";
export const metadata: Metadata = {
  title: "Ruby Hair — Premium Echthaar Extensions",
  description: "Entdecke Tape-in Echthaar Extensions in 45–50 cm und 55–60 cm. Wähle deinen Farbton – Ruby Hair in Essen."
};
export default async function HomePage(){
  const {products}=await getStoreCatalog();
  return <HomeFrontend products={products}/>;
}
