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

// Both counters in a single database round-trip. An IP over its own limit
// cannot consume the shared budget. Distinct keys avoid double updating a row.
export async function publicRequestAllowed(headers:Headers,scope:string,limits:{ip:number;global:number;windowMs:number}){
 const ipKey=rateKey(scope,"ip:"+clientIp(headers)),globalKey=rateKey(scope,"global");
 const cutoff=new Date(Date.now()-limits.windowMs);
 const rows=await getPrisma().$queryRaw<{ip_count:number;global_count:number|null}[]>`
  WITH per_ip AS (
   INSERT INTO "customer_auth_rate_limits" ("key","count","windowStart")
   VALUES (${ipKey},1,NOW())
   ON CONFLICT ("key") DO UPDATE SET
   "count"=CASE WHEN "customer_auth_rate_limits"."windowStart"<${cutoff} THEN 1 ELSE "customer_auth_rate_limits"."count"+1 END,
   "windowStart"=CASE WHEN "customer_auth_rate_limits"."windowStart"<${cutoff} THEN NOW() ELSE "customer_auth_rate_limits"."windowStart" END
   RETURNING "count"
  ), global_limit AS (
   INSERT INTO "customer_auth_rate_limits" ("key","count","windowStart")
   SELECT ${globalKey},1,NOW() FROM per_ip WHERE "count"<=${limits.ip}
   ON CONFLICT ("key") DO UPDATE SET
   "count"=CASE WHEN "customer_auth_rate_limits"."windowStart"<${cutoff} THEN 1 ELSE "customer_auth_rate_limits"."count"+1 END,
   "windowStart"=CASE WHEN "customer_auth_rate_limits"."windowStart"<${cutoff} THEN NOW() ELSE "customer_auth_rate_limits"."windowStart" END
   RETURNING "count"
  ) SELECT (SELECT "count" FROM per_ip) AS ip_count,(SELECT "count" FROM global_limit) AS global_count`;
 return Boolean(rows[0]&&rows[0].ip_count<=limits.ip&&rows[0].global_count!==null&&rows[0].global_count<=limits.global);
}
