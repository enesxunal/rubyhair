import {createHmac} from "node:crypto";
import type {NextRequest} from "next/server";
import {getPrisma} from "@/lib/prisma";

// Intentionally conservative and never driven by the browser. Counts *starts*
// including provider failures, so a bot cannot burn unlimited API credit.
const LIMITS={perIpMinute:2,perIpDay:5,globalMinute:4,globalDay:35,parallel:2} as const;
export class TryonRateLimitError extends Error {
 constructor(readonly retryAfterSeconds:number){super("TRYON_RATE_LIMITED");}
}
function anonymousIp(request:NextRequest){
 const ip=(request.headers.get("x-real-ip")||request.headers.get("x-forwarded-for")?.split(",")[0]||"").trim();
 const key=process.env.SESSION_SECRET;
 if(!key||key.length<32)throw Error("TRYON_QUOTA_SECRET_UNAVAILABLE");
 // Untrusted or absent IP is pooled in one limited anonymous bucket.
 const valid=/^[0-9a-fA-F:.]{3,45}$/.test(ip)?ip:"unknown";
 return createHmac("sha256",key).update("rubyhair:tryon:ip:"+valid).digest("hex");
}

/** Postgres advisory lock makes global spend caps atomic across Vercel lambdas. */
export async function reserveTryonQuota(request:NextRequest){
 const ipDigest=anonymousIp(request);
 const now=new Date(),minute=new Date(now.getTime()-60_000);
 const today=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
 return getPrisma().$transaction(async tx=>{
  await tx.$queryRaw`SELECT 1 AS acquired FROM pg_advisory_xact_lock(683003714)`;
  const [ipMinute,ipDay,globalMinute,globalDay,parallel]=await Promise.all([
   tx.tryonQuotaAttempt.count({where:{ipDigest,createdAt:{gte:minute}}}),
   tx.tryonQuotaAttempt.count({where:{ipDigest,createdAt:{gte:today}}}),
   tx.tryonQuotaAttempt.count({where:{createdAt:{gte:minute}}}),
   tx.tryonQuotaAttempt.count({where:{createdAt:{gte:today}}}),
   tx.tryonQuotaAttempt.count({where:{finishedAt:null,expiresAt:{gt:now}}})
  ]);
  if(ipDay>=LIMITS.perIpDay||globalDay>=LIMITS.globalDay)throw new TryonRateLimitError(3600);
  if(ipMinute>=LIMITS.perIpMinute||globalMinute>=LIMITS.globalMinute)throw new TryonRateLimitError(60);
  if(parallel>=LIMITS.parallel)throw new TryonRateLimitError(30);
  const reservation=await tx.tryonQuotaAttempt.create({data:{ipDigest,createdAt:now,expiresAt:new Date(now.getTime()+150_000)}});
  return reservation.id;
 },{timeout:9000,maxWait:7000});
}
export async function finishTryonQuota(id:string){
 await getPrisma().tryonQuotaAttempt.updateMany({where:{id,finishedAt:null},data:{finishedAt:new Date()}});
}
