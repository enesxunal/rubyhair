import {NextResponse} from "next/server";
import {customerLogout,sameOriginCustomerRequest} from "@/lib/customer-account";
export const runtime="nodejs";
export async function POST(){
 if(!await sameOriginCustomerRequest())return NextResponse.json({error:"ORIGIN_DENIED"},{status:403});
 await customerLogout();
 return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
}
