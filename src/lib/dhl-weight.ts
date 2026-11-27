export const DHL_UNIT_WEIGHT_G=25;
export const DHL_MAX_WEIGHT_G=31500;
export function productWeightG(lines:readonly {quantity:number}[]):number{
 if(!lines.length||lines.some(l=>!Number.isSafeInteger(l.quantity)||l.quantity<1))throw new Error("DHL_QUANTITY_INVALID");
 const total=lines.reduce((sum,l)=>sum+l.quantity*DHL_UNIT_WEIGHT_G,0);
 if(!Number.isSafeInteger(total)||total>DHL_MAX_WEIGHT_G)throw new Error("DHL_WEIGHT_INVALID");
 return total;
}
export function packageTareG(raw=process.env.RUBY_DHL_PACKAGING_WEIGHT_G):number|null{
 if(!raw||!/^\d{1,5}$/.test(raw))return null;
 const n=Number(raw);return n>0&&n<DHL_MAX_WEIGHT_G?n:null;
}
export function packageWeightG(lines:readonly {quantity:number}[],tare:number):number{
 const gross=productWeightG(lines)+tare;
 if(!Number.isSafeInteger(tare)||tare<1||gross>DHL_MAX_WEIGHT_G)throw new Error("DHL_WEIGHT_INVALID");
 return gross;
}
export function measuredPackageWeightG(lines:readonly {quantity:number}[],raw:unknown):number{
 if(typeof raw!=="string"||!/^\d{1,5}$/.test(raw))throw new Error("DHL_WEIGHT_INVALID");
 const gross=Number(raw);
 if(gross<=productWeightG(lines)||gross>DHL_MAX_WEIGHT_G)throw new Error("DHL_WEIGHT_INVALID");
 return gross;
}
