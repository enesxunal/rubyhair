"use client";
import {analyticsEnabled} from "@/lib/storefront-analytics";

export default function CookieSettingsLink(){
  if(!analyticsEnabled())return null;
  return <button className="rh-footer-cookie-settings" type="button"
    onClick={()=>window.dispatchEvent(new Event("ruby-open-analytics-settings"))}>
    Cookie-Einstellungen
  </button>;
}
