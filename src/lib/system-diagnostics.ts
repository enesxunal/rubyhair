import "server-only";
import {getPrisma} from "@/lib/prisma";
import type {SystemArea,SystemCode} from "@/lib/system-diagnostic-policy";
const last=new Map<string,number>();
// Always emit a structured platform log BEFORE any database operation. Only fixed codes and areas, never error text, URLs, headers or customer data.
export async function recordSystemDiagnostic(area:SystemArea,code:SystemCode,origin:"server"|"browser"){const key=area+":"+code+":"+origin,now=Date.now();console.warn("RUBY_SYSTEM_EVENT",{area,code,origin});if(now-(last.get(key)||0)<60000)return;last.set(key,now);if(last.size>256)last.clear();
 // A DB outage must not trigger more DB requests or add latency to an already failing request.
 if(code.startsWith("DATABASE_"))return;
 try{await getPrisma().checkoutDiagnostic.create({data:{method:"unknown",stage:"system:"+area,code,origin}})}catch{console.warn("RUBY_SYSTEM_EVENT_PERSIST_FAILED",{area,code,origin})}}
