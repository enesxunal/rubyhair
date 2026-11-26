import "server-only";
import {getPrisma} from "@/lib/prisma";
import {safeDiagnosticCode,type DiagnosticMethod,type DiagnosticStage} from "@/lib/checkout-diagnostic-policy";
let lastCleanup=0;
export async function recordCheckoutDiagnostic(method:DiagnosticMethod,stage:DiagnosticStage,code:unknown,origin:"server"|"browser",orderId?:string){
 const safe=safeDiagnosticCode(code);
 try{
  const db=getPrisma();
  await db.checkoutDiagnostic.create({data:{method,stage,code:safe,origin,orderId:origin==="server"&&orderId&&/^[0-9a-f-]{36}$/i.test(orderId)?orderId:undefined}});
  if(Date.now()-lastCleanup>86400000){lastCleanup=Date.now();await db.checkoutDiagnostic.deleteMany({where:{createdAt:{lt:new Date(Date.now()-30*86400000)}}}).catch(()=>{});}
 }catch{console.warn("RUBY_CHECKOUT_DIAGNOSTIC_WRITE_FAILED",{method,stage,code:safe,origin});}
}
