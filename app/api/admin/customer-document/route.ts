import {NextRequest,NextResponse} from "next/server";
import {isAdmin} from "@/lib/admin-auth";
import {getPrisma} from "@/lib/prisma";
export const dynamic="force-dynamic",runtime="nodejs";
const hd={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex, nofollow"};
export async function GET(req:NextRequest){
 if(!await isAdmin())return NextResponse.json({error:"UNAUTHORIZED"},{status:401,headers:hd});
 const id=req.nextUrl.searchParams.get("orderId")||"";
 const type=req.nextUrl.searchParams.get("type");
 if(!/^[0-9a-f-]{36}$/i.test(id)||!(["invoice","label"].includes(type||"")))return NextResponse.json({error:"BAD_REQUEST"},{status:400,headers:hd});
 const db=getPrisma();
 if(type==="invoice"){
  const doc=await db.invoice.findUnique({where:{orderId:id},include:{order:{select:{testOnly:true,status:true}}}});
  if(!doc||doc.order.testOnly||!(["payment_confirmed","preparing","shipped","delivered"].includes(doc.order.status)))return NextResponse.json({error:"NOT_FOUND"},{status:404,headers:hd});
  return new Response(new Uint8Array(doc.pdf),{headers:{...hd,"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${doc.invoiceNumber}.pdf"`}});
 }
 const job=await db.shippingJob.findUnique({where:{orderId:id},include:{order:{select:{testOnly:true,orderNumber:true}}}});
 if(!job||job.order.testOnly||!job.labelPdf||!job.trackingNumber)return NextResponse.json({error:"NOT_FOUND"},{status:404,headers:hd});
 return new Response(new Uint8Array(job.labelPdf),{headers:{...hd,"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="RH-${job.order.orderNumber}-DHL.pdf"`}});
}
