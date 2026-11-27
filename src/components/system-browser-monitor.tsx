"use client";
import {useEffect} from "react";
import {systemArea,type SystemCode} from "@/lib/system-diagnostic-policy";
const recent=new Map<string,number>();
export function reportBrowserSystemError(code:SystemCode){const area=systemArea(location.pathname);const key=area+":"+code,now=Date.now();if(now-(recent.get(key)||0)<60000)return;recent.set(key,now);void fetch("/api/system/diagnostic",{method:"POST",credentials:"same-origin",keepalive:true,headers:{"Content-Type":"application/json"},body:JSON.stringify({area,code})}).catch(()=>{})}
export default function SystemBrowserMonitor(){useEffect(()=>{const error=(e:Event)=>{if(e instanceof ErrorEvent){reportBrowserSystemError("BROWSER_RUNTIME_FAILED");return;}const t=e.target;if(t instanceof HTMLScriptElement||t instanceof HTMLLinkElement)reportBrowserSystemError("BROWSER_RESOURCE_FAILED")};const rejection=()=>reportBrowserSystemError("BROWSER_PROMISE_FAILED");window.addEventListener("error",error,true);window.addEventListener("unhandledrejection",rejection);return()=>{window.removeEventListener("error",error,true);window.removeEventListener("unhandledrejection",rejection)}},[]);return null}
