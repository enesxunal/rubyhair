import type { Metadata } from "next";
import { CartProvider } from "@/components/cart-context";
import {publicShopEnabled,siteOrigin} from "@/lib/seo";
import AnalyticsConsent from "@/components/analytics-consent";
import "../src/styles/styles.css";
import "../src/styles/shop.css";
import "../src/styles/tape-atelier.css";
import "../src/styles/instagram-home.css";
import "../src/styles/legacy-legal.css";
import "../src/styles/admin.css";
import "../src/styles/admin-v2.css";
import "../src/styles/tryon.css";

export const metadata:Metadata={
  title:{default:"Ruby Hair Extensions",template:"%s | Ruby Hair"},
  description:"Ruby Hair – Premium Tape-in Echthaar Extensions in zwei Längen.",
  metadataBase:new URL(siteOrigin()),
  robots:publicShopEnabled()?{index:true,follow:true}:{index:false,follow:false},
  openGraph:{type:"website",locale:"de_DE",siteName:"Ruby Hair",title:"Ruby Hair — Tape-in Extensions",images:[{url:"/assets/hero-brunette.webp",alt:"Ruby Hair Echthaar Extensions"}]},
  twitter:{card:"summary_large_image"}
};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="de"><head>
    <link rel="preconnect" href="https://fonts.googleapis.com"/>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;1,400;1,500&display=swap" rel="stylesheet"/>
  </head><body><CartProvider>{children}<AnalyticsConsent/></CartProvider></body></html>;
}
