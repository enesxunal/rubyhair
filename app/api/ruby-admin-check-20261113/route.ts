import {NextResponse} from "next/server";
import {databaseConfigured} from "@/lib/prisma";
import {normalizedAdminPasswordHash} from "@/lib/admin-password-config";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 const hash=process.env.ADMIN_PASSWORD_HASH||"";
 return NextResponse.json({
  database:databaseConfigured(),
  email:Boolean(process.env.ADMIN_EMAIL),
  session:(process.env.SESSION_SECRET?.length||0)>=32,
  hashPresent:Boolean(hash.trim()),
  hashStartsBcrypt:hash.trim().startsWith("$2"),
  hashStartsAssignment:hash.trim().startsWith("ADMIN_PASSWORD_HASH="),
  hashLength60:hash.trim().length===60,
  normalizedHashValid:Boolean(normalizedAdminPasswordHash(hash)),
 },{headers:{"Cache-Control":"no-store, private"}})
}
