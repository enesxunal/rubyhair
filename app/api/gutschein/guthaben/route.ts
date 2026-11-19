import {NextRequest,NextResponse} from "next/server";
import {getGiftBalanceByCode} from "@/lib/gift-cards/server";
import {giftCodeLooksValid} from "@/lib/gift-cards/rules";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 const headers={"Cache-Control":"no-store"};
 if(req.headers.get("origin")!=="https://rubyhair.de"||req.headers.get("sec-fetch-site")==="cross-site")return NextResponse.json({error:"ORIGIN_DENIED"},{status:403,headers});
 if(Number(req.headers.get("content-length")||0)>1024)return NextResponse.json({error:"TOO_LARGE"},{status:413,headers});
 const body=await req.json().catch(()=>null);
 if(!body||typeof body.code!=="string"||!giftCodeLooksValid(body.code))return NextResponse.json({error:"INVALID_GIFT_CODE"},{status:400,headers});
 try{const gift=await getGiftBalanceByCode(body.code);
  if(!gift)return NextResponse.json({error:"GIFT_NOT_FOUND_OR_USED"},{status:404,headers});
  return NextResponse.json(gift,{headers});
 }catch{return NextResponse.json({error:"TEMPORARILY_UNAVAILABLE"},{status:503,headers})}
}
