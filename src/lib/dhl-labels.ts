import "server-only";
import {loadPaymentValue} from "@/lib/payment-secrets";
import {buildDhlTokenRequest,type DhlCredentials} from "@/lib/dhl-auth-contract";
import {RUBY_TEST_SELLER} from "@/lib/qa-invoice";

export class DhlShipmentError extends Error{constructor(public readonly reason:string){super(reason);this.name="DhlShipmentError"}}
export type ShippingAddress={firstName:string;lastName:string;street:string;postalCode:string;city:string;country:"DE"};

export function buildDhlShipmentBody(input:{billingNumber:string;orderNumber:string;recipient:ShippingAddress;weightG:number;shipDate:string}){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(input.shipDate)||!/^\d{5}$/.test(input.recipient.postalCode)||
  input.recipient.country!=="DE"||!Number.isSafeInteger(input.weightG)||input.weightG<1||input.weightG>31500||
  !/^[a-zA-Z0-9]{10,15}$/.test(input.billingNumber))throw new DhlShipmentError("DHL_SHIPMENT_INPUT_INVALID");
 return {profile:"STANDARD_GRUPPENPROFIL",shipments:[{
  product:"V01PAK",billingNumber:input.billingNumber,refNo:"RH-"+input.orderNumber,
  shipDate:input.shipDate,
  shipper:{name1:RUBY_TEST_SELLER.name.slice(0,50),addressStreet:RUBY_TEST_SELLER.street.slice(0,50),
   postalCode:RUBY_TEST_SELLER.postalCode,city:RUBY_TEST_SELLER.city,country:"DEU",email:RUBY_TEST_SELLER.email},
  consignee:{name1:(input.recipient.firstName+" "+input.recipient.lastName).slice(0,50),
   addressStreet:input.recipient.street.slice(0,50),postalCode:input.recipient.postalCode,
   city:input.recipient.city.slice(0,40),country:"DEU"},
  details:{weight:{uom:"g",value:input.weightG}}
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
 const headers={Authorization:"Bearer "+token.access_token,"dhl-api-key":creds.clientId,
  "Content-Type":"application/json",Accept:"application/json"};
 const dry=await send(root+"?validate=true",{method:"POST",headers,body:JSON.stringify(payload),redirect:"error",signal:AbortSignal.timeout(13000)});
 if(!dry.ok)throw new DhlShipmentError("DHL_DRY_RUN_REJECTED_"+dry.status);
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
