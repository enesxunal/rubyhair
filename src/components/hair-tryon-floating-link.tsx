"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {ArrowUpRight, Sparkles} from "lucide-react";

/** Discoverable storefront entry point; never shown over admin, QA or the try-on itself. */
export default function HairTryonFloatingLink(){
 const pathname=usePathname();
 if(!pathname||pathname.startsWith("/admin")||pathname.startsWith("/qa/")||
    pathname.startsWith("/api/")||pathname.startsWith("/coming-soon")||
    pathname.startsWith("/haar-anprobe")||pathname.startsWith("/warenkorb")||
    pathname.startsWith("/kasse")||pathname.startsWith("/rechtliches/")||
    pathname.startsWith("/widerruf")||pathname.startsWith("/produkt/"))return null;

 return <Link
  href="/haar-anprobe/"
  className="rh-tryon-floating-link"
  data-testid="ruby-tryon-floating-cta"
  aria-label="Haare jetzt mit KI testen – zur Haarvorschau"
 >
  <span className="rh-tryon-floating-icon" aria-hidden="true"><Sparkles size={23} strokeWidth={1.65}/></span>
  <span className="rh-tryon-floating-text">
   <span className="rh-tryon-floating-eyebrow">KI-HAARVORSCHAU</span>
   <strong>JETZT HAARE TESTEN</strong>
  </span>
  <ArrowUpRight className="rh-tryon-floating-arrow" size={18} strokeWidth={1.8} aria-hidden="true"/>
 </Link>;
}
