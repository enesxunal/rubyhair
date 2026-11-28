import {createHash} from "node:crypto";
export const cancelHold="order_cancel_review";
type Local={testOnly:boolean;status:string;currency:string;totalCents:number;giftAppliedCents:number;trackingNumber:string|null;shippedAt:Date|null;deliveredAt:Date|null;paymentReference:string|null;fulfillmentNote:string|null;invoice:unknown;payments:unknown[];giftPurchases:unknown[];shippingJob:{status:string;trackingNumber:string|null;hasLabel:boolean}|null};
export function cancellationLocalReason(o:Local){
 if(o.testOnly||o.status!=="payment_authorized"||o.currency!=="EUR"||o.totalCents<=0||!o.paymentReference?.startsWith("KLARNA-HPP:")||!/^Klarna authorized: [0-9a-f-]{36}$/i.test(o.fulfillmentNote||""))return "NOT_UNCAPTURED_KLARNA";
 if(o.invoice||o.payments.length||o.giftAppliedCents||o.giftPurchases.length)return "PAYMENT_OR_GIFT_REVIEW";
 if(o.trackingNumber||o.shippedAt||o.deliveredAt||!o.shippingJob||o.shippingJob.trackingNumber||o.shippingJob.hasLabel||!["waiting_credentials","pickup_waiting","canceled",cancelHold].includes(o.shippingJob.status))return "SHIPPING_REVIEW";
 return null;
}
export function remoteCancellationState(o:{order_id:string;order_amount:number;purchase_currency:string;status?:string;captured_amount?:number;refunded_amount?:number},id:string,cents:number,captures:unknown[]){
 if(o.order_id!==id||o.order_amount!==cents||o.purchase_currency!=="EUR"||o.captured_amount!==0||o.refunded_amount!==undefined&&o.refunded_amount!==0||captures.length!==0)return "review";
 if(["CANCELLED","CANCELED"].includes(o.status||""))return "cancelled";
 if(o.status==="AUTHORIZED")return "authorized";
 return "review";
}
export function cancelIdempotencyKey(id:string){
 const h=createHash("sha256").update("rubyhair-order-cancel:"+id).digest("hex");
 return h.slice(0,8)+"-"+h.slice(8,12)+"-4"+h.slice(13,16)+"-a"+h.slice(17,20)+"-"+h.slice(20,32);
}
