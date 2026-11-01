import type { Metadata } from "next";
import HomeFrontend from "@/components/home-frontend";
import { getStoreCatalog } from "@/lib/catalog-server";
export const dynamic="force-dynamic";
export const metadata: Metadata = {
  title: "Ruby Hair — Premium Echthaar Extensions",
  description: "Entdecke hochwertige Echthaar Extensions. Keratin Bondings und Tape-in Extensions in vielen Haarfarben – Ruby Hair in Essen."
};
export default async function HomePage(){
  const {products}=await getStoreCatalog();
  return <HomeFrontend products={products}/>;
}
