import "server-only";
import {randomUUID} from "node:crypto";
import {z} from "zod";
import type {NextRequest} from "next/server";
import {getPrisma} from "./prisma";
import {journeyConsentVersion,journeyRetentionMs,type JourneyEvent} from "./journey-policy";
import {safeDiagnosticCode,type DiagnosticMethod} from "./checkout-diagnostic-policy";
export function journeyOrigin(req:NextRequest){
 return ["https://rubyhair.de","https://www.rubyhair.de"].includes(req.headers.get("origin")||"")&&req.headers.get("sec-fetch-site")!=="cross-site";
}
export function journeyAllowed(req:NextRequest){return process.env.RUBY_ANALYTICS_ENABLED==="APPROVED"&&journeyOrigin(req)&&req.cookies.get("ruby_analytics")?.value==="allow"&&req.cookies.get("ruby_journey")?.value===journeyConsentVersion}
export async function writeJourney(d:JourneyEvent){
 await getPrisma().$executeRaw`INSERT INTO checkout_journey_events (id,session,event,method,stage,code,source,device) VALUES (${d.id}::uuid,${d.session}::uuid,${d.event},${d.method??null},${d.stage??null},${d.code??null},${d.source??null},${d.device??null}) ON CONFLICT (id) DO NOTHING`;
}
export async function recordJourneyCheckout(req:NextRequest,method:DiagnosticMethod,orderId?:string,code?:string){
 try{
 if(!journeyAllowed(req))return;
 const s=z.string().uuid().safeParse(req.headers.get("x-ruby-journey"));if(!s.success)return;
 const order=z.string().uuid().safeParse(orderId);const event=order.success?"order_created":"server_error";
 await getPrisma().$executeRaw`INSERT INTO checkout_journey_events (id,session,event,method,stage,code,"orderId") VALUES (${randomUUID()}::uuid,${s.data}::uuid,${event},${method},'create',${code?safeDiagnosticCode(code):null},${order.success?order.data:null}::uuid)`;
 }catch{console.warn("RUBY_JOURNEY_CHECKOUT_WRITE_FAILED")}
}
export async function cleanupJourneys(){await getPrisma().$executeRaw`DELETE FROM checkout_journey_events WHERE "createdAt" < ${new Date(Date.now()-journeyRetentionMs)}`}
export async function revokeJourneySession(session:string){await getPrisma().$executeRaw`DELETE FROM checkout_journey_events WHERE session=${session}::uuid`}
