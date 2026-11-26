import "server-only";
import {getPrisma} from "@/lib/prisma";
import {providerForCheckout} from "@/lib/customer-checkout";
import {finishCapturedCustomerOrder} from "@/lib/customer-order-finalize";

const orderIdPattern=/^Klarna authorized: ([0-9a-f-]{36})$/i;
const captureIdPattern=/^[0-9a-f-]{36}$/i;

type Result={status:"captured_verified"|"authorized_only"|"not_reconciled"|"unavailable";localStatus:string;orderNumber:string;expectedCents:number;providerStatus:string|null;providerCapturedCents:number|null;captureCount:number;captureId:string|null;providerOrderId?:string;reason:string};

/** Purely read-only Klarna API checks. No payments, captures, refunds or updates. */
export async function inspectLiveKlarnaOrder(internalId:string):Promise<Result>{
 const order=await getPrisma().order.findUnique({where:{id:internalId},select:{id:true,testOnly:true,status:true,orderNumber:true,totalCents:true,paymentReference:true,fulfillmentNote:true}});
 if(!order||order.testOnly||!order.paymentReference?.startsWith("KLARNA-HPP:"))throw new Error("KLARNA_ORDER_NOT_FOUND");
 const baseline={localStatus:order.status,orderNumber:String(order.orderNumber),expectedCents:order.totalCents};
 try{
  const gateway=await providerForCheckout("klarna");
  const hpp=await gateway.api.readHostedPage(order.paymentReference.slice("KLARNA-HPP:".length));
  const stored=orderIdPattern.exec(order.fulfillmentNote||"");
  if(!["COMPLETE","COMPLETED"].includes(hpp.status)||!hpp.order_id||!captureIdPattern.test(hpp.order_id)||stored&&stored[1]!==hpp.order_id)
   return {status:"not_reconciled",...baseline,providerStatus:hpp.status,providerCapturedCents:null,captureCount:0,captureId:null,reason:"KLARNA_ORDER_ID_NOT_VERIFIED"};
  const providerOrderId=hpp.order_id;
  const [remote,raw]=await Promise.all([gateway.api.readOrder(providerOrderId),gateway.api.readCaptures(providerOrderId)]);
  const captures=Array.isArray(raw)?raw:raw.captures||[];
  const providerCaptured=typeof remote.captured_amount==="number"?remote.captured_amount:null;
  const exactOrder=remote.order_id===providerOrderId&&remote.order_amount===order.totalCents&&remote.purchase_currency==="EUR";
  const singleCapture=captures.length===1&&captures[0].captured_amount===order.totalCents&&captureIdPattern.test(captures[0].capture_id);
  const verified=exactOrder&&providerCaptured===order.totalCents&&singleCapture;
  const authorized=exactOrder&&(providerCaptured===0||providerCaptured===null)&&captures.length===0;
  return {status:verified?"captured_verified":authorized?"authorized_only":"not_reconciled",...baseline,
   providerStatus:remote.status||null,providerCapturedCents:providerCaptured,captureCount:captures.length,
   captureId:verified?captures[0].capture_id:null,providerOrderId,reason:!exactOrder?"KLARNA_REMOTE_ORDER_MISMATCH":verified?"KLARNA_CAPTURE_EXACT_MATCH":authorized?"KLARNA_NOT_CAPTURED":"KLARNA_CAPTURE_INCONSISTENT"};
 }catch(e){
  const code=e instanceof Error&&/^KLARNA_[A-Z0-9_]+$/.test(e.message)?e.message:"KLARNA_PROVIDER_READ_UNAVAILABLE";
  return {status:"unavailable",...baseline,providerStatus:null,providerCapturedCents:null,captureCount:0,captureId:null,reason:code};
 }
}

/** Reconcile an ALREADY-captured payment; this function never POSTs to Klarna. */
export async function reconcileVerifiedKlarnaCapture(internalId:string){
 const audit=await inspectLiveKlarnaOrder(internalId);
 if(audit.status!=="captured_verified"||!audit.captureId)throw new Error("KLARNA_CAPTURE_NOT_VERIFIED");
 const order=await getPrisma().order.findUnique({where:{id:internalId},select:{id:true,status:true,fulfillmentNote:true}});
 if(!order||!["payment_authorized","payment_confirmed"].includes(order.status))throw new Error("KLARNA_LOCAL_STATUS_REVIEW_REQUIRED");
 if(!audit.providerOrderId||!captureIdPattern.test(audit.providerOrderId))throw new Error("KLARNA_ORDER_ID_NOT_VERIFIED");
 return finishCapturedCustomerOrder(internalId,"klarna",audit.captureId,audit.providerOrderId);
}
