import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,statSync,existsSync} from "node:fs";
import {customerTapePhotos,customerTapeMainImage,customerTapeAltImage} from "../src/lib/customer-tape-images";
import {products} from "../src/lib/catalog";

const source=(name:string)=>readFileSync(name,"utf8");

test("nine authentic merchant photos are optimized and correctly mapped to five tape colors",()=>{
 assert.deepEqual(customerTapePhotos.map(x=>x.code),["ari","banu","ruby","bronde","loui"]);
 let n=0;
 for(const tone of customerTapePhotos){
  for(const src of [tone.image,tone.alternate]){
   if(!src)continue;
   const file="public"+src;
   assert.ok(existsSync(file),file);
   assert.equal(readFileSync(file).toString("ascii",8,12),"WEBP",file);
   assert.ok(statSync(file).size>20_000&&statSync(file).size<240_000,file);
   n++;
  }
 }
 assert.equal(n,9);
});
test("only tape-in variants are overlaid; product identity, catalog prices and stock stay unchanged",()=>{
 const tape=products.find(x=>x.slug==="tape-in-extensions");
 assert.ok(tape);
 for(const variation of tape.variations){
  const photo=customerTapePhotos.find(x=>x.code===variation.color.toLowerCase());
  if(photo)assert.equal(variation.image,photo.image);
 }
 assert.equal(customerTapeMainImage("keratin-bondings","bronde","/old.jpg"),"/old.jpg");
 assert.equal(customerTapeMainImage("tape-in-extensions","silver","/old.jpg"),"/old.jpg");
 assert.equal(customerTapeAltImage("tape-in-extensions","ari"),null);
 assert.equal(customerTapeAltImage("tape-in-extensions","banu"),"/assets/ruby-tape-banu-alt.webp");
 const catalogServer=source("src/lib/catalog-server.ts");
 assert.ok(catalogServer.includes("customerTapeMainImage(p.slug,v.colorCode,v.image)"));
 assert.ok(catalogServer.includes("price:v.priceCents/100"));
 assert.ok(catalogServer.includes("stock_quantity:v.stockQuantity"));
});
test("real Tape-in gallery appears in home, product detail, and AI try-on with correct shade link",()=>{
 const home=source("src/components/home-frontend.tsx");
 const product=source("src/components/product-detail.tsx");
 const lab=source("app/haar-anprobe/page.tsx");
 assert.ok(home.includes("customerTapePhotos.map("));
 assert.ok(home.includes("encodeURIComponent(item.code)"));
 assert.ok(home.includes("/assets/ruby-tape-bronde-main.webp"));
 assert.ok(product.includes('customerTapeAltImage(product.slug,selected.color)'));
 assert.ok(lab.includes('import {products as catalogProducts} from "@/lib/catalog"'));
 assert.ok(!home.includes("Keratin as Tape-in"));
});
