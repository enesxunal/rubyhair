import {NextResponse} from "next/server";
import {getCustomerAccount} from "@/lib/customer-account";
import {getPrisma} from "@/lib/prisma";
import {safeCustomerInvoiceName} from "@/lib/customer-account-rules";
export const runtime="nodejs";
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 const account=await getCustomerAccount();
 if(!account)return new NextResponse(null,{status:401,headers:{"Cache-Control":"private, no-store"}});
 const {id}=await params;
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))return new NextResponse(null,{status:404});
 const invoice=await getPrisma().invoice.findFirst({where:{order:{id,customerEmail:{equals:account.email,mode:"insensitive"},testOnly:false}},select:{invoiceNumber:true,pdf:true}});
 if(!invoice)return new NextResponse(null,{status:404,headers:{"Cache-Control":"private, no-store"}});
 return new NextResponse(new Uint8Array(invoice.pdf),{headers:{
  "Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${safeCustomerInvoiceName(invoice.invoiceNumber)}.pdf"`,
  "Cache-Control":"private, no-store, max-age=0","X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex, nofollow"
 }});
}
