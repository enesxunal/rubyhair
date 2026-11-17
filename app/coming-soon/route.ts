import {renderRubyHairComingSoon} from "@/lib/coming-soon-page";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export function GET(){
 return new Response(renderRubyHairComingSoon(),{status:503,headers:{
  "Content-Type":"text/html; charset=utf-8",
  "Cache-Control":"private, no-store, max-age=0",
  "Retry-After":"3600",
  "X-Content-Type-Options":"nosniff",
  "X-Frame-Options":"DENY"
 }});
}
export function HEAD(){return new Response(null,{status:503,headers:{"Retry-After":"3600","Cache-Control":"private, no-store, max-age=0"}})}
