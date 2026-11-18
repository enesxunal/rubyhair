import "server-only";
import {getPrisma} from "@/lib/prisma";
import {providerForCheckout} from "@/lib/customer-checkout";
import {euroToCents} from "@/lib/paypal-provider-core";

const klarnaOrder=/^Klarna authorized: ([0-9a-f-]{36})$/i;
type Outcome={state:"provider_verified"|"possible_refund"|"review_required"|"provider_unavailable";provider:"paypal"|"klarna"|null;providerStatus:string|null;capturedCents:number|null;refundedCents:number|null;reason:string};
/** Provider GET only. No POST financial operations, no order or stock mutations. */
export async function readCustomerRefundStatus(orderId:string):Promise<Outcome>{
 const order=await getPrisma().order.findUnique({where:{id:orderId},select:{id:true,testOnly:true,status:true,totalCents:true,paymentReference:true,fulfillmentNote:true,payments:{select:{provider:true,eventType:true,providerEventId:true}}}});
 if(!order||order.testOnly)return {state:"review_required",provider:null,providerStatus:null,capturedCents:null,refundedCents:null,reason:"CUSTOMER_ORDER_NOT_FOUND"};
 const events=order.payments.filter(e=>e.eventType==="PAYMENT.CAPTURE.COMPLETED"&&(e.provider==="paypal"||e.provider==="klarna"));
 if(events.length!==1||!order.paymentReference)return {state:"review_required",provider:null,providerStatus:null,capturedCents:null,refundedCents:null,reason:"VERIFIED_CAPTURE_RECORD_MISSING"};
 const ev=events[0],provider=ev.provider as "paypal"|"klarna";
 try{
  if(provider==="paypal"){
   const gateway=await providerForCheckout("paypal");
   const result=await gateway.api.getCapture(ev.providerEventId) as {id?:string;status?:string;amount?:{currency_code?:string;value?:string}};
   if(result.id!==ev.providerEventId||result.amount?.currency_code!=="EUR"||!result.amount.value||euroToCents(result.amount.value)!==order.totalCents)
    return {state:"review_required",provider,providerStatus:result.status||null,capturedCents:null,refundedCents:null,reason:"PAYPAL_CAPTURE_TOTAL_MISMATCH"};
   return {state:result.status==="COMPLETED"?"provider_verified":"possible_refund",provider,providerStatus:result.status||null,capturedCents:order.totalCents,refundedCents:null,
    reason:result.status==="COMPLETED"?"CAPTURE_EXISTS_REFUND_NOT_CONFIRMED":"REFUND_STATUS_REQUIRES_PROVIDER_ID"};
  }
  const match=klarnaOrder.exec(order.fulfillmentNote||"");
  if(!match)return {state:"review_required",provider,providerStatus:null,capturedCents:null,refundedCents:null,reason:"KLARNA_ORDER_REFERENCE_UNVERIFIED"};
  const gateway=await providerForCheckout("klarna");
  const result=await gateway.api.readOrder(match[1]);
  if(result.order_id!==match[1]||result.order_amount!==order.totalCents||result.purchase_currency!=="EUR")
   return {state:"review_required",provider,providerStatus:result.status||null,capturedCents:null,refundedCents:null,reason:"KLARNA_ORDER_TOTAL_MISMATCH"};
  const refunded=typeof result.refunded_amount==="number"&&Number.isSafeInteger(result.refunded_amount)?result.refunded_amount:null;
  const captured=typeof result.captured_amount==="number"&&Number.isSafeInteger(result.captured_amount)?result.captured_amount:null;
  if(captured===null||captured<0||captured>order.totalCents||refunded!==null&&(refunded<0||refunded>captured))
   return {state:"review_required",provider,providerStatus:result.status||null,capturedCents:captured,refundedCents:refunded,reason:"KLARNA_CAPTURE_REFUND_INCONSISTENT"};
  return {state:refunded===null?"review_required":refunded>0?"possible_refund":"provider_verified",provider,providerStatus:result.status||null,capturedCents:captured,refundedCents:refunded,
   reason:refunded===null?"REFUND_AMOUNT_UNAVAILABLE":refunded>0?"REFUND_RECORDED_REQUIRES_RECONCILIATION":"NO_PROVIDER_REFUND_RECORDED"};
 }catch(e){return {state:"provider_unavailable",provider,providerStatus:null,capturedCents:null,refundedCents:null,
   reason:e instanceof Error?e.name:"PROVIDER_UNAVAILABLE"};}
}
