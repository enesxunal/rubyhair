import {test} from "node:test";
import assert from "node:assert/strict";
import {availableHomeVariants,homeCollectionSummary} from "../src/lib/home-discovery";
import type {Product,Variation} from "../src/lib/catalog";
const base={id:1,color:"6",color_label:"Brown",length:"45-50-cm",length_label:"45–50 cm",price:119,available:true,purchasable:true,image:""} satisfies Variation;
const product={variations:[base,{...base,id:2,color:"60",price:139},{...base,id:3,color:"60",length:"55-60-cm",price:140.25},{...base,id:4,color:"silver",price:1,available:false},{...base,id:5,color:"ash",price:0},{...base,id:6,color:"black",purchasable:false}]} as Product;
test("homepage summaries count only distinct available purchasable colors for that length",()=>{
 assert.deepEqual(homeCollectionSummary(product,"45-50-cm"),{colors:2,minPrice:119});
 assert.deepEqual(homeCollectionSummary(product,"55-60-cm"),{colors:1,minPrice:140.25});
 assert.deepEqual(homeCollectionSummary(undefined),{colors:0,minPrice:null});
 assert.deepEqual(availableHomeVariants(product,undefined,"60").map(v=>v.id),[2,3]);
});
