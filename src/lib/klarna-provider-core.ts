export type KlarnaPaymentCategory={identifier:string;name?:string};
export type KlarnaHppSession={session_id:string;redirect_url:string};
export type KlarnaHppStatus={session_id:string;status:string;order_id?:string};
export type KlarnaCapture={capture_id:string;captured_amount:number};
export class KlarnaProviderError extends Error{
 constructor(public readonly reason:string){super(reason);this.name="KlarnaProviderError";}
}
const uuid=/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i;
export function requireKlarnaUuid(value:string){if(!uuid.test(value))throw new KlarnaProviderError("KLARNA_INVALID_REFERENCE");return value}
export function requireKlarnaRedirect(value:string){
 const url=new URL(value);
 if(url.protocol!=="https:"||url.username||url.password||!["pay.klarna.com","www.pay.klarna.com"].includes(url.hostname))throw new KlarnaProviderError("KLARNA_UNSAFE_REDIRECT");
 return value;
}
export class KlarnaClient{
 constructor(private readonly username:string,private readonly password:string,private readonly base="https://api.klarna.com",private readonly send:typeof fetch=fetch){
  if(!username||!password||!["https://api.klarna.com","https://api.playground.klarna.com"].includes(base))throw new KlarnaProviderError("KLARNA_CONFIG_INVALID");
 }
 private async request<T>(method:string,path:string,body?:unknown,extraHeaders?:Record<string,string>):Promise<T>{
  const r=await this.send(this.base+path,{method,headers:{"Authorization":"Basic "+Buffer.from(this.username+":"+this.password).toString("base64"),"Accept":"application/json",...(body?{"Content-Type":"application/json"}:{}),...extraHeaders},body:body?JSON.stringify(body):undefined,cache:"no-store",redirect:"error",signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw new KlarnaProviderError("KLARNA_HTTP_"+r.status);
  if(r.status===204)return {} as T;
  return await r.json() as T;
 }
 async createPaymentSession(orderNumber:string){
  const result=await this.request<{session_id:string;payment_method_categories?:KlarnaPaymentCategory[]}>("POST","/payments/v1/sessions",{
   purchase_country:"DE",purchase_currency:"EUR",locale:"de-DE",order_amount:100,order_tax_amount:16,
   order_lines:[{type:"digital",reference:"RH-KLARNA-QA-"+orderNumber,name:"Interner Ruby Hair Zahlungstest (keine Warenlieferung)",quantity:1,unit_price:100,tax_rate:1900,total_amount:100,total_tax_amount:16}]
  });
  requireKlarnaUuid(result.session_id);
  return result;
 }
 async createHostedPage(paymentSessionId:string,returnBaseUrl:string){
  requireKlarnaUuid(paymentSessionId);
  if(!returnBaseUrl.startsWith("https://rubyhair.de/qa/klarna/return?"))throw new KlarnaProviderError("KLARNA_RETURN_INVALID");
  const end=returnBaseUrl.includes("&")?"&":"&";
  const result=await this.request<KlarnaHppSession>("POST","/hpp/v1/sessions",{
   payment_session_url:this.base+"/payments/v1/sessions/"+paymentSessionId,
   merchant_urls:{
    success:returnBaseUrl+end+"result=success&sid={{session_id}}&order_id={{order_id}}",
    cancel:returnBaseUrl+end+"result=cancel&sid={{session_id}}",
    back:returnBaseUrl+end+"result=back&sid={{session_id}}",
    failure:returnBaseUrl+end+"result=failure&sid={{session_id}}",
    error:returnBaseUrl+end+"result=error&sid={{session_id}}"
   },
   options:{place_order_mode:"PLACE_ORDER",payment_method_category:"pay_now"}
  });
  requireKlarnaUuid(result.session_id);
  requireKlarnaRedirect(result.redirect_url);
  return result;
 }
 async disableHostedPage(sessionId:string){
  await this.request("DELETE","/hpp/v1/sessions/"+requireKlarnaUuid(sessionId));
 }
 async readHostedPage(sessionId:string){
  const r=await this.request<KlarnaHppStatus>("GET","/hpp/v1/sessions/"+requireKlarnaUuid(sessionId));
  if(r.session_id!==sessionId)throw new KlarnaProviderError("KLARNA_HPP_MISMATCH");
  return r;
 }
 async readOrder(orderId:string){
  return this.request<{order_id:string;order_amount:number;purchase_currency:string;status?:string;captured_amount?:number}>("GET","/ordermanagement/v1/orders/"+requireKlarnaUuid(orderId));
 }
 async readCaptures(orderId:string){
  return this.request<{captures?:KlarnaCapture[]}|KlarnaCapture[]>("GET","/ordermanagement/v1/orders/"+requireKlarnaUuid(orderId)+"/captures");
 }
 async captureOneEuro(orderId:string,idempotencyKey:string){
  return this.request<{capture_id?:string}>("POST","/ordermanagement/v1/orders/"+requireKlarnaUuid(orderId)+"/captures",{captured_amount:100,description:"Ruby Hair interner 1 EUR Test ohne Warenlieferung",reference:"RH-ADMIN-QA"}, {"Klarna-Idempotency-Key":requireKlarnaUuid(idempotencyKey)});
 }
}
export function requireExactOneEuroCapture(raw:{captures?:KlarnaCapture[]}|KlarnaCapture[]){
 const rows=Array.isArray(raw)?raw:(raw.captures||[]);
 if(rows.length!==1||rows[0].captured_amount!==100||!uuid.test(rows[0].capture_id))throw new KlarnaProviderError("KLARNA_CAPTURE_NOT_VERIFIED");
 return rows[0].capture_id;
}
