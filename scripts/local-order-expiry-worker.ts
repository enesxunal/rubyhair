import "dotenv/config";
import {PrismaClient} from "@prisma/client";
import {setTimeout as sleep} from "node:timers/promises";
import {assertLocalTestMode,expireLocalTestReservations} from "../src/lib/order-reservations";

/**
 * Only runs against the isolated loopback PostgreSQL with an explicit test flag.
 * --once: sweep expired test holds and exit (safe for a future scheduler)
 * --watch: repeat every 60 seconds while the process is running
 *
 * This is NOT a deployed cron job and does NOT handle real customer orders.
 */
export async function sweepExpiredLocalTestOrders(db:PrismaClient,maxBatches=20){
  assertLocalTestMode();
  let total=0;
  for(let i=0;i<maxBatches;i++){
    const count=await expireLocalTestReservations(db,new Date());
    total+=count;
    if(count<100)return {expired:total,exhausted:false};
  }
  return {expired:total,exhausted:true};
}

async function main(){
  assertLocalTestMode();
  const mode=process.argv.includes("--watch")?"watch":"once";
  if(process.argv.some(a=>a.startsWith("--")&&!["--once","--watch"].includes(a)))
    throw new Error("Unsupported worker option");
  if(process.argv.includes("--watch")&&process.argv.includes("--once"))
    throw new Error("Choose --once or --watch, not both");
  const db=new PrismaClient();
  let stopping=false;
  const abort=new AbortController();
  const stop=()=>{stopping=true;abort.abort();};
  process.on("SIGTERM",stop);
  process.on("SIGINT",stop);
  try{
    do{
      const start=Date.now();
      const result=await sweepExpiredLocalTestOrders(db);
      console.log(JSON.stringify({
        job:"rubyhair-local-test-expiry",mode,expired:result.expired,
        sweepLimitReached:result.exhausted,elapsedMs:Date.now()-start
      }));
      if(result.exhausted)process.exitCode=2;
      if(mode==="once"||stopping||result.exhausted)break;
      try{await sleep(60_000,undefined,{signal:abort.signal});}
      catch(error){if(!stopping)throw error;}
    }while(!stopping);
  }finally{
    process.removeListener("SIGTERM",stop);
    process.removeListener("SIGINT",stop);
    await db.$disconnect();
  }
}
if(require.main===module){main().catch(error=>{console.error("LOCAL_TEST_EXPIRY_WORKER_FAILED",error);process.exitCode=1;});}
