"use client";

// Public Meta Dataset ID for Ruby Hair, never an access token.
export const RUBY_META_PIXEL_ID="1157620659939392";
const marketingKey="ruby_marketing_choice";
type MetaEvent="PageView"|"ViewContent"|"AddToCart"|"InitiateCheckout"|"Purchase";
type FacebookQueue=((...args:unknown[])=>void)&{queue?:unknown[][];callMethod?:(...args:unknown[])=>void;loaded?:boolean;version?:string};
declare global {interface Window {fbq?:FacebookQueue;_fbq?:FacebookQueue}}
export function marketingConsent(){
 return typeof window!=="undefined" && localStorage.getItem(marketingKey)==="allow";
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
export function trackRubyMetaEvent(event:MetaEvent){
 if(!marketingConsent()||!installRubyMetaPixel())return;
 // Only standard event names. Never send photos, search terms, email, item identifiers or order amounts.
 window.fbq?.("track",event);
}
