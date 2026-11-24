import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {databaseConfigured,getPrisma} from "@/lib/prisma";
import {storyAnalyticsPaths} from "@/data/story-analytics";
import {berlinDateKey} from "@/lib/analytics-calendar";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const cache={"Cache-Control":"private, no-store"};
// Keep the 180-day retention policy without running a second database write
// before every visitor event (the production serverless pool is limited).
let lastRetentionCleanup=0;
const publicPaths=new Set(["/","/kollektionen","/kollektionen/tape-in-extensions","/produkt/tape-in-extensions","/produkt/keratin-bondings","/ratgeber","/kontakt","/versand-zahlung","/warenkorb","/kasse","/haar-anprobe","/suche","/geschenkgutschein"]);
const schema=z.object({
  event:z.enum(["page_view","add_to_cart","begin_checkout","story_view","ai_tryon_start","ai_tryon_success","ai_to_cart"]),
  path:z.string().min(1).max(80),
  source:z.enum(["direct","search","social","referral","internal","meta_paid","meta_post","meta_reels"]),
  device:z.enum(["mobile","desktop"]),
  consent:z.literal(true)
}).strict().superRefine((data,ctx)=>{
 const allowed=data.event==="story_view"?storyAnalyticsPaths.has(data.path):
  data.event==="ai_tryon_start"||data.event==="ai_tryon_success"||data.event==="ai_to_cart"?data.path==="/haar-anprobe":
  publicPaths.has(data.path);
 if(!allowed)ctx.addIssue({code:"custom",path:["path"],message:"Event path not allowed"});
});
export async function POST(request:NextRequest){
 // Collect only after explicit consent and both server/client activation flags.
 if(process.env.RUBY_ANALYTICS_ENABLED!=="APPROVED"||!databaseConfigured())
  return NextResponse.json({disabled:true},{status:503,headers:cache});
 const origin=request.headers.get("origin");
 // Next.js may normalize 127.0.0.1 to localhost internally. Validate the
 // caller against the actual request host (also works behind HTTPS proxy).
 let sameOrigin=false;
 try{
  const supplied=new URL(origin||"");
  const allowedHosts=[request.headers.get("host"),request.headers.get("x-forwarded-host")].filter(Boolean);
  const acceptableScheme=supplied.protocol==="https:"||
    (supplied.protocol==="http:"&&["localhost","127.0.0.1"].includes(supplied.hostname));
  sameOrigin=acceptableScheme&&allowedHosts.includes(supplied.host);
 }catch{/* not a valid Origin */}
 if(!sameOrigin||request.cookies.get("ruby_analytics")?.value!=="allow")
  return NextResponse.json({error:"consent_required"},{status:403,headers:cache});
 let body:unknown;
 try{
  if(Number(request.headers.get("content-length")||0)>1000)return NextResponse.json({error:"oversize"},{status:413,headers:cache});
  const text=await request.text();
  if(text.length>1000)return NextResponse.json({error:"oversize"},{status:413,headers:cache});
  body=JSON.parse(text);
 }catch{return NextResponse.json({error:"invalid"},{status:400,headers:cache});}
 const parsed=schema.safeParse(body);
 if(!parsed.success)return NextResponse.json({error:"invalid_event"},{status:400,headers:cache});
 const {path,event,source,device}=parsed.data;
 const now=new Date();const day=berlinDateKey(now);
 try{
  const db=getPrisma();
  // A single atomic upsert is the primary action. Expensive retention cleanup
  // must never prevent a consented event from being recorded.
  await db.analyticsAggregate.upsert({
   where:{day_path_event_source_device:{day,path,event,source,device}},
   create:{day,path,event,source,device,count:1},update:{count:{increment:1}}
  });
  const nowMs=Date.now();
  if(nowMs-lastRetentionCleanup>24*60*60*1000){
   lastRetentionCleanup=nowMs;
   const cutoff=new Date(day);cutoff.setUTCDate(cutoff.getUTCDate()-180);
   try{await db.analyticsAggregate.deleteMany({where:{day:{lt:cutoff}}});}
   catch(error){
    const code=typeof error==="object"&&error!==null&&"code" in error?String(error.code):"UNAVAILABLE";
    console.warn("RUBY_ANALYTICS_RETENTION_RETRY_LATER",code.slice(0,20));
    // A successful upsert must still return 204; never trigger a client retry.
   }
  }
  return new NextResponse(null,{status:204,headers:cache});
 }catch(error){
  const code=typeof error==="object"&&error!==null&&"code" in error?String(error.code):"UNAVAILABLE";
  console.warn("RUBY_ANALYTICS_WRITE_UNAVAILABLE",code.slice(0,20));
  return NextResponse.json({error:"unavailable"},{status:503,headers:cache});
 }
}
