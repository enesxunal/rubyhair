import {test} from "node:test";
import assert from "node:assert/strict";
import {buyableVariant,initialProductVariant,variantAfterColorChange,remainingCartStock} from "../src/lib/product-selection";
import type {Variation} from "../src/lib/catalog";
const v={id:1,color:"ruby",color_label:"Ruby",length:"45-50-cm",length_label:"45–50 cm",price:119,available:false,purchasable:true,image:"",stock_quantity:0} satisfies Variation;
const a={...v,id:2,color:"6",available:true,stock_quantity:5};
const b={...a,id:3,length:"55-60-cm",price:140.25};
const c={...a,id:4,color:"60",length:"55-60-cm",stock_quantity:2};
test("default picks purchasable stock; an explicit unavailable color stays visible instead of silently buying another color",()=>{
 assert.equal(initialProductVariant([v,a,b,c])?.id,2);
 assert.equal(initialProductVariant([v,a,b,c],undefined,"55-60-cm")?.id,3);
 assert.equal(initialProductVariant([v,a,b,c],"ruby","45-50-cm")?.id,1);
 assert.equal(initialProductVariant([v,a,b,c],"6","55-60-cm")?.id,3);
});
test("changing color retains current length whenever available",()=>{
 assert.equal(variantAfterColorChange([a,b],"55-60-cm")?.id,3);
 assert.equal(variantAfterColorChange([c],"45-50-cm")?.id,4);
});
test("remaining stock respects existing cart quantity and rejects unavailable variants",()=>{
 assert.equal(remainingCartStock(a,3),2);
 assert.equal(remainingCartStock(a,5),0);
 assert.equal(remainingCartStock(v,0),0);
 assert.equal(remainingCartStock({...a,stock_quantity:null},98),1);
 assert.equal(buyableVariant({...a,stock_quantity:0}),false);
});
