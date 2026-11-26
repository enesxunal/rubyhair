"use client";

// Public Meta Dataset ID for Ruby Hair, never an access token.
export const RUBY_META_PIXEL_ID="1157620659939392";
const marketingKey="ruby_marketing_choice";
export const META_PURCHASE_CONSENT_VERSION="2026-11-26-v2";
export function metaPurchaseConsent(){
 try{return marketingConsent()&&localStorage.getItem("ruby_meta_purchase_consent")===META_PURCHASE_CONSENT_VERSION}catch{return false}
}
export type MetaPurchaseData={value:number;currency:"EUR";eventId:string};
type MetaEvent="PageView"|"ViewContent"|"AddToCart"|"InitiateCheckout"|"Purchase";
type FacebookQueue=((...args:unknown[])=>void)&{queue?:unknown[][];callMethod?:(...args:unknown[])=>void;loaded?:boolean;version?:string};
declare global {interface Window {fbq?:FacebookQueue;_fbq?:FacebookQueue}}
export function marketingConsent(){
 try{return typeof window!=="undefined" && localStorage.getItem(marketingKey)==="allow"}catch{return false}
}
export function installRubyMetaPixel(){
 if(!marketingConsent()||typeof window==="undefined")return false;
 if(!window.fbq){
  const stub:FacebookQueue=(...args:unknown[])=>{if(stub.callMethod)stub.callMethod(...args);else (stub.queue??=[]).push(args)};
  stub.loaded=true;stub.version="2.0";
  window.fbq=stub;window._fbq=stub;
  const script=document.createElement("script");
  script.async=true;script.src="https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
  window.fbq("init",RUBY_META_PIXEL_ID);
 }
 return true;
}
export function trackRubyMetaEvent(event:MetaEvent,purchase?:MetaPurchaseData){
 if(!marketingConsent()||!installRubyMetaPixel())return;
 // Only verified amounts and a pseudonymous event ID, with refreshed marketing consent.
 if(event==="Purchase"&&purchase&&metaPurchaseConsent()&&Number.isFinite(purchase.value)&&purchase.value>0&&purchase.currency==="EUR"&&/^[a-f0-9]{64}$/.test(purchase.eventId)){
  window.fbq?.("track",event,{value:purchase.value,currency:purchase.currency},{eventID:purchase.eventId});
 }else window.fbq?.("track",event);
}
