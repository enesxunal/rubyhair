import { NextResponse } from "next/server";
export async function POST(){
  return NextResponse.json({
    error:"CHECKOUT_NOT_CONFIGURED",
    message:"Orders and payments are disabled until database and payment gateway are configured and tested."
  },{status:503,headers:{"Cache-Control":"no-store"}});
}
