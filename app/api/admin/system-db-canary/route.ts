import {NextResponse} from "next/server";
import {isAdmin} from "@/lib/admin-auth";
import {PrismaClient} from "@prisma/client";
import {createFluidAdapter,selfhostPoolConfig} from "@/lib/fluid-db-pool";
export const runtime="nodejs",dynamic="force-dynamic",maxDuration=30;
const headers={"Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow"};
export async function GET(){
 if(!await isAdmin())return NextResponse.json({error:"UNAUTHORIZED"},{status:401,headers});
 if(process.env.VERCEL_ENV!=="production"||!process.env.RUBY_SELFHOST_DB)return NextResponse.json({error:"NOT_PRODUCTION"},{status:409,headers});
 let client:PrismaClient|undefined;let pool:ReturnType<typeof createFluidAdapter>["pool"]|undefined;let phase="tls_config";
 try{
  const start=Date.now();const adapter=createFluidAdapter(selfhostPoolConfig(process.env.RUBY_SELFHOST_DB));pool=adapter.pool;client=new PrismaClient({adapter:adapter.adapter});
  phase="connection";const rows=await client.$queryRaw<{role_ok:boolean;db_ok:boolean;tls_ok:boolean;client_cert:boolean}[]>`SELECT current_user='rubyhair_app' AS role_ok,current_database()='rubyhair' AS db_ok,ssl AS tls_ok,client_dn IS NOT NULL AS client_cert FROM pg_stat_ssl WHERE pid=pg_backend_pid()`;
  if(!rows[0]||Object.values(rows[0]).some(x=>x!==true))throw Error("TLS_CHECK_FAILED");
  phase="concurrent_reads";const counts=await Promise.all(Array.from({length:4},()=>client!.product.count()));if(counts.some(c=>c!==counts[0])||counts[0]<1||pool.totalCount>2)throw Error("READ_CHECK_FAILED");
  phase="read_only_transaction";await client.$transaction(async tx=>{await tx.$executeRaw`SET TRANSACTION READ ONLY`;const r=await tx.$queryRaw<{ro:string}[]>`SELECT current_setting('transaction_read_only') AS ro`;if(r[0]?.ro!=="on")throw Error("READ_ONLY_FAILED");await tx.product.findMany({take:2,select:{id:true,variants:{select:{id:true,stockQuantity:true,priceCents:true}}}})},{isolationLevel:"Serializable",maxWait:5000,timeout:5000});
  phase="idle_eviction";await new Promise(resolve=>setTimeout(resolve,5500));if(pool.totalCount!==0)throw Error("IDLE_NOT_EVICTED");
  phase="reconnect";if(await client.product.count()!==counts[0])throw Error("RECONNECT_FAILED");
  return NextResponse.json({ok:true,tls:true,clientCertificate:true,concurrentReads:4,maxPool:2,readOnlyTransaction:true,idleEviction:true,reconnect:true,ms:Date.now()-start},{headers});
 }catch{console.warn("RUBY_DB_CANARY_FAILED",{phase});return NextResponse.json({ok:false,phase},{status:503,headers})}
 finally{if(client)await client.$disconnect().catch(()=>{});if(pool&&!pool.ended)await pool.end().catch(()=>{})}
}
