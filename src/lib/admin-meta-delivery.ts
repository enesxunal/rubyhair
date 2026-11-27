import "server-only";
import {getPrisma} from "@/lib/prisma";
import {capiEnabled} from "@/lib/meta-conversions";
export async function loadMetaDelivery(){
 const config={enabled:capiEnabled(),server:process.env.RUBY_META_CAPI_ENABLED==="APPROVED",browser:process.env.NEXT_PUBLIC_RUBY_META_CAPI_ENABLED==="APPROVED",token:Boolean(process.env.RUBY_META_CAPI_TOKEN),secret:Boolean(process.env.SESSION_SECRET&&process.env.SESSION_SECRET.length>=32)};
 try{
  const db=getPrisma();
  const rows=await db.metaConversionContext.groupBy({by:["status"],where:{createdAt:{gte:new Date(Date.now()-7*86400000)}},_count:{_all:true}});
  const consent=await db.metaMeasurementConsent.count({where:{revokedAt:null,expiresAt:{gt:new Date()}}});
  return {config,rows:rows.map(r=>({status:r.status,count:r._count._all})),consent};
 }catch{return {config,rows:null,consent:null}}
}
