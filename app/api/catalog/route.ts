import { NextResponse } from "next/server";
import { getStoreCatalog } from "@/lib/catalog-server";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export async function GET() {
  try {
    const catalog=await getStoreCatalog();
    return NextResponse.json(catalog,{
      headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}
    });
  } catch(error){
    console.error("Ruby Hair catalog database request failed",error);
    return NextResponse.json(
      {error:"CATALOG_UNAVAILABLE"},
      {status:503,headers:{"Cache-Control":"no-store"}}
    );
  }
}
