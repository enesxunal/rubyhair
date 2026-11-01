import { NextRequest,NextResponse } from "next/server";
import {quoteRequestSchema,buildCartQuote} from "@/lib/cart-quote";
export const dynamic="force-dynamic";
export const runtime="nodejs";
const headers={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};

export async function POST(request:NextRequest){
  try{
    if(Number(request.headers.get("content-length")||0)>8192){
      return NextResponse.json({error:"REQUEST_TOO_LARGE"},{status:413,headers});
    }
    const raw=await request.text();
    if(raw.length>8192)return NextResponse.json({error:"REQUEST_TOO_LARGE"},{status:413,headers});
    let json:unknown;
    try{json=JSON.parse(raw)}catch{
      return NextResponse.json({error:"INVALID_JSON"},{status:400,headers});
    }
    const parsed=quoteRequestSchema.safeParse(json);
    if(!parsed.success){
      return NextResponse.json({error:"INVALID_CART"},{status:400,headers});
    }
    const quote=await buildCartQuote(parsed.data);
    return NextResponse.json(quote,{headers});
  }catch(error){
    console.error("Ruby Hair cart quotation failed",error);
    return NextResponse.json({error:"QUOTE_UNAVAILABLE"},{status:503,headers});
  }
}
