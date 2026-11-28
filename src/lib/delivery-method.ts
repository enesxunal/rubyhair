export type DeliveryMethod="dhl"|"pickup";
export const pickupAddress="Klara Straße 19, 45130 Essen";
export function orderShippingCents(method:DeliveryMethod|undefined,physicalCount:number,standardCents:number){
 return physicalCount>0&&method!=="pickup"?standardCents:0;
}
export function deliveryJobStatus(method?:string){return method==="pickup"?"pickup_waiting":"waiting_credentials"}
