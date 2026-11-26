"use client";
import {type DiagnosticMethod,type DiagnosticStage,type BrowserDiagnosticCode} from "@/lib/checkout-diagnostic-policy";
const recent=new Map<string,number>();
export function reportCheckoutDiagnostic(method:DiagnosticMethod,stage:DiagnosticStage,code:BrowserDiagnosticCode){
 const key=method+":"+stage+":"+code,now=Date.now();
 if(now-(recent.get(key)||0)<30000)return;
 recent.set(key,now);
 void fetch("/api/checkout/diagnostic",{method:"POST",credentials:"same-origin",keepalive:true,cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({method,stage,code})}).catch(()=>{});
}
