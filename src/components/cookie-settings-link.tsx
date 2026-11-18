"use client";
export default function CookieSettingsLink(){
  return <button className="rh-footer-cookie-settings" type="button"
    onClick={()=>window.dispatchEvent(new Event("ruby-open-analytics-settings"))}>
    Cookie-Einstellungen
  </button>;
}
