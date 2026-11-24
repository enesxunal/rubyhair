import "server-only";
import {loadPaymentValue} from "@/lib/payment-secrets";
import {buildDhlTokenRequest,type DhlCredentials} from "@/lib/dhl-auth-contract";
import {RUBY_TEST_SELLER} from "@/lib/qa-invoice";

export class DhlShipmentError extends Error{constructor(public readonly reason:string){super(reason);this.name="DhlShipmentError"}}
export type ShippingAddress={firstName:string;lastName:string;street:string;postalCode:string;city:string;country:"DE"};

// The DHL API has separate street and house number fields. Checkout stores a
// single street string; reject unusual formats rather than silently mislabel.
export function splitGermanStreetAddress(full:string){
 const match=/^(.{2,90}?)\s+(\d+[a-zA-Z]?(?:[-/]\d+[a-zA-Z]?)?)$/.exec(full.trim());
 if(!match)throw new DhlShipmentError("DHL_HOUSE_NUMBER_REQUIRES_REVIEW");
 return {addressStreet:match[1].slice(0,50),addressHouse:match[2]};
}

export function buildDhlShipmentBody(input:{billingNumber:string;orderNumber:string;recipient:ShippingAddress;weightG:number;shipDate:string}){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(input.shipDate)||!/^\d{5}$/.test(input.recipient.postalCode)||
  input.recipient.country!=="DE"||!Number.isSafeInteger(input.weightG)||input.weightG<1||input.weightG>31500||
  !/^[0-9]{10}01[A-Za-z0-9]{2}$/.test(input.billingNumber))throw new DhlShipmentError("DHL_SHIPMENT_INPUT_INVALID");
 const shipperStreet=splitGermanStreetAddress(RUBY_TEST_SELLER.street);
 const recipientStreet=splitGermanStreetAddress(input.recipient.street);
 return {profile:"STANDARD_GRUPPENPROFIL",shipments:[{
  product:"V01PAK",billingNumber:input.billingNumber,refNo:("RH-"+input.orderNumber).padStart(8,"0").slice(0,35),
  shipDate:input.shipDate,
  shipper:{name1:RUBY_TEST_SELLER.name.slice(0,50),...shipperStreet,
   postalCode:RUBY_TEST_SELLER.postalCode,city:RUBY_TEST_SELLER.city,country:"DEU",email:RUBY_TEST_SELLER.email},
  consignee:{name1:(input.recipient.firstName+" "+input.recipient.lastName).slice(0,50),
   ...recipientStreet,postalCode:input.recipient.postalCode,
   city:input.recipient.city.slice(0,40),country:"DEU"},
  services:{goGreenPlus:true},
  details:{weight:{uom:"kg",value:input.weightG/1000}}
 }]};
}

async function credentials():Promise<DhlCredentials>{
 const fields=["clientId","clientSecret","username","password","accountNumber","billingNumber"] as const;
 const parts=await Promise.all(fields.map(f=>loadPaymentValue("dhl","live",f)));
 if(parts.some(x=>!x))throw new DhlShipmentError("DHL_CREDENTIALS_MISSING");
 return Object.fromEntries(fields.map((f,i)=>[f,parts[i]])) as DhlCredentials;
}

