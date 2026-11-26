// Only a canonical, matching, unapproved card order without any authorization/capture can be abandoned.
export function canAbandonCardOrder(raw:unknown,orderId:string,providerId:string,totalCents:number):boolean{
 const obj=(x:unknown):Record<string,unknown>|null=>x&&typeof x==="object"&&!Array.isArray(x)?x as Record<string,unknown>:null;
 const o=obj(raw);if(!o||o.id!==providerId||o.intent!=="CAPTURE"||!["CREATED","PAYER_ACTION_REQUIRED","VOIDED"].includes(String(o.status)))return false;
 const source=obj(o.payment_source),card=obj(source?.card),auth=obj(card?.authentication_result);
 if(!card||auth?.liability_shift==="POSSIBLE")return false;
 const units=o.purchase_units;if(!Array.isArray(units)||units.length!==1)return false;
 const u=obj(units[0]),amount=obj(u?.amount),payments=obj(u?.payments);
 if(u?.custom_id!==orderId||amount?.currency_code!=="EUR"||amount?.value!==(totalCents/100).toFixed(2))return false;
 if(u?.payments!=null&&!payments)return false;
 return [payments?.captures,payments?.authorizations].every(v=>v===undefined||(Array.isArray(v)&&v.length===0));
}
