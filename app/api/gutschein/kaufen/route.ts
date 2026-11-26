import {recordPurchaseAttribution} from "@/lib/purchase-attribution";
import {NextRequest,NextResponse,after} from "next/server";
import {giftInput} from "@/lib/gift-cards/rules";
import {GiftError,startGiftPurchase} from "@/lib/gift-cards/server";
export const runtime="nodejs",dynamic="force-dynamic";
export const maxDuration=60;
const noCache={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
export async function POST(req:NextRequest){
 if(req.headers.get("origin")!=="https://rubyhair.de"||req.headers.get("sec-fetch-site")==="cross-site")
  return NextResponse.json({error:"ORIGIN_DENIED"},{status:403,headers:noCache});
 if(Number(req.headers.get("content-length")||0)>8192)return NextResponse.json({error:"TOO_LARGE"},{status:413,headers:noCache});
 const text=await req.text();if(text.length>8192)return NextResponse.json({error:"TOO_LARGE"},{status:413,headers:noCache});
 let json:unknown;try{json=JSON.parse(text)}catch{return NextResponse.json({error:"INVALID_JSON"},{status:400,headers:noCache})}
 const parsed=giftInput.safeParse(json);if(!parsed.success)return NextResponse.json({error:"INVALID_GIFT"},{status:400,headers:noCache});
 const ip=(req.headers.get("x-real-ip")||req.headers.get("x-forwarded-for")?.split(",")[0]||"unknown").trim().slice(0,120);
 try{const result=await startGiftPurchase(parsed.data,ip);after(async()=>{try{await recordPurchaseAttribution(req,"gift",result.purchaseId)}catch{console.warn("RUBY_ATTRIBUTION_WRITE_UNAVAILABLE")}});return NextResponse.json(result,{status:201,headers:noCache})}
 catch(e){return NextResponse.json({error:e instanceof GiftError?e.code:"TEMPORARILY_UNAVAILABLE"},{status:e instanceof GiftError?e.http:503,headers:noCache})}
}