export async function createDhlShipmentLabel(input:{orderNumber:string;recipient:ShippingAddress},send:typeof fetch=fetch){
 if(process.env.RUBY_DHL_LIVE_LABELS_ENABLED!=="true")throw new DhlShipmentError("DHL_LABEL_CREATION_DISABLED");
 if(process.env.RUBY_DHL_SENDER_APPROVED!=="true")throw new DhlShipmentError("DHL_SENDER_NOT_APPROVED");
 const raw=process.env.RUBY_DHL_WEIGHT_G||"";
 if(!/^[1-9]\d{0,4}$/.test(raw))throw new DhlShipmentError("DHL_WEIGHT_NOT_CONFIGURED");
 const weightG=Number(raw),creds=await credentials();
 const date=new Intl.DateTimeFormat("en-CA",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Europe/Berlin"}).format(new Date());
 const payload=buildDhlShipmentBody({billingNumber:creds.billingNumber,orderNumber:input.orderNumber,recipient:input.recipient,weightG,shipDate:date});
 const auth=buildDhlTokenRequest("live",creds);
 const authResponse=await send(auth.url,{...auth.init,signal:AbortSignal.timeout(11000),redirect:"error"});
 if(!authResponse.ok)throw new DhlShipmentError("DHL_AUTH_FAILED");
 const token=await authResponse.json() as {access_token?:string};
 if(!token.access_token||token.access_token.length<10)throw new DhlShipmentError("DHL_AUTH_INVALID");
 const root="https://api-eu.dhl.com/parcel/de/shipping/v2/orders";
 const headers={Authorization:"Bearer "+token.access_token,
  "Content-Type":"application/json",Accept:"application/json"};
 const dry=await send(root+"?validate=true",{method:"POST",headers,body:JSON.stringify(payload),redirect:"error",signal:AbortSignal.timeout(13000)});
 if(!dry.ok)throw new DhlShipmentError("DHL_DRY_RUN_REJECTED_"+dry.status);
 const dryResponse=await dry.json() as {items?:{sstatus?:{status?:number};validationMessages?:{validationState?:string}[]}[]};
 if(!dryResponse.items||dryResponse.items.length!==1||dryResponse.items[0].sstatus?.status!==200||
    dryResponse.items[0].validationMessages?.some(m=>m.validationState==="Error"))
  throw new DhlShipmentError("DHL_DRY_RUN_ITEM_INVALID");
 // A successful live label creation can incur carrier charges. Call only from
 // the separately enabled, claimed, provider-verified fulfillment worker.
 const res=await send(root+"?includeDocs=include&docFormat=PDF",{
  method:"POST",headers,body:JSON.stringify(payload),redirect:"error",signal:AbortSignal.timeout(16000)
 });
 if(!res.ok)throw new DhlShipmentError("DHL_LABEL_REQUEST_NEEDS_REVIEW_"+res.status);
 const data=await res.json() as {items?:{shipmentNo?:string;sstatus?:{status?:number;statusCode?:number};label?:{b64?:string}}[]};
 if(!data.items||data.items.length!==1)throw new DhlShipmentError("DHL_LABEL_RESPONSE_NEEDS_REVIEW");
 const item=data.items[0],tracking=item.shipmentNo||"";
 const pdf=item.label?.b64?Buffer.from(item.label.b64,"base64"):null;
 if(!/^\d{12,36}$/.test(tracking)||!pdf||pdf.length<150||pdf.length>5000000||pdf.subarray(0,5).toString()!=="%PDF-")
  throw new DhlShipmentError("DHL_LABEL_RESPONSE_NEEDS_REVIEW");
 return {trackingNumber:tracking,labelPdf:pdf};
}

/** Validate the known Ruby Hair sender and 500g template without booking postage.
 * The validate=true DHL endpoint is distinct from the chargeable POST /orders.
 */
export async function validateDhlLiveTemplateOnly(send:typeof fetch=fetch):Promise<"valid"|"unauthorized"|"rejected"|"unavailable">{
 if(process.env.RUBY_DHL_WEIGHT_G!=="500")return "unavailable";
 try{
  const creds=await credentials();
  const auth=buildDhlTokenRequest("live",creds);
  const response=await send(auth.url,{...auth.init,signal:AbortSignal.timeout(11000),redirect:"error"});
  if(response.status===401||response.status===403)return "unauthorized";
  if(!response.ok)return "unavailable";
  const result=await response.json() as {access_token?:string};
  if(!result.access_token)return "unavailable";
  const day=new Intl.DateTimeFormat("en-CA",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Europe/Berlin"}).format(new Date());
  const payload=buildDhlShipmentBody({billingNumber:creds.billingNumber,orderNumber:"VALIDATE-ONLY",
    recipient:{firstName:"Ruby",lastName:"Hair",street:RUBY_TEST_SELLER.street,
      postalCode:RUBY_TEST_SELLER.postalCode,city:RUBY_TEST_SELLER.city,country:"DE"},
    weightG:500,shipDate:day});
  const url="https://api-eu.dhl.com/parcel/de/shipping/v2/orders?validate=true";
  const dry=await send(url,{method:"POST",headers:{Authorization:"Bearer "+result.access_token,
    "Content-Type":"application/json",Accept:"application/json"},
    body:JSON.stringify(payload),redirect:"error",signal:AbortSignal.timeout(13000)});
  // Log only protocol status and validated field names, never body values,
  // shipment addresses, credentials, tokens or arbitrary provider messages.
  const body=await dry.json() as {items?:{sstatus?:{status?:number;statusCode?:number};
    validationMessages?:{property?:string;validationState?:string;validationMessage?:string}[]}[];title?:string;status?:number};
  const valid=dry.ok&&body.items?.length===1&&body.items[0].sstatus?.status===200&&
    !body.items[0].validationMessages?.some(m=>m.validationState==="Error");
  if(!valid){
    const fields=(body.items||[]).flatMap(i=>i.validationMessages||[])
      .map(m=>(m.property||"").replace(/[^a-zA-Z0-9_.\/:-]/g,"").slice(0,75)).filter(Boolean).slice(0,8);
    console.warn("RUBY_DHL_VALIDATE_ONLY_REJECTED",JSON.stringify({http:dry.status,
      itemStatuses:(body.items||[]).map(i=>i.sstatus?.status).slice(0,3),
      providerStatusCodes:(body.items||[]).map(i=>i.sstatus?.statusCode).slice(0,3),
      fields,goGreenDetails:(body.items||[]).flatMap(i=>i.validationMessages||[]).filter(m=>m.property==="services.goGreenPlus").map(m=>(m.validationMessage||"").replace(/\d{4,}/g,"[redacted]").slice(0,220)).slice(0,3),hasItems:Boolean(body.items?.length)}));
  }
  return valid?"valid":dry.status===401||dry.status===403?"unauthorized":dry.status>=500?"unavailable":"rejected";
 }catch{return "unavailable"}
}
