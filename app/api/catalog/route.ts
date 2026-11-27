import {classifySystemError} from "@/lib/system-diagnostic-policy";
import {recordSystemDiagnostic} from "@/lib/system-diagnostics";
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
    const code=classifySystemError(error,"catalog","route");
    await recordSystemDiagnostic("catalog",code==="SERVER_API_FAILED"?"CATALOG_UNAVAILABLE":code,"server");
    return NextResponse.json(
      {error:"CATALOG_UNAVAILABLE"},
      {status:503,headers:{"Cache-Control":"no-store"}}
    );
  }
}
