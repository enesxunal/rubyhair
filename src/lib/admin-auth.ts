import "server-only";
import { createHmac } from "node:crypto";
import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import {normalizedAdminPasswordHash} from "@/lib/admin-password-config";
import { getPrisma, databaseConfigured } from "@/lib/prisma";

const COOKIE_NAME="rubyhair_admin";
const COOKIE_AGE=8*60*60;
const AUDIENCE="rubyhair-admin";
const ISSUER="rubyhair-next";

export function adminConfigured(){
  return databaseConfigured() && Boolean(
    process.env.ADMIN_EMAIL &&
    normalizedAdminPasswordHash(process.env.ADMIN_PASSWORD_HASH) &&
    process.env.SESSION_SECRET &&
    process.env.SESSION_SECRET.length>=32
  );
}
function secret(){
  if(!adminConfigured())throw new Error("Admin session config incomplete");
  return new TextEncoder().encode(process.env.SESSION_SECRET!);
}
export async function isAdmin(){
  if(!adminConfigured())return false;
  const token=(await cookies()).get(COOKIE_NAME)?.value;
  if(!token)return false;
  try {
    const {payload}=await jwtVerify(token,secret(),{
      issuer:ISSUER,audience:AUDIENCE,algorithms:["HS256"]
    });
    return payload.sub === process.env.ADMIN_EMAIL!.trim().toLowerCase();
  }catch{return false}
}
export async function issueAdminSession(){
  const token=await new SignJWT({role:"admin"})
    .setProtectedHeader({alg:"HS256"})
    .setSubject(process.env.ADMIN_EMAIL!.trim().toLowerCase())
    .setIssuer(ISSUER).setAudience(AUDIENCE)
    .setIssuedAt().setExpirationTime("8h")
    .sign(secret());
  (await cookies()).set(COOKIE_NAME,token,{
    httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",
    path:"/",maxAge:COOKIE_AGE
  });
}
export async function clearAdminSession(){
  (await cookies()).delete(COOKIE_NAME);
}
function attemptKey(ip:string){
  return createHmac("sha256",process.env.SESSION_SECRET||"")
    .update("admin-login|"+ip).digest("hex");
}
export async function consumeLoginAttempt(){
  const headersList=await headers();
  const ip=headersList.get("x-real-ip") ||
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key=attemptKey(ip);
  const cutoff=new Date(Date.now()-15*60_000);
  const rows=await getPrisma().$queryRaw<{count:number}[]>`
   INSERT INTO "admin_login_attempts" ("key","count","windowStart")
   VALUES (${key},1,NOW())
   ON CONFLICT ("key") DO UPDATE SET
   "count"=CASE WHEN "admin_login_attempts"."windowStart"<${cutoff} THEN 1 ELSE "admin_login_attempts"."count"+1 END,
   "windowStart"=CASE WHEN "admin_login_attempts"."windowStart"<${cutoff} THEN NOW() ELSE "admin_login_attempts"."windowStart" END
   RETURNING "count"`;
  return {key,allowed:(rows[0]?.count||Number.MAX_SAFE_INTEGER)<=5};
}
export async function clearLoginAttempts(key:string){
  await getPrisma().adminLoginAttempt.deleteMany({where:{key}});
}
export async function checkAdminCredentials(email:string,password:string){
  const configuredEmail=process.env.ADMIN_EMAIL?.trim().toLowerCase();
  // Always run bcrypt compare to avoid user-enumeration timing differences.
  const valid=await bcrypt.compare(password,normalizedAdminPasswordHash(process.env.ADMIN_PASSWORD_HASH)||"$2b$12$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  return Boolean(valid && email.toLowerCase()===configuredEmail);
}
