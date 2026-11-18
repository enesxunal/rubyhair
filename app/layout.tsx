import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/500.css";
import "@fontsource/playfair-display/400-italic.css";
import "@fontsource/playfair-display/500-italic.css";
import type { Metadata } from "next";
import { CartProvider } from "@/components/cart-context";
import {publicShopEnabled,siteOrigin} from "@/lib/seo";
import AnalyticsConsent from "@/components/analytics-consent";
import HairTryonFloatingLink from "@/components/hair-tryon-floating-link";
import "../src/styles/styles.css";
import "../src/styles/shop.css";
import "../src/styles/legacy-legal.css";
import "../src/styles/hair-tryon-floating-link.css";
import "../src/styles/tape-in-shades.css";

export const metadata:Metadata={
  title:{default:"Echthaar Extensions kaufen – Tape-in & Keratin | Ruby Hair",template:"%s | Ruby Hair"},
  description:"Entdecke Ruby Hair Echthaar Extensions: Tape-in 45–50 cm und 55–60 cm sowie Keratin Bondings. Farben, Längen und verfügbare Varianten online vergleichen.",
  metadataBase:new URL(siteOrigin()),
  icons:{
    icon:[{url:"/ruby-hair-favicon-48.png?v=20261118",type:"image/png",sizes:"48x48"},{url:"/favicon.ico?v=20261118",type:"image/x-icon",sizes:"any"}],
    shortcut:["/favicon.ico?v=20261118"],
    apple:[{url:"/ruby-hair-apple-touch-icon.png?v=20261118",sizes:"180x180",type:"image/png"}]
  },
  robots:publicShopEnabled()?{index:true,follow:true}:{index:false,follow:false},
  openGraph:{type:"website",locale:"de_DE",siteName:"Ruby Hair",title:"Ruby Hair — Tape-in Extensions",images:[{url:"/assets/hero-brunette.webp",alt:"Ruby Hair Echthaar Extensions"}]},
  twitter:{card:"summary_large_image"}
};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="de"><body><CartProvider>{children}<HairTryonFloatingLink/><AnalyticsConsent/></CartProvider></body></html>;
}
