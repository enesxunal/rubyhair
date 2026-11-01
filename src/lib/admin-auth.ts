import "server-only";
import { createHmac } from "node:crypto";
import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { getPrisma, databaseConfigured } from "@/lib/prisma";

const COOKIE_NAME="rubyhair_admin";
const COOKIE_AGE=8*60*60;
const AUDIENCE="rubyhair-admin";
const ISSUER="rubyhair-next";

export function adminConfigured(){
  return databaseConfigured() && Boolean(
    process.env.ADMIN_EMAIL &&
    process.env.ADMIN_PASSWORD_HASH?.startsWith("$2") &&
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
export async function loginAllowed(){
  const headersList=await headers();
  const ip=headersList.get("x-real-ip") ||
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key=attemptKey(ip);
  const prisma=getPrisma();
  const record=await prisma.adminLoginAttempt.findUnique({where:{key}});
  const fresh=!record || Date.now()-record.windowStart.getTime()>15*60_000;
  return {key,allowed:fresh || record.count <5,reset:fresh};
}
export async function recordLoginAttempt(key:string,reset:boolean){
  const prisma=getPrisma();
  // Reset aged windows; new attempts in an active window increment atomically.
  if(reset){
    await prisma.adminLoginAttempt.upsert({
      where:{key},
      update:{count:1,windowStart:new Date()},
      create:{key,count:1}
    });
  }else{
    await prisma.adminLoginAttempt.update({where:{key},data:{count:{increment:1}}});
  }
}
export async function checkAdminCredentials(email:string,password:string){
  const configuredEmail=process.env.ADMIN_EMAIL?.trim().toLowerCase();
  // Always run bcrypt compare to avoid user-enumeration timing differences.
  const valid=await bcrypt.compare(password,process.env.ADMIN_PASSWORD_HASH||"$2b$12$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  return Boolean(valid && email.toLowerCase()===configuredEmail);
}
