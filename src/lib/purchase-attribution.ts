import "server-only";
import {createHmac,randomBytes} from "node:crypto";
import {Prisma} from "@prisma/client";
import {getPrisma} from "@/lib/prisma";
import {touchSchema,updatedTouch,type Touch} from "@/lib/purchase-attribution-policy";
import type {NextRequest} from "next/server";
export const attributionCookie="ruby_purchase_attribution";
export const attributionDays=90;
export function tokenHash(token:string|undefined){
 const secret=process.env.SESSION_SECRET;
 if(!secret||secret.length<32||!token||!/^([a-f0-9]{64})$/.test(token))return null;
 return createHmac("sha256",secret).update("ruby-attribution:"+token).digest("hex");
}
const json=(v:Touch)=>JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
export async function grantAttribution(touch:Touch){
 const token=randomBytes(32).toString("hex"),id=tokenHash(token);
 if(!id)throw new Error("ATTRIBUTION_CONFIG");
 await getPrisma().attributionConsent.create({data:{id,first:json(touch),last:json(touch),expiresAt:new Date(Date.now()+attributionDays*86400000)}});
 return token;
}
export async function updateAttribution(token:string|undefined,touch:Touch){
 const id=tokenHash(token);if(!id)return false;
 const db=getPrisma(),row=await db.attributionConsent.findFirst({where:{id,expiresAt:{gt:new Date()}}});
 if(!row)return false;
 const last=touchSchema.safeParse(row.last);if(!last.success)return false;
 const next=updatedTouch(last.data,touch);
 return (await db.attributionConsent.updateMany({where:{id,expiresAt:{gt:new Date()}},data:{last:json(next)}})).count===1;
}
export async function revokeAttribution(token:string|undefined){
 const id=tokenHash(token);if(id)await getPrisma().attributionConsent.deleteMany({where:{id}});
}
export async function recordPurchaseAttribution(req:NextRequest,kind:"order"|"gift",purchaseId:string){
 if(req.cookies.get("ruby_purchase_attribution_choice")?.value!=="allow"||! /^[0-9a-f-]{36}$/i.test(purchaseId))return;
 const id=tokenHash(req.cookies.get(attributionCookie)?.value);if(!id)return;
 const db=getPrisma();
 // Only server-created fresh purchase IDs; never accept a purchase ID from the tracking API.
 if(kind==="order"&&!await db.order.findFirst({where:{id:purchaseId,testOnly:false,createdAt:{gte:new Date(Date.now()-600000)}},select:{id:true}}))return;
 if(kind==="gift"&&!await db.giftPurchase.findFirst({where:{id:purchaseId,cartOrderId:null,createdAt:{gte:new Date(Date.now()-600000)}},select:{id:true}}))return;
 const row=await db.attributionConsent.findFirst({where:{id,expiresAt:{gt:new Date()}}});
 if(!row)return;
 const first=touchSchema.safeParse(row.first),last=touchSchema.safeParse(row.last);
 if(!first.success||!last.success)return;
 await db.purchaseAttribution.upsert({where:{kind_purchaseId:{kind,purchaseId}},create:{kind,purchaseId,consentId:id,first:json(first.data),last:json(last.data)},update:{}});
}
