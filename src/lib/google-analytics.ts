"use client";

// Dedicated GA4 property for Ruby Hair. Not a secret or another client's measurement ID.
export const RUBY_GA4_ID="G-RVNYKB4WP6";
type GA4Event="page_view"|"view_item"|"add_to_cart"|"begin_checkout";
type Gtag=(...args:unknown[])=>void;
declare global {interface Window {dataLayer?:unknown[][];gtag?:Gtag}}
export function googleStatisticsConsent(){
 try{return typeof window!=="undefined"&&localStorage.getItem("ruby_ga4_choice")==="allow"}
 catch{return false}
}
export function installRubyGA4(){
 if(!googleStatisticsConsent()||typeof window==="undefined")return false;
 if(!window.gtag){
  window.dataLayer=window.dataLayer||[];
  window.gtag=(...args:unknown[])=>{window.dataLayer?.push(args)};
  const script=document.createElement("script");
  script.async=true;script.src=`https://www.googletagmanager.com/gtag/js?id=${RUBY_GA4_ID}`;
  document.head.appendChild(script);
  window.gtag("js",new Date());
  window.gtag("config",RUBY_GA4_ID,{
   send_page_view:false,anonymize_ip:true,
   allow_google_signals:false,allow_ad_personalization_signals:false
  });
 }
 return true;
}
export function trackRubyGA4Event(name:GA4Event){
 if(!googleStatisticsConsent()||!installRubyGA4())return;
 window.gtag?.("event",name);
}
