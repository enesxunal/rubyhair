import "server-only";
import {loadPaymentValue} from "@/lib/payment-secrets";

const BASE="https://api-sandbox.dhl.com/parcel/de";
const MAX_PDF=5_000_000;

export class DhlSandboxTestError extends Error {
 constructor(public readonly phase:string,public readonly status:number){super(`DHL_SANDBOX_${phase}_${status}`);this.name="DhlSandboxTestError"}
}

/** Manual, no-charge DHL sandbox label. Never uses the live shipping endpoint,
 * real customer names, real billing number, or an actual order record. */
export async function createSandboxDhlTestLabel(send:typeof fetch=fetch):Promise<Uint8Array>{
 const [clientId,clientSecret]=await Promise.all([
  loadPaymentValue("dhl","live","clientId"),loadPaymentValue("dhl","live","clientSecret")
 ]);
 if(!clientId||!clientSecret)throw new DhlSandboxTestError("CREDENTIALS_MISSING",0);
 const body=new URLSearchParams({grant_type:"password",username:"user-valid",password:"SandboxPasswort2023!",
  client_id:clientId,client_secret:clientSecret});
 const tokenResponse=await send(`${BASE}/account/auth/ropc/v1/token`,{
  method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded",Accept:"application/json"},
  body:body.toString(),signal:AbortSignal.timeout(13000),redirect:"error",cache:"no-store"
 });
 if(!tokenResponse.ok)throw new DhlSandboxTestError("AUTH",tokenResponse.status);
 const tokenData=await tokenResponse.json() as {access_token?:string};
 if(!tokenData.access_token||tokenData.access_token.length<10)throw new DhlSandboxTestError("AUTH_RESPONSE",502);
 const shipDate=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 const payload={profile:"STANDARD_GRUPPENPROFIL",shipments:[{
  product:"V01PAK",billingNumber:"33333333330101",refNo:"RUBY-HAIR-SANDBOX-TEST",shipDate,
  shipper:{name1:"DHL Sandbox Musterabsender",addressStreet:"Charles-de-Gaulle-Strasse",addressHouse:"20",postalCode:"53113",city:"Bonn",country:"DEU"},
  consignee:{name1:"DHL Sandbox Musterempfaenger",addressStreet:"Straesschensweg",addressHouse:"2",postalCode:"53113",city:"Bonn",country:"DEU"},
  details:{weight:{uom:"kg",value:0.5}}
 }]};
 const headers={Authorization:`Bearer ${tokenData.access_token}`,"dhl-api-key":clientId,
  "Content-Type":"application/json",Accept:"application/json"};
 const endpoint=`${BASE}/shipping/v2/orders`;
 const validate=await send(`${endpoint}?validate=true`,{method:"POST",headers,body:JSON.stringify(payload),
  signal:AbortSignal.timeout(15000),redirect:"error",cache:"no-store"});
 if(!validate.ok)throw new DhlSandboxTestError("VALIDATE",validate.status);
 const checked=await validate.json() as {items?:{sstatus?:{status?:number};validationMessages?:{validationState?:string}[]}[]};
 if(checked.items?.length!==1||checked.items[0].sstatus?.status!==200||
  checked.items[0].validationMessages?.some(v=>v.validationState==="Error"))
  throw new DhlSandboxTestError("VALIDATE_ITEM",422);
 const labelResponse=await send(`${endpoint}?docFormat=PDF&includeDocs=include`,{
  method:"POST",headers,body:JSON.stringify(payload),signal:AbortSignal.timeout(15000),redirect:"error",cache:"no-store"
 });
 if(!labelResponse.ok)throw new DhlSandboxTestError("LABEL",labelResponse.status);
 const output=await labelResponse.json() as {items?:{label?:{b64?:string};sstatus?:{status?:number}}[]};
 const encoded=output.items?.[0]?.label?.b64;
 if(output.items?.length!==1||!encoded||encoded.length>MAX_PDF*2)
  throw new DhlSandboxTestError("LABEL_RESPONSE",502);
 const pdf=Buffer.from(encoded,"base64");
 if(pdf.length<150||pdf.length>MAX_PDF||pdf.subarray(0,5).toString()!=="%PDF-")
  throw new DhlSandboxTestError("LABEL_PDF_INVALID",502);
 return new Uint8Array(pdf);
}
