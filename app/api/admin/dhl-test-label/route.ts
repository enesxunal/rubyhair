import {isAdmin} from "@/lib/admin-auth";
import {createSandboxDhlTestLabel,DhlSandboxTestError} from "@/lib/dhl-sandbox-label";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(request:Request){
 if(!await isAdmin())return Response.json({error:"ADMIN_REQUIRED"},{status:401,headers:{"Cache-Control":"no-store"}});
 const origin=request.headers.get("origin");
 if(origin&&origin!==new URL(request.url).origin)return Response.json({error:"CROSS_SITE_DENIED"},{status:403});
 try{
  const pdf=await createSandboxDhlTestLabel();
  return new Response(Buffer.from(pdf),{status:200,headers:{
   "Content-Type":"application/pdf", "Content-Disposition":"attachment; filename=RubyHair-DHL-Sandbox-Testlabel.pdf",
   "Cache-Control":"no-store, private","X-Content-Type-Options":"nosniff"
  }});
 }catch(error){
  const phase=error instanceof DhlSandboxTestError?error.phase:"UNAVAILABLE";
  const status=error instanceof DhlSandboxTestError?error.status:502;
  console.warn("DHL_SANDBOX_LABEL_TEST",phase,status);
  return Response.json({result:"sandbox_test_failed",phase,httpStatus:status,noRealShipment:true,noCharge:true},
   {status:status>=400&&status<=599?status:502,headers:{"Cache-Control":"no-store"}});
 }
}
