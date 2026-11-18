import {NextRequest,NextResponse} from "next/server";
import {isAdmin} from "@/lib/admin-auth";
import {getPrisma} from "@/lib/prisma";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
 if(!await isAdmin())return NextResponse.json({error:"UNAUTHORIZED"},{status:401,headers:{"Cache-Control":"private, no-store"}});
 const id=request.nextUrl.searchParams.get("orderId")||"";
 if(!/^[a-f0-9]{8}-[a-f0-9-]{27,}$/i.test(id))return NextResponse.json({error:"INVALID_REQUEST"},{status:400});
 const row=await getPrisma().invoice.findUnique({where:{orderId:id},include:{order:{select:{testOnly:true,status:true}}}});
 if(!row||!row.order.testOnly||row.order.status!=="payment_confirmed")return NextResponse.json({error:"INVOICE_NOT_FOUND"},{status:404});
 return new Response(new Uint8Array(row.pdf),{headers:{
  "Content-Type":"application/pdf","Content-Length":String(row.pdf.byteLength),
  "Content-Disposition":`attachment; filename="${row.invoiceNumber}.pdf"`,
  "Cache-Control":"private, no-store, max-age=0","X-Content-Type-Options":"nosniff",
  "X-Robots-Tag":"noindex, nofollow","X-Frame-Options":"DENY"
 }});
}
