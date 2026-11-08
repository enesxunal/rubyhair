/** Apply only source-grounded draft copy in loopback development PostgreSQL.
 * Does NOT overwrite previously edited merchant content or touch any live database.
 */
import {PrismaClient} from "@prisma/client";
import catalog from "../src/data/products.json";
if(process.env.RUBY_LOCAL_CONTENT_APPROVAL!=="LOCAL_PREVIEW_ONLY")throw Error("Local-only draft content gate closed");
const url=new URL(process.env.DATABASE_URL||"");
if(!["localhost","127.0.0.1","[::1]"].includes(url.hostname))throw Error("No remote database edits permitted");
async function reconcile(){
const prisma=new PrismaClient();
try{
 const tape=catalog.products["tape-in-extensions"];
 const result=await prisma.product.updateMany({
  where:{slug:"tape-in-extensions",intro:"Für mehr Fülle und Länge mit einem angenehmen Tragegefühl.",image:"/media/1006-2-300x400-72b38cf44.jpg"},
  data:{headline:tape.headline,intro:tape.intro,image:tape.image}
 });
 console.log("LOCAL DRAFT COPY RECONCILED:",result.count,"product(s); 0 means preexisting merchant edit preserved");
}finally{await prisma.$disconnect()}
}
reconcile().catch(e=>{console.error(e.message);process.exitCode=1});
