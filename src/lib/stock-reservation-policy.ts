// Only definitive, matching provider evidence may release an unpaid reservation.
// Expiry is a review deadline, not proof that a payment has failed.
export const STOCK_RESERVATION_MINUTES=30;
export const STOCK_RESERVATION_SWEEP_MINUTES=5;
export const reservationExpiresAt=(now=Date.now())=>new Date(now+STOCK_RESERVATION_MINUTES*60_000);
const object=(v:unknown):Record<string,unknown>|null=>v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:null;
export function paypalReservationReleasable(raw:unknown,orderId:string,reference:string,amountCents:number){
 const o=object(raw);if(!o||o.id!==reference||o.intent!=="CAPTURE"||o.status!=="VOIDED")return false;
 const units=o.purchase_units;if(!Array.isArray(units)||units.length!==1)return false;
 const u=object(units[0]),amount=object(u?.amount),payments=object(u?.payments);
 if(u?.custom_id!==orderId||amount?.currency_code!=="EUR"||amount?.value!==(amountCents/100).toFixed(2))return false;
 if(u?.payments!=null&&!payments)return false;
 return [payments?.captures,payments?.authorizations].every(v=>v===undefined||(Array.isArray(v)&&v.length===0));
}
export function klarnaReservationReleasable(raw:unknown,sessionId:string){
 const o=object(raw);return Boolean(o&&o.session_id===sessionId&&["CANCELLED","FAILED","EXPIRED"].includes(String(o.status))&&!o.order_id);
}
