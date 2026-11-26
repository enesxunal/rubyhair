import {createHmac,timingSafeEqual} from "node:crypto";
import {z} from "zod";
export const CART_RECOVERY_CONSENT="2026-11-26-v1";
export const reminderHours=[1,24,48] as const;
export const recoveryLines=z.array(z.object({id:z.number().int().positive(),quantity:z.number().int().min(1).max(99)}).strict()).min(1).max(30).refine(x=>new Set(x.map(l=>l.id)).size===x.length);
export const recoveryRequest=z.object({email:z.string().trim().email().max(254),consent:z.literal(true),lines:recoveryLines}).strict();
export const recoveryAction=z.object({token:z.string().regex(/^[0-9a-f-]{36}\.[0-9a-f]{64}$/i),action:z.enum(["confirm","unsubscribe","restore"])}).strict();
export function recoveryToken(secret:string,id:string){return id+"."+createHmac("sha256",secret).update("ruby-cart-recovery:"+id).digest("hex")}
export function recoveryId(secret:string,token:string){
 if(secret.length<32||!/^[0-9a-f-]{36}\.[0-9a-f]{64}$/i.test(token))return null;
 const id=token.split(".")[0];if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return null;
 const expected=Buffer.from(recoveryToken(secret,id)),actual=Buffer.from(token);
 return expected.length===actual.length&&timingSafeEqual(expected,actual)?id:null;
}
export function emailRecoveryHash(secret:string,email:string){return createHmac("sha256",secret).update("ruby-cart-email:"+email.trim().toLowerCase()).digest("hex")}
export function nextReminder(confirmedAt:Date,sentCount:number){return sentCount>=reminderHours.length?null:new Date(confirmedAt.getTime()+reminderHours[sentCount]*3600000)}
export function maySendReminder(row:{status:string;confirmedAt:Date|null;expiresAt:Date;sentCount:number;nextReminderAt:Date|null;consentVersion:string},now:Date,hasCheckout:boolean){
 return !hasCheckout&&row.status==="confirmed"&&row.confirmedAt!==null&&row.expiresAt>now&&row.sentCount>=0&&row.sentCount<reminderHours.length&&row.nextReminderAt!==null&&row.nextReminderAt<=now&&row.consentVersion===CART_RECOVERY_CONSENT;
}
