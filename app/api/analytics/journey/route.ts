import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {journeySchema} from "@/lib/journey-policy";
import {journeyAllowed,journeyOrigin,writeJourney,revokeJourneySession} from "@/lib/journey-server";
import {publicRequestAllowed} from "@/lib/public-rate-limit";
export const runtime="nodejs",dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
const response=(status:number)=>new NextResponse(null,{status,headers});
export async function POST(req:NextRequest){
 if(!journeyAllowed(req))return response(403);
 try{
 if(Number(req.headers.get("content-length")||0)>1000)return response(413);
 const raw=await req.text();if(raw.length>1000)return response(413);
 const d=journeySchema.safeParse(JSON.parse(raw));if(!d.success)return response(400);
 if(!await publicRequestAllowed(req.headers,"checkout-journey",{ip:120,global:4000,windowMs:15*60000}))return response(429);
 await writeJourney(d.data);return response(204);
 }catch{return response(503)}
}
export async function DELETE(req:NextRequest){
 if(!journeyOrigin(req))return response(403);
 try{const raw=await req.text();if(raw.length>100)return response(413);
 const d=z.object({session:z.string().uuid()}).strict().safeParse(JSON.parse(raw));if(!d.success)return response(400);
 if(!await publicRequestAllowed(req.headers,"checkout-journey-revoke",{ip:30,global:500,windowMs:15*60000}))return response(429);
 await revokeJourneySession(d.data.session);return response(204);
 }catch{return response(503)}
}
