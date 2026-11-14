import type { Metadata } from "next";
import HomeFrontend from "@/components/home-frontend";
import { getStoreCatalog } from "@/lib/catalog-server";
import {getRubyInstagramPosts} from "@/lib/instagram-feed";
export const dynamic="force-dynamic";
export const metadata: Metadata = {
  title: "Ruby Hair — Premium Echthaar Extensions",
  description: "Entdecke Tape-in Echthaar Extensions in 45–50 cm und 55–60 cm. Wähle deinen Farbton – Ruby Hair in Essen.",
  alternates:{canonical:"/"}
};
export default async function HomePage(){
  const [{products},instagramPosts]=await Promise.all([getStoreCatalog(),getRubyInstagramPosts()]);
  return <HomeFrontend products={products} instagramPosts={instagramPosts}/>;
}
