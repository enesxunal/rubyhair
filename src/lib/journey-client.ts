"use client";
import {journeyStorageKey,journeyConsentKey,journeyConsentVersion,journeyIdleMs,type JourneyEvent} from "./journey-policy";
export function journeySession():string|null{
 try{
  if(process.env.NEXT_PUBLIC_RUBY_ANALYTICS_ENABLED!=="APPROVED"||localStorage.getItem("ruby_analytics_choice")!=="allow"||localStorage.getItem(journeyConsentKey)!==journeyConsentVersion||!document.cookie.split(";").some(p=>p.trim()==="ruby_analytics=allow")||!document.cookie.split(";").some(p=>p.trim()==="ruby_journey="+journeyConsentVersion))return null;
  const now=Date.now();const saved=JSON.parse(sessionStorage.getItem(journeyStorageKey)||"null");
  const id=saved&&typeof saved.id==="string"&&typeof saved.last==="number"&&now-saved.last<journeyIdleMs?saved.id:crypto.randomUUID();
  sessionStorage.setItem(journeyStorageKey,JSON.stringify({id,last:now}));return id;
 }catch{return null}
}
export function journeyHeaders():Record<string,string>{const session=journeySession();return session?{"X-Ruby-Journey":session}:{}}
export function trackJourney(event:JourneyEvent["event"],details:Omit<JourneyEvent,"event"|"session"|"id">={}){
 try{const session=journeySession();if(!session)return;
 const body=JSON.stringify({session,id:crypto.randomUUID(),event,...details});
 void fetch("/api/analytics/journey",{method:"POST",headers:{"Content-Type":"application/json"},body,credentials:"same-origin",keepalive:true,cache:"no-store"}).catch(()=>{});
 }catch{}
}
export function revokeJourney(){
 try{
 const saved=JSON.parse(sessionStorage.getItem(journeyStorageKey)||"null");
 if(typeof saved?.id==="string")void fetch("/api/analytics/journey",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({session:saved.id}),credentials:"same-origin",keepalive:true}).catch(()=>{});
 sessionStorage.removeItem(journeyStorageKey);
 }catch{}
}
