/** Card Fields v6: SDK submit may succeed before GET /orders reports APPROVED.
 * Limited to one admin-only, fixed EUR 1.00 internal test. PayPal capture remains
 * authoritative and idempotent. Never use this policy in the public checkout. */
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==="object"&&!Array.isArray(value);
export type QaCaptureCheck={ok:true;providerStatus:"CREATED"|"APPROVED"}|{ok:false;reason:string};
export function assessOneEuroCardCapture(remote:unknown,orderId:string,paypalOrderId:string,sdkLiabilityShift:unknown):QaCaptureCheck{
 if(!record(remote)||remote.id!==paypalOrderId)return {ok:false,reason:"PAYPAL_ORDER_UNVERIFIED"};
 if(!Array.isArray(remote.purchase_units)||remote.purchase_units.length!==1)return {ok:false,reason:"PAYPAL_UNITS_MISMATCH"};
 const unit:unknown=remote.purchase_units[0];
 if(!record(unit)||unit.custom_id!==orderId||!record(unit.amount)||unit.amount.currency_code!=="EUR"||unit.amount.value!=="1.00")
  return {ok:false,reason:"PAYPAL_AMOUNT_MISMATCH"};
 const payments=record(unit.payments)?unit.payments:null;
 if(payments&&Array.isArray(payments.captures)&&payments.captures.length>0)return {ok:false,reason:"EXISTING_CAPTURE_REQUIRES_RECONCILIATION"};
 const source=record(remote.payment_source)?remote.payment_source:null;
 const card=source&&record(source.card)?source.card:null;
 if(!card)return {ok:false,reason:"PAYPAL_CARD_SOURCE_UNVERIFIED"};
 const authentication=record(card.authentication_result)?card.authentication_result:null;
 if(authentication&&authentication.liability_shift!=="POSSIBLE")return {ok:false,reason:"CARD_3DS_REQUIRES_REVIEW"};
 if(sdkLiabilityShift!=="POSSIBLE")return {ok:false,reason:"CARD_SDK_3DS_REQUIRES_REVIEW"};
 if(remote.status==="APPROVED")return {ok:true,providerStatus:"APPROVED"};
 // PayPal SDK v6's on-submit succeeded flow instructs calling capture directly.
 // In this fixed, merchant-only EUR 1 QA, CREATED with verified card funding can
 // proceed once, but only PayPal's capture response may declare payment completed.
 if(remote.status==="CREATED")return {ok:true,providerStatus:"CREATED"};
 return {ok:false,reason:"PAYPAL_NOT_APPROVED"};
}
