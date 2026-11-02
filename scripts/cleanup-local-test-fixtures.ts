import "dotenv/config";
import {PrismaClient} from "@prisma/client";
import {assertLocalTestMode} from "../src/lib/order-reservations";

/** Safe cleanup of abandoned synthetic fixtures only, never merchant products. */
async function main(){
 assertLocalTestMode();
 const db=new PrismaClient();
 try{
  const fixtures=await db.product.findMany({where:{
   slug:{startsWith:"ruby-test-order-"},
   originalName:"Synthetic Test Hair",
   intro:"LOCAL TEST ONLY"
  },include:{variants:{select:{id:true}}}});
  let ordersRemoved=0;
  for(const product of fixtures){
   const variantIds=product.variants.map(v=>v.id);
   const orders=await db.order.findMany({
     where:{lines:{some:{variantId:{in:variantIds}}}},
     select:{id:true,testOnly:true,customerEmail:true}
   });
   if(orders.some(o=>!o.testOnly||o.customerEmail!==null)){
     throw new Error("Fixture references unexpected non-test/customer order; manual review required");
   }
   const ids=orders.map(o=>o.id);
   await db.$transaction(async tx=>{
     await tx.orderStatusEvent.deleteMany({where:{orderId:{in:ids}}});
     await tx.paymentEvent.deleteMany({where:{orderId:{in:ids}}});
     await tx.orderLine.deleteMany({where:{orderId:{in:ids}}});
     await tx.order.deleteMany({where:{id:{in:ids},testOnly:true}});
     await tx.variant.deleteMany({where:{productId:product.id}});
     await tx.product.delete({where:{id:product.id}});
   });
   ordersRemoved+=ids.length;
  }
  // An interrupted older test may have deleted lines before order history, leaving
  // an orphan synthetic order. Clean only explicitly test-tagged, customer-free records.
  const orphanOrders=await db.order.findMany({
    where:{testOnly:true,customerEmail:null,lines:{none:{}},payments:{none:{}},
      statusEvents:{some:{reason:"local_test_reservation"}}},
    select:{id:true,billingAddress:true,shippingAddress:true}
  });
  const safeOrphans=orphanOrders.filter(o=>o.billingAddress===null&&o.shippingAddress===null);
  const orphanIds=safeOrphans.map(o=>o.id);
  if(orphanIds.length){
    await db.$transaction(async tx=>{
      await tx.orderStatusEvent.deleteMany({where:{orderId:{in:orphanIds}}});
      await tx.order.deleteMany({where:{id:{in:orphanIds},testOnly:true}});
    });
    ordersRemoved+=orphanIds.length;
  }
  console.log("LOCAL_SYNTHETIC_FIXTURES_CLEANED",JSON.stringify({products:fixtures.length,orders:ordersRemoved,orphanOrders:orphanIds.length}));
 }finally{await db.$disconnect();}
}
main().catch(e=>{console.error(e);process.exitCode=1});
