import "server-only";
import {cookies,headers} from "next/headers";
import {getPrisma} from "@/lib/prisma";
import {CUSTOMER_COOKIE,CUSTOMER_SESSION_AGE_SEC,hashCustomerToken,normalizeCustomerEmail,customerToken,customerRateKey,validCustomerEmail,validCustomerToken,LOGIN_TOKEN_AGE_MS,retryCustomerDb} from "@/lib/customer-account-rules";
import {sendCustomerLoginEmail} from "@/lib/customer-account-mail";
import {hashCustomerPassword,verifyCustomerPassword} from "@/lib/customer-password";
import {parseCustomerNames,validNewPassword} from "@/lib/customer-profile-validation";

const BASE_URL="https://rubyhair.de";
const cookieSettings={httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/",maxAge:CUSTOMER_SESSION_AGE_SEC};

export async function sameOriginCustomerRequest(){
 const h=await headers();
 const origin=h.get("origin");
 const expected=process.env.NODE_ENV==="production"?BASE_URL:`http://${h.get("host")||"localhost:8765"}`;
 // Fetch with JSON from the shop must be same-origin. No cross-site account action.
 return origin===expected && (h.get("sec-fetch-site")||"same-origin")!=="cross-site";
}

async function incrementRate(key:string){
 const db=getPrisma();
 const rows=await retryCustomerDb(()=>db.$queryRaw<{count:number}[]>`
 INSERT INTO "customer_auth_rate_limits" ("key","count","windowStart")
 VALUES (${key}, 1, NOW())
 ON CONFLICT ("key") DO UPDATE SET
 "count"=CASE WHEN "customer_auth_rate_limits"."windowStart"<NOW()-INTERVAL '1 hour' THEN 1 ELSE "customer_auth_rate_limits"."count"+1 END,
 "windowStart"=CASE WHEN "customer_auth_rate_limits"."windowStart"<NOW()-INTERVAL '1 hour' THEN NOW() ELSE "customer_auth_rate_limits"."windowStart" END
 RETURNING "count"`);
 return rows[0]?.count||10000;
}

export async function requestCustomerLogin(rawEmail:string){
 const email=normalizeCustomerEmail(rawEmail);
 if(!validCustomerEmail(email))return;
 const h=await headers();
 const ip=(h.get("x-real-ip")||h.get("x-forwarded-for")?.split(",")[0]||"unknown").trim().slice(0,100);
 const secret=process.env.SESSION_SECRET;
 if(!secret||secret.length<32)throw new Error("CUSTOMER_SESSION_UNAVAILABLE");
 // Keep reads sequential for the serverless single-connection pool.
 const emailCount=await incrementRate(customerRateKey("email",email,secret));
 if(emailCount>3)return;
 const ipCount=await incrementRate(customerRateKey("ip",ip,secret));
 // Uniform response: users cannot enumerate which emails have an account.
 if(emailCount>3||ipCount>20)return;
 const db=getPrisma();
 const token=customerToken();
 const tokenHash=hashCustomerToken(token);
 const challenge=await retryCustomerDb(()=>db.customerLoginToken.create({data:{email,tokenHash,expiresAt:new Date(Date.now()+LOGIN_TOKEN_AGE_MS)}}));
 try{await sendCustomerLoginEmail(email,BASE_URL+"/konto/anmelden/#token="+token)}
 catch{
  await db.customerLoginToken.updateMany({where:{id:challenge.id,usedAt:null},data:{usedAt:new Date()}}).catch(()=>{});
  throw new Error("CUSTOMER_MAIL_UNAVAILABLE");
 }
}

async function createCustomerSession(accountId:string,now=new Date()){
 const db=getPrisma();
 const session=customerToken();
 await retryCustomerDb(()=>db.customerSession.create({data:{accountId,tokenHash:hashCustomerToken(session),expiresAt:new Date(now.getTime()+CUSTOMER_SESSION_AGE_SEC*1000)}}));
 (await cookies()).set(CUSTOMER_COOKIE,session,cookieSettings);
}

export async function customerPasswordLogin(rawEmail:string,password:unknown){
 const email=normalizeCustomerEmail(rawEmail);
 if(!validCustomerEmail(email)||typeof password!=="string"||password.length<1||password.length>128)return false;
 const h=await headers(),ip=(h.get("x-real-ip")||h.get("x-forwarded-for")?.split(",")[0]||"unknown").trim().slice(0,100);
 const secret=process.env.SESSION_SECRET;
 if(!secret||secret.length<32)throw new Error("CUSTOMER_SESSION_UNAVAILABLE");
 if(await incrementRate(customerRateKey("password-email",email,secret))>12)return false;
 if(await incrementRate(customerRateKey("password-ip",ip,secret))>45)return false;
 const db=getPrisma();
 const account=await retryCustomerDb(()=>db.customerAccount.findUnique({where:{email},select:{id:true,passwordHash:true}}));
 if(!account?.passwordHash||!await verifyCustomerPassword(password,account.passwordHash))return false;
 const now=new Date();
 await db.customerAccount.update({where:{id:account.id},data:{lastLoginAt:now}});
 await createCustomerSession(account.id,now);
 return true;
}

export async function finishCustomerLogin(rawToken:string,profile:unknown){
 if(!validCustomerToken(rawToken))return false;
 const names=parseCustomerNames(profile);
 const pw=profile&&typeof profile==="object"?(profile as Record<string,unknown>).password:null;
 if(!names||!validNewPassword(pw))return false;
 const passwordHash=await hashCustomerPassword(pw);
 const db=getPrisma(),now=new Date(),tokenHash=hashCustomerToken(rawToken),session=customerToken();
 const expiresAt=new Date(now.getTime()+CUSTOMER_SESSION_AGE_SEC*1000);
 const result=await db.$transaction(async tx=>{
  const challenge=await tx.customerLoginToken.findUnique({where:{tokenHash}});
  if(!challenge||challenge.usedAt||challenge.expiresAt<=now)return null;
  const consumed=await tx.customerLoginToken.updateMany({where:{id:challenge.id,usedAt:null,expiresAt:{gt:now}},data:{usedAt:now}});
  if(consumed.count!==1)return null;
  const account=await tx.customerAccount.upsert({where:{email:challenge.email},update:{lastLoginAt:now,...names,passwordHash},create:{email:challenge.email,verifiedAt:now,lastLoginAt:now,...names,passwordHash}});
  // The same verified link may be used for account recovery; invalidate previous sessions.
  await tx.customerSession.updateMany({where:{accountId:account.id,revokedAt:null},data:{revokedAt:now}});
  await tx.customerSession.create({data:{accountId:account.id,tokenHash:hashCustomerToken(session),expiresAt}});
  return account;
 },{timeout:12000});
 if(!result)return false;
 (await cookies()).set(CUSTOMER_COOKIE,session,cookieSettings);
 return true;
}

export async function getCustomerAccount(){
 const token=(await cookies()).get(CUSTOMER_COOKIE)?.value;
 if(!validCustomerToken(token))return null;
 const row=await retryCustomerDb(()=>getPrisma().customerSession.findUnique({
  where:{tokenHash:hashCustomerToken(token)},
  select:{expiresAt:true,revokedAt:true,account:{select:{id:true,email:true,firstName:true,lastName:true,passwordHash:true}}}
 }));
 if(!row||row.revokedAt||row.expiresAt<=new Date())return null;
 return {id:row.account.id,email:row.account.email,firstName:row.account.firstName,lastName:row.account.lastName,hasPassword:Boolean(row.account.passwordHash)};
}

export async function customerLogout(){
 const token=(await cookies()).get(CUSTOMER_COOKIE)?.value;
 if(validCustomerToken(token)){
  await getPrisma().customerSession.updateMany({where:{tokenHash:hashCustomerToken(token),revokedAt:null},data:{revokedAt:new Date()}});
 }
 (await cookies()).delete(CUSTOMER_COOKIE);
}
