import {NextResponse} from "next/server";
import {databaseConfigured} from "@/lib/prisma";

// Temporary readiness check. This returns flags ONLY; never key material or environment values.
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 return NextResponse.json({
  database:databaseConfigured(),
  emailPresent:Boolean(process.env.ADMIN_EMAIL),
  passwordHashFormat:Boolean(process.env.ADMIN_PASSWORD_HASH?.startsWith("$2")),
  sessionLengthValid:(process.env.SESSION_SECRET?.length||0)>=32,
  paymentVaultFormat: /^[A-Za-z0-9_-]{43,44}={0,2}$/.test(process.env.RUBY_PAYMENT_SETTINGS_KEY||"")
 },{headers:{"Cache-Control":"private, no-store"}});
}
