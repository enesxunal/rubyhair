"use client";
import {googleStatisticsConsent,trackRubyGA4Event} from "@/lib/google-analytics";
import {marketingConsent,trackRubyMetaEvent} from "@/lib/meta-pixel";

/**
 * Only called from a server-confirmed PAID return, never from a client-side
 * payment button or an authorization-only Klarna return.
 * No order details, customer data, IDs or euro amounts are sent to providers.
 * This is a browser-session conversion signal; merchant revenue stays in DB.
 */
export function trackVerifiedPurchaseOnce(orderId:string){
 if(typeof window==="undefined"||!/^[0-9a-f-]{36}$/i.test(orderId))return false;
 const ga=googleStatisticsConsent(),meta=marketingConsent();
 if(!ga&&!meta)return false;
 const key="rubyhair-verified-purchase:"+orderId;
 try{if(sessionStorage.getItem(key)==="1")return false;}catch{return false;}
 // Record before dispatch; do not emit duplicate purchase on a quick refresh.
 try{sessionStorage.setItem(key,"1")}catch{return false;}
 if(ga)trackRubyGA4Event("purchase");
 if(meta)trackRubyMetaEvent("Purchase");
 return true;
}
