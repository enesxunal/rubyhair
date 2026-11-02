import "dotenv/config";
import {PrismaClient} from "@prisma/client";
import {assertLocalTestMode} from "../src/lib/order-reservations";
import {isKnownOrderState} from "../src/lib/order-lifecycle";

/** Read-only integrity check; prints counts only, no personal/order data. */
async function main(){
  assertLocalTestMode();
  const db=new PrismaClient();
  try{
    const now=new Date();
    const [total,active,overdue,unknownStock,negativeStock,orders]=await Promise.all([
      db.order.count({where:{testOnly:true}}),
      db.order.count({where:{testOnly:true,status:"test_reserved"}}),
      db.order.count({where:{testOnly:true,status:"test_reserved",reservationExpiresAt:{lte:now}}}),
      db.variant.count({where:{stockQuantity:null}}),
      db.variant.count({where:{stockQuantity:{lt:0}}}),
      db.order.findMany({
        where:{testOnly:true},take:1000,orderBy:{createdAt:"desc"},
        select:{status:true,reservationExpiresAt:true,lines:{select:{id:true},take:1},statusEvents:{
          select:{fromStatus:true,toStatus:true,reason:true},orderBy:[{createdAt:"asc"},{id:"asc"}]
        }}
      })
    ]);
    const issues:string[]=[];
    if(negativeStock>0)issues.push("Negative stock found");
    if(total>1000)issues.push("Audit pagination limit reached");
    for(const order of orders){
      if(!order.lines.length)issues.push("Test order without order lines");
      if(!["test_reserved","test_cancelled","test_expired"].includes(order.status))
        issues.push("Unexpected test status");
      if(!order.statusEvents.length){issues.push("Missing order history");continue;}
      if(order.statusEvents[0].fromStatus!==null||order.statusEvents[0].toStatus!=="test_reserved")
        issues.push("Invalid initial history");
      for(let i=1;i<order.statusEvents.length;i++){
        if(order.statusEvents[i].fromStatus!==order.statusEvents[i-1].toStatus)
          issues.push("Broken order history chain");
      }
      if(order.statusEvents.at(-1)?.toStatus!==order.status)
        issues.push("Order status does not match history");
      if(!isKnownOrderState(order.status))issues.push("Unknown order state");
      if(order.status==="test_reserved"&&!order.reservationExpiresAt)
        issues.push("Active reservation without expiration time");
    }
    console.log(JSON.stringify({
      audit:"rubyhair-local-order-integrity",
      result:issues.length?"FAIL":"PASS",
      testOrders:total,activeTestHolds:active,overdueTestHolds:overdue,
      unverifiedStockVariants:unknownStock,negativeStockVariants:negativeStock,
      issues:[...new Set(issues)]
    }));
    if(issues.length)process.exitCode=1;
  }finally{await db.$disconnect();}
}
main().catch(error=>{console.error("LOCAL_ORDER_AUDIT_FAILED",error);process.exitCode=1;});
