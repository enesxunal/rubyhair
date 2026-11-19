import {NextResponse} from "next/server";
import {getPrisma} from "@/lib/prisma";
export const runtime="nodejs";
export async function GET(req:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret||secret.length<20||req.headers.get("authorization")!==`Bearer ${secret}`)return new NextResponse(null,{status:401});
 const db=getPrisma(),now=Date.now();
 const tokens=await db.customerLoginToken.deleteMany({where:{expiresAt:{lt:new Date(now-24*60*60*1000)}}});
 const sessions=await db.customerSession.deleteMany({where:{OR:[{expiresAt:{lt:new Date(now)}},{revokedAt:{lt:new Date(now-24*60*60*1000)}}]}});
 const limits=await db.customerAuthRateLimit.deleteMany({where:{windowStart:{lt:new Date(now-48*60*60*1000)}}});
 return NextResponse.json({ok:true,removed:{tokens:tokens.count,sessions:sessions.count,limits:limits.count}},{headers:{"Cache-Control":"private, no-store"}});
}
