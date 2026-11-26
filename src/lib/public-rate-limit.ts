import "server-only";
import {createHmac} from "node:crypto";
import {getPrisma} from "@/lib/prisma";

function rateKey(scope:string,identity:string){
 const secret=process.env.SESSION_SECRET;
 if(!secret||secret.length<32)throw new Error("RATE_LIMIT_UNAVAILABLE");
 return createHmac("sha256",secret).update(`public-rate|${scope}|${identity}`).digest("hex");
}

function clientIp(headers:Headers){
 return (headers.get("x-real-ip")||headers.get("x-forwarded-for")?.split(",")[0]||"unknown").trim().slice(0,100);
}

async function increment(scope:string,identity:string,windowMs:number){
 const key=rateKey(scope,identity),cutoff=new Date(Date.now()-windowMs);
 const rows=await getPrisma().$queryRaw<{count:number}[]>`
  INSERT INTO "customer_auth_rate_limits" ("key","count","windowStart")
  VALUES (${key},1,NOW())
  ON CONFLICT ("key") DO UPDATE SET
  "count"=CASE WHEN "customer_auth_rate_limits"."windowStart"<${cutoff} THEN 1 ELSE "customer_auth_rate_limits"."count"+1 END,
  "windowStart"=CASE WHEN "customer_auth_rate_limits"."windowStart"<${cutoff} THEN NOW() ELSE "customer_auth_rate_limits"."windowStart" END
  RETURNING "count"`;
 return rows[0]?.count||Number.MAX_SAFE_INTEGER;
}

export async function publicRequestAllowed(headers:Headers,scope:string,limits:{ip:number;global:number;windowMs:number}){
 const ipCount=await increment(scope,"ip:"+clientIp(headers),limits.windowMs);
 if(ipCount>limits.ip)return false;
 const globalCount=await increment(scope,"global",limits.windowMs);
 return globalCount<=limits.global;
}
