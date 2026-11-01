import { NextResponse } from "next/server";
import {products,productSnapshotTime} from "@/lib/catalog";
export const dynamic="force-static";
export function GET(){
  return NextResponse.json({
    source:"ruby-hair-import",
    imported_at:productSnapshotTime,
    products:products.map(p=>({
      ...p,variations:p.variations.map(v=>({...v}))
    }))
  },{headers:{"Cache-Control":"public, max-age=60, s-maxage=300"}});
}
