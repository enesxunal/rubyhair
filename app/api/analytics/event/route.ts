import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {databaseConfigured,getPrisma} from "@/lib/prisma";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const cache={"Cache-Control":"private, no-store"};
const schema=z.object({
  event:z.enum(["page_view","add_to_cart","begin_checkout"]),
  path:z.enum(["/","/kollektionen","/kollektionen/tape-in-extensions","/produkt/tape-in-extensions","/ratgeber","/kontakt","/versand-zahlung","/warenkorb","/kasse","/haar-anprobe","/suche"]),
  source:z.enum(["direct","search","social","referral","internal"]),
  device:z.enum(["mobile","desktop"]),
  consent:z.literal(true)
}).strict();
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
 const now=new Date();const day=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
 try{
  const db=getPrisma();
  // The database contains only aggregates. Delete rows older than 180 days.
  const cutoff=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()-180));
  await db.analyticsAggregate.deleteMany({where:{day:{lt:cutoff}}});
  await db.analyticsAggregate.upsert({
   where:{day_path_event_source_device:{day,path,event,source,device}},
   create:{day,path,event,source,device,count:1},update:{count:{increment:1}}
  });
  return new NextResponse(null,{status:204,headers:cache});
 }catch{return NextResponse.json({error:"unavailable"},{status:503,headers:cache});}
}
