import "dotenv/config";
import {randomUUID} from "node:crypto";
import {PrismaClient} from "@prisma/client";
import {
 assertLocalTestMode,reserveLocalTestOrder,endLocalTestReservation,
 expireLocalTestReservations,TestOrderError
} from "../src/lib/order-reservations";

function check(condition:unknown,message:string):asserts condition{
 if(!condition)throw new Error("ORDER_TEST_FAILED: "+message);
}
async function expectCode(operation:()=>Promise<unknown>,code:string){
 try{await operation();}
 catch(e){
   check(e instanceof TestOrderError&&e.code===code,"Expected "+code+", got "+String(e));
   return;
 }
 throw new Error("Expected rejection "+code);
}
async function main(){
 assertLocalTestMode();
 const db=new PrismaClient();
 const slug="ruby-test-order-"+randomUUID();
 let productId="";
 const variationIds:string[]=[];
 try{
  const product=await db.product.create({data:{
   slug,name:"Synthetic Test Hair",originalName:"Synthetic Test Hair",
   intro:"LOCAL TEST ONLY",pack:"1",material:"Synthetic",currency:"EUR",
   image:"/media/test-not-used.jpg",active:true
  }});
  productId=product.id;
  const a=await db.variant.create({data:{
   productId,priceCents:2599,stockQuantity:3,colorCode:"a",colorLabel:"A",
   lengthCode:"50",lengthLabel:"50cm",image:"/media/test-not-used.jpg",active:true
  }});
  const b=await db.variant.create({data:{
   productId,priceCents:3799,stockQuantity:2,colorCode:"b",colorLabel:"B",
   lengthCode:"50",lengthLabel:"50cm",image:"/media/test-not-used.jpg",active:true
  }});
  const unknown=await db.variant.create({data:{
   productId,priceCents:4599,stockQuantity:null,colorCode:"c",colorLabel:"C",
   lengthCode:"50",lengthLabel:"50cm",image:"/media/test-not-used.jpg",active:true
  }});
  variationIds.push(a.id,b.id,unknown.id);
  const readStocks=async()=>{
   const rows=await db.variant.findMany({where:{id:{in:variationIds}}});
   return Object.fromEntries(rows.map(x=>[x.id,x.stockQuantity]));
  };
  const key=randomUUID();
  const input={reservationKey:key,lines:[{variantId:a.id,quantity:2},{variantId:b.id,quantity:1}]};
  const hold=await reserveLocalTestOrder(db,input);
  check(hold.status==="test_reserved"&&hold.totalCents===8997,"DB-derived total, hold status");
  const fresh=await db.order.findUniqueOrThrow({where:{id:hold.id},include:{lines:true,payments:true}});
  check(fresh.testOnly&&fresh.lines.length===2&&fresh.payments.length===0,"Persisted test-only order and lines");
  check(fresh.customerEmail===null&&fresh.billingAddress===null&&fresh.shippingAddress===null,
   "No personal data");
  check(fresh.lines.reduce((s,l)=>s+l.lineTotalCents,0)===8997,"Immutable price snapshot");
  let stocks=await readStocks();
  check(stocks[a.id]===1&&stocks[b.id]===1,"Stock decremented atomically");
  const replay=await reserveLocalTestOrder(db,input);
  check(replay.replayed&&replay.id===hold.id,"Idempotency replay");
  await expectCode(()=>reserveLocalTestOrder(db,{reservationKey:key,lines:[{variantId:a.id,quantity:1}]}),"IDEMPOTENCY_CONFLICT");
  stocks=await readStocks();
  check(stocks[a.id]===1&&stocks[b.id]===1,"Replay did not double decrement");
  await expectCode(()=>reserveLocalTestOrder(db,{
   reservationKey:randomUUID(),lines:[{variantId:a.id,quantity:1},{variantId:b.id,quantity:2}]
  }),"INSUFFICIENT_STOCK");
  stocks=await readStocks();
  check(stocks[a.id]===1&&stocks[b.id]===1,"Insufficient stock rolls back ALL lines");
  await expectCode(()=>reserveLocalTestOrder(db,{
   reservationKey:randomUUID(),lines:[{variantId:unknown.id,quantity:1}]
  }),"UNVERIFIED_STOCK");
  await expectCode(()=>reserveLocalTestOrder(db,{
   reservationKey:randomUUID(),lines:[{variantId:a.id,quantity:1},{variantId:a.id,quantity:1}]
  }),"INVALID_REQUEST");
  await expectCode(()=>reserveLocalTestOrder(db,{
   reservationKey:randomUUID(),lines:[{variantId:a.id,quantity:100}]
  }),"INVALID_REQUEST");
  const race=await Promise.allSettled([
   reserveLocalTestOrder(db,{reservationKey:randomUUID(),lines:[{variantId:a.id,quantity:1}]}),
   reserveLocalTestOrder(db,{reservationKey:randomUUID(),lines:[{variantId:a.id,quantity:1}]})
  ]);
  const wins=race.filter(r=>r.status==="fulfilled");
  const fails=race.filter(r=>r.status==="rejected");
  check(wins.length===1&&fails.length===1,"Oversell prevention under concurrent requests");
  check((fails[0] as PromiseRejectedResult).reason instanceof TestOrderError,"Expected controlled stock rejection");
  check((await readStocks())[a.id]===0,"Stock cannot become negative");
  const raceHold=(wins[0] as PromiseFulfilledResult<Awaited<ReturnType<typeof reserveLocalTestOrder>>>).value;
  await endLocalTestReservation(db,raceHold.id);
  check((await readStocks())[a.id]===1,"Cancelled race hold restores stock");
  const cancelled=await endLocalTestReservation(db,hold.id);
  check(cancelled.status==="test_cancelled"&&!cancelled.replayed,"Cancellation");
  check((await endLocalTestReservation(db,hold.id)).replayed,"Repeat cancellation safe");
  stocks=await readStocks();
  check(stocks[a.id]===3&&stocks[b.id]===2,"Exactly-once stock restoration");
  const expiryHold=await reserveLocalTestOrder(db,{
   reservationKey:randomUUID(),lines:[{variantId:a.id,quantity:1}]
  });
  await db.order.update({where:{id:expiryHold.id},data:{reservationExpiresAt:new Date(Date.now()-1000)}});
  check(await expireLocalTestReservations(db)===1,"Expired reservation cleaned");
  check((await db.order.findUniqueOrThrow({where:{id:expiryHold.id}})).status==="test_expired","Expiration status");
  check((await readStocks())[a.id]===3,"Expired stock released");
  check(await expireLocalTestReservations(db)===0,"No double expiry");
  const oldFlag=process.env.RUBY_LOCAL_ORDER_TESTS;
  try{
    delete process.env.RUBY_LOCAL_ORDER_TESTS;
    await expectCode(()=>reserveLocalTestOrder(db,input),"TEST_ONLY");
  }finally{process.env.RUBY_LOCAL_ORDER_TESTS=oldFlag}
  console.log("PASS reservation+DB pricing+idempotency+atomic rollback+unknown stock+oversell concurrency+cancel+expiry+test gate");
  console.log("LOCAL_DB_TEST_ORDERS_CLEANUP_PENDING");
 }finally{
  if(productId){
   const ids=variationIds;
   const orders=await db.order.findMany({where:{testOnly:true,lines:{some:{variantId:{in:ids}}}},select:{id:true}});
   const orderIds=orders.map(x=>x.id);
   await db.orderLine.deleteMany({where:{orderId:{in:orderIds}}});
   await db.order.deleteMany({where:{id:{in:orderIds},testOnly:true}});
   await db.variant.deleteMany({where:{productId}});
   await db.product.delete({where:{id:productId}});
   console.log("LOCAL_TEST_DATA_CLEANED",orderIds.length,"orders");
  }
  await db.$disconnect();
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
