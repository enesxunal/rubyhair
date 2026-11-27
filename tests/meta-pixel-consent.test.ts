import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(name:string)=>readFileSync(name,"utf8");
test("Meta pixel is not initialized before explicit independent marketing consent",()=>{
 const pixel=read("src/lib/meta-pixel.ts");
 const gate=read("src/components/analytics-consent.tsx");
 assert.ok(pixel.includes('1157620659939392'));
 assert.ok(pixel.includes('if(!marketingConsent()||typeof window==="undefined")return false'));
 assert.ok(pixel.includes('https://connect.facebook.net/en_US/fbevents.js'));
 assert.ok(pixel.includes('localStorage.getItem(marketingKey)==="allow"'));
 assert.ok(gate.includes('ruby_marketing_choice'));
 assert.ok(gate.includes('Meta Pixel'));
 assert.ok(gate.includes('Alle ablehnen'));
 assert.ok(gate.includes('Auswahl speichern'));
 assert.ok(gate.includes('Alle akzeptieren'));
 assert.ok(!gate.includes('window.fbq("track","Purchase"'));
 assert.ok(!pixel.includes('Conversions API'));
});
test("Meta e-commerce events are restricted to marketing-consenting sessions",()=>{
 const cart=read("src/components/cart-context.tsx");
 const gate=read("src/components/analytics-consent.tsx");
 assert.ok(cart.includes('trackRubyMetaEvent("AddToCart")'));
 assert.ok(gate.includes('trackRubyMetaEvent("PageView")'));
 assert.ok(read("src/components/product-detail.tsx").includes('trackRubyMetaFunnel("ViewContent"'));
 assert.ok(read("src/components/checkout-preview.tsx").includes('trackRubyMetaFunnel("InitiateCheckout"'));
 assert.ok(cart.includes('trackRubyMetaFunnel("AddToCart"'));
 const privacy=read("app/rechtliches/[slug]/page.tsx");
 assert.ok(privacy.includes('Meta Pixel (freiwillige Marketing-Einwilligung)'));
});

test("Ruby Hair GA4 has its own separate fresh consent, never inferred from legacy statistics",()=>{
 const ga=read("src/lib/google-analytics.ts");
 const gate=read("src/components/analytics-consent.tsx");
 assert.ok(ga.includes('G-RVNYKB4WP6'));
 assert.ok(ga.includes('localStorage.getItem("ruby_ga4_choice")==="allow"'));
 assert.ok(ga.includes('send_page_view:false'));
 assert.ok(ga.includes('allow_google_signals:false'));
 assert.ok(gate.includes('ga===null'));
 assert.ok(gate.includes('Google Analytics 4 (Statistik)'));
 assert.ok(gate.includes('trackRubyGA4Event("page_view")'));
 assert.ok(gate.includes('trackRubyGA4Event("begin_checkout")'));
 const privacy=read("app/rechtliches/[slug]/page.tsx");
 assert.ok(privacy.includes('Google Analytics 4 (freiwillige Einwilligung)'));
});

test("Cookie preferences can be reopened from legal pages even without tracking",()=>{
 const panel=read("src/components/analytics-consent.tsx");
 const footer=read("src/components/cookie-settings-link.tsx");
 assert.ok(panel.includes('if(path.startsWith("/admin")'));
 assert.ok(!panel.includes('if(!trackable)return null'));
 assert.ok(footer.includes('ruby-open-analytics-settings'));
 assert.ok(!footer.includes('if(!analyticsEnabled())return null'));
});
