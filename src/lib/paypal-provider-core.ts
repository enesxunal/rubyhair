
/** PayPal Orders v2 adapter. No customer payment calls until checkout and
 * provider account are explicitly enabled. All secrets remain server-side. */
export type PaypalEnvironment="sandbox"|"live";
export type PaypalCredentials={clientId:string;clientSecret:string;webhookId:string};
export type PaypalMoney={currency_code:"EUR";value:string};
export type PaypalCreateInput={
  orderId:string;invoiceId:string;totalCents:number;shippingCents:number;
  returnUrl:string;cancelUrl:string;requestId:string;
  shipping:{fullName:string;street:string;postalCode:string;city:string;country:"DE"};
};
export type PaypalOrderResult={id:string;approvalUrl:string};
export type PaypalCaptureResult={id:string;status:"COMPLETED";captureId:string;amountCents:number;customId:string};
const hosts:{[key in PaypalEnvironment]:string}={
  sandbox:"https://api-m.sandbox.paypal.com",live:"https://api-m.paypal.com"
};
export class PaypalError extends Error{
  constructor(public readonly code:string){super(code);this.name="PaypalError";}
}
export const centsToEuro=(value:number):string=>{
  if(!Number.isSafeInteger(value)||value<0||value>2147483647)throw new PaypalError("INVALID_AMOUNT");
  return (value/100).toFixed(2);
};
export const euroToCents=(value:string):number=>{
  if(!/^(0|[1-9][0-9]{0,8})\.[0-9]{2}$/.test(value))throw new PaypalError("INVALID_AMOUNT");
  const [whole,cents]=value.split(".").map(Number);
  const total=whole*100+cents;
  if(!Number.isSafeInteger(total)||total>2147483647)throw new PaypalError("INVALID_AMOUNT");
  return total;
};
function checkId(value:string,max=127,min=8):string{
  if(!/^[A-Za-z0-9_-]+$/.test(value)||value.length<min||value.length>max)
    throw new PaypalError("INVALID_ID");
  return value;
}
function httpsUrl(value:string):string{
  try{
    const u=new URL(value);
    if(u.protocol!=="https:"||u.username||u.password||u.hash||u.port)throw Error();
    if(u.hostname!=="rubyhair.de"&&u.hostname!=="www.rubyhair.de"&&u.hostname!=="rubyhair.vercel.app"&&u.hostname!=="localhost")throw Error();
    return u.toString();
  }catch{throw new PaypalError("INVALID_REDIRECT_URL");}
}
function isObject(value:unknown):value is Record<string,unknown>{return Boolean(value)&&typeof value==="object"&&!Array.isArray(value);}
async function safeJson(response:Response):Promise<unknown>{
  try{return await response.json()}catch{throw new PaypalError("PAYPAL_INVALID_RESPONSE");}
}
export class PaypalClient{
  constructor(private readonly env:PaypalEnvironment,private readonly creds:PaypalCredentials,private readonly transport:typeof fetch=fetch){
    if(!creds.clientId||!creds.clientSecret||!creds.webhookId)throw new PaypalError("PAYPAL_CREDENTIALS_INCOMPLETE");
  }
  async token():Promise<string>{
    const basic=Buffer.from(this.creds.clientId+":"+this.creds.clientSecret).toString("base64");
    let response:Response;
    try{response=await this.transport(hosts[this.env]+"/v1/oauth2/token",{
      method:"POST",headers:{Authorization:"Basic "+basic,"Content-Type":"application/x-www-form-urlencoded"},
      body:"grant_type=client_credentials",redirect:"error",signal:AbortSignal.timeout(10000)
    });}catch{throw new PaypalError("PAYPAL_AUTH_UNAVAILABLE");}
    if(!response.ok)throw new PaypalError("PAYPAL_AUTH_REJECTED");
    const payload=await safeJson(response);
    if(!isObject(payload)||typeof payload.access_token!=="string"||payload.access_token.length<12)
      throw new PaypalError("PAYPAL_AUTH_INVALID");
    return payload.access_token;
  }
  private async api(method:"POST"|"GET",path:string,body?:unknown,requestId?:string):Promise<unknown>{
    const token=await this.token();
    const headers:Record<string,string>={Authorization:"Bearer "+token,Accept:"application/json"};
    if(body!==undefined)headers["Content-Type"]="application/json";
    if(requestId)headers["PayPal-Request-Id"]=checkId(requestId);
    let response:Response;
    try{response=await this.transport(hosts[this.env]+path,{
      method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:"error",signal:AbortSignal.timeout(13000)
    });}catch{throw new PaypalError("PAYPAL_NETWORK_UNAVAILABLE");}
    if(!response.ok)throw new PaypalError("PAYPAL_REQUEST_FAILED_"+response.status);
    return safeJson(response);
  }
  async createOrder(input:PaypalCreateInput):Promise<PaypalOrderResult>{
    const orderId=checkId(input.orderId,60),invoiceId=checkId(input.invoiceId,50,3);
    checkId(input.requestId);
    const total=centsToEuro(input.totalCents),shipping=centsToEuro(input.shippingCents);
    const address=input.shipping;
    if(!address||address.country!=="DE"||!/^[0-9]{5}$/.test(address.postalCode)||
      ![address.fullName,address.street,address.city].every(v=>typeof v==="string"&&v.trim().length>=2&&v.length<=120))
      throw new PaypalError("INVALID_SHIPPING_ADDRESS");
    if(input.totalCents<=0||input.shippingCents>input.totalCents)throw new PaypalError("INVALID_AMOUNT");
    const data=await this.api("POST","/v2/checkout/orders",{
      intent:"CAPTURE",
      purchase_units:[{reference_id:orderId,custom_id:orderId,invoice_id:invoiceId,
        shipping:{name:{full_name:address.fullName.trim()},address:{
          address_line_1:address.street.trim(),admin_area_2:address.city.trim(),
          postal_code:address.postalCode,country_code:"DE"
        }},
        amount:{currency_code:"EUR",value:total,breakdown:{
          item_total:{currency_code:"EUR",value:centsToEuro(input.totalCents-input.shippingCents)},
          shipping:{currency_code:"EUR",value:shipping}
        }}}],
      payment_source:{paypal:{experience_context:{brand_name:"Ruby Hair",user_action:"PAY_NOW",landing_page:"GUEST_CHECKOUT",
        shipping_preference:"SET_PROVIDED_ADDRESS",return_url:httpsUrl(input.returnUrl),cancel_url:httpsUrl(input.cancelUrl)}}}
    },input.requestId);
    if(!isObject(data)||typeof data.id!=="string"||!Array.isArray(data.links))throw new PaypalError("PAYPAL_ORDER_INVALID");
    const approve=data.links.find((link:unknown)=>isObject(link)&&
      (link.rel==="payer-action"||link.rel==="approve")&&typeof link.href==="string");
    if(!isObject(approve)||typeof approve.href!=="string")throw new PaypalError("PAYPAL_APPROVAL_MISSING");
    const u=new URL(approve.href);
    if(u.protocol!=="https:"||!(["www.paypal.com","www.sandbox.paypal.com"].includes(u.hostname))||u.username||u.password)
      throw new PaypalError("PAYPAL_UNTRUSTED_REDIRECT");
    if(this.env==="sandbox"&&u.hostname!=="www.sandbox.paypal.com")throw new PaypalError("PAYPAL_WRONG_ENVIRONMENT");
    if(this.env==="live"&&u.hostname!=="www.paypal.com")throw new PaypalError("PAYPAL_WRONG_ENVIRONMENT");
    return {id:checkId(data.id,60),approvalUrl:u.toString()};
  }
  /** Create an unapproved PayPal order for PayPal-hosted Card Fields v6.
   * Card data is never sent to Ruby Hair; the browser SDK handles PCI and 3DS. */
  async createCardOrder(input:PaypalCreateInput):Promise<{id:string}>{
    const orderId=checkId(input.orderId,60),invoiceId=checkId(input.invoiceId,50,3);
    checkId(input.requestId);
    const total=centsToEuro(input.totalCents),shipping=centsToEuro(input.shippingCents);
    const address=input.shipping;
    if(!address||address.country!=="DE"||!/^[0-9]{5}$/.test(address.postalCode)||
      ![address.fullName,address.street,address.city].every(v=>typeof v==="string"&&v.trim().length>=2&&v.length<=120))
      throw new PaypalError("INVALID_SHIPPING_ADDRESS");
    if(input.totalCents<=0||input.shippingCents>input.totalCents)throw new PaypalError("INVALID_AMOUNT");
    const data=await this.api("POST","/v2/checkout/orders",{
      intent:"CAPTURE",
      purchase_units:[{reference_id:orderId,custom_id:orderId,invoice_id:invoiceId,
        shipping:{name:{full_name:address.fullName.trim()},address:{
          address_line_1:address.street.trim(),admin_area_2:address.city.trim(),
          postal_code:address.postalCode,country_code:"DE"
        }},
        amount:{currency_code:"EUR",value:total,breakdown:{
          item_total:{currency_code:"EUR",value:centsToEuro(input.totalCents-input.shippingCents)},
          shipping:{currency_code:"EUR",value:shipping}
        }}}
      ],
      payment_source:{card:{
        attributes:{verification:{method:"SCA_ALWAYS"}},
        experience_context:{return_url:httpsUrl(input.returnUrl),cancel_url:httpsUrl(input.cancelUrl)}
      }}
    },input.requestId);
    if(!isObject(data)||typeof data.id!=="string")throw new PaypalError("PAYPAL_ORDER_INVALID");
    return {id:checkId(data.id,60)};
  }
  /** Orders v2 wallet session: payer authorization is attached ONLY by PayPal's wallet SDK. */
  async createWalletOrder(input:PaypalCreateInput):Promise<{id:string}>{
    const orderId=checkId(input.orderId,60),invoiceId=checkId(input.invoiceId,50,3);
    checkId(input.requestId);httpsUrl(input.returnUrl);httpsUrl(input.cancelUrl);
    const total=centsToEuro(input.totalCents),shipping=centsToEuro(input.shippingCents);
    const address=input.shipping;
    if(!address||address.country!=="DE"||!/^[0-9]{5}$/.test(address.postalCode)||
      ![address.fullName,address.street,address.city].every(v=>typeof v==="string"&&v.trim().length>=2&&v.length<=120))
      throw new PaypalError("INVALID_SHIPPING_ADDRESS");
    if(input.totalCents<=0||input.shippingCents>input.totalCents)throw new PaypalError("INVALID_AMOUNT");
    const data=await this.api("POST","/v2/checkout/orders",{
      intent:"CAPTURE",
      purchase_units:[{reference_id:orderId,custom_id:orderId,invoice_id:invoiceId,
        shipping:{name:{full_name:address.fullName.trim()},address:{
          address_line_1:address.street.trim(),admin_area_2:address.city.trim(),
          postal_code:address.postalCode,country_code:"DE"}},
        amount:{currency_code:"EUR",value:total,breakdown:{
          item_total:{currency_code:"EUR",value:centsToEuro(input.totalCents-input.shippingCents)},
          shipping:{currency_code:"EUR",value:shipping}
        }}}]
    },input.requestId);
    if(!isObject(data)||typeof data.id!=="string")throw new PaypalError("PAYPAL_ORDER_INVALID");
    return {id:checkId(data.id,60)};
  }
  /** SDK v6 browser-safe client token, short-lived and never logged or cached. */
  async browserClientToken():Promise<string>{
    const basic=Buffer.from(this.creds.clientId+":"+this.creds.clientSecret).toString("base64");
    let response:Response;
    try{response=await this.transport(hosts[this.env]+"/v1/oauth2/token",{
      method:"POST",headers:{Authorization:"Basic "+basic,"Content-Type":"application/x-www-form-urlencoded"},
      body:"grant_type=client_credentials&response_type=client_token&intent=sdk_init",
      redirect:"error",signal:AbortSignal.timeout(10000)
    });}catch{throw new PaypalError("PAYPAL_CLIENT_TOKEN_UNAVAILABLE");}
    if(!response.ok)throw new PaypalError("PAYPAL_CLIENT_TOKEN_REJECTED");
    const payload=await safeJson(response);
    if(!isObject(payload)||typeof payload.access_token!=="string"||payload.access_token.length<12)
      throw new PaypalError("PAYPAL_CLIENT_TOKEN_INVALID");
    return payload.access_token;
  }
  /** Read both the canonical order (status/captures) and expanded card funding.
   * PayPal's fields=payment_source projection can OMIT status/purchase_units.
   * Never infer capture completion from a projection-only response. READ ONLY. */
  async getOrderWithPaymentSource(id:string):Promise<unknown>{
    const safeId=checkId(id,60),path="/v2/checkout/orders/"+safeId;
    const [full,detail]=await Promise.all([
      this.api("GET",path),
      this.api("GET",path+"?fields=payment_source")
    ]);
    if(!isObject(full)||full.id!==safeId||!isObject(detail)||
       typeof detail.id==="string"&&detail.id!==safeId)
      throw new PaypalError("PAYPAL_ORDER_PROJECTION_MISMATCH");
    return {...full,payment_source:isObject(detail.payment_source)?detail.payment_source:full.payment_source};
  }
  /** Strict merchant-only EUR 1 card-fields order. No delivery and no public product. */
  async createOneEuroQaCardOrder(input:{orderId:string;invoiceId:string;requestId:string;returnUrl:string;cancelUrl:string}):Promise<{id:string}>{
    const orderId=checkId(input.orderId,60),invoiceId=checkId(input.invoiceId,50,3);
    checkId(input.requestId);
    const data=await this.api("POST","/v2/checkout/orders",{
      intent:"CAPTURE",
      purchase_units:[{reference_id:orderId,custom_id:orderId,invoice_id:invoiceId,
        description:"Ruby Hair interner Kartentest - keine Lieferung",amount:{currency_code:"EUR",value:"1.00"}}],
      payment_source:{card:{attributes:{verification:{method:"SCA_ALWAYS"}},experience_context:{
        shipping_preference:"NO_SHIPPING",return_url:httpsUrl(input.returnUrl),cancel_url:httpsUrl(input.cancelUrl)
      }}}
    },input.requestId);
    if(!isObject(data)||typeof data.id!=="string")throw new PaypalError("QA_CARD_ORDER_INVALID");
    return {id:checkId(data.id,60)};
  }
  /** One explicit merchant-admin-only non-shippable QA purchase (always EUR 1.00).
   * This does not capture, fulfill, or mark the payment paid. */
  async createOneEuroQaOrder(input:{orderId:string;invoiceId:string;requestId:string;returnUrl:string;cancelUrl:string}):Promise<PaypalOrderResult>{
    const orderId=checkId(input.orderId,60),invoiceId=checkId(input.invoiceId,50,3);
    checkId(input.requestId);
    const data=await this.api("POST","/v2/checkout/orders",{
      intent:"CAPTURE",
      purchase_units:[{
        reference_id:orderId,custom_id:orderId,invoice_id:invoiceId,
        description:"Ruby Hair – interner 1 EUR Testkauf (keine Lieferung)",
        amount:{currency_code:"EUR",value:"1.00"}
      }],
      payment_source:{paypal:{experience_context:{
        brand_name:"Ruby Hair",user_action:"PAY_NOW",landing_page:"GUEST_CHECKOUT",shipping_preference:"NO_SHIPPING",
        return_url:httpsUrl(input.returnUrl),cancel_url:httpsUrl(input.cancelUrl)
      }}}
    },input.requestId);
    if(!isObject(data)||typeof data.id!=="string"||!Array.isArray(data.links))throw new PaypalError("PAYPAL_ORDER_INVALID");
    const link=data.links.find((item:unknown)=>isObject(item)&&
      (item.rel==="payer-action"||item.rel==="approve")&&typeof item.href==="string");
    if(!isObject(link)||typeof link.href!=="string")throw new PaypalError("PAYPAL_APPROVAL_MISSING");
    const url=new URL(link.href);
    if(url.protocol!=="https:"||url.username||url.password||!
      ["www.paypal.com","www.sandbox.paypal.com"].includes(url.hostname))
      throw new PaypalError("PAYPAL_UNTRUSTED_REDIRECT");
    if(this.env==="live"&&url.hostname!=="www.paypal.com")throw new PaypalError("PAYPAL_WRONG_ENVIRONMENT");
    if(this.env==="sandbox"&&url.hostname!=="www.sandbox.paypal.com")throw new PaypalError("PAYPAL_WRONG_ENVIRONMENT");
    return {id:checkId(data.id,60),approvalUrl:url.toString()};
  }
  /** Dedicated no-shipping gift certificate purchase; never touches physical inventory. */
  async createGiftOrder(input:{purchaseId:string;amountCents:number;returnUrl:string;cancelUrl:string}):Promise<PaypalOrderResult>{
    const purchaseId=checkId(input.purchaseId,60);
    if(!Number.isInteger(input.amountCents)||input.amountCents<1000||input.amountCents>250000)throw new PaypalError("INVALID_GIFT_AMOUNT");
    const total=centsToEuro(input.amountCents);
    const payload=await this.api("POST","/v2/checkout/orders",{
      intent:"CAPTURE",
      purchase_units:[{reference_id:purchaseId,custom_id:purchaseId,invoice_id:"RHG-"+purchaseId.replaceAll("-",""),
        description:"Ruby Hair digitale Geschenkgutscheine",
        amount:{currency_code:"EUR",value:total}}],
      payment_source:{paypal:{experience_context:{brand_name:"Ruby Hair",user_action:"PAY_NOW",
        landing_page:"GUEST_CHECKOUT",shipping_preference:"NO_SHIPPING",
        return_url:httpsUrl(input.returnUrl),cancel_url:httpsUrl(input.cancelUrl)}}}
    },"RHG-CREATE-"+purchaseId);
    if(!isObject(payload)||typeof payload.id!=="string"||!Array.isArray(payload.links))throw new PaypalError("PAYPAL_ORDER_INVALID");
    const approve=payload.links.find((entry:unknown)=>isObject(entry)&&(entry.rel==="payer-action"||entry.rel==="approve")&&typeof entry.href==="string");
    if(!isObject(approve)||typeof approve.href!=="string")throw new PaypalError("PAYPAL_APPROVAL_MISSING");
    const url=new URL(approve.href);
    if(url.protocol!=="https:"||url.username||url.password||!(["www.paypal.com","www.sandbox.paypal.com"].includes(url.hostname)))throw new PaypalError("PAYPAL_UNTRUSTED_REDIRECT");
    if((this.env==="live"&&url.hostname!=="www.paypal.com")||(this.env==="sandbox"&&url.hostname!=="www.sandbox.paypal.com"))throw new PaypalError("PAYPAL_WRONG_ENVIRONMENT");
    return {id:checkId(payload.id,60),approvalUrl:url.toString()};
  }
  async getOrder(id:string):Promise<unknown>{return this.api("GET","/v2/checkout/orders/"+checkId(id,60));}
  /** Read-only captured payment status; does not initiate refunds. */
  async getCapture(id:string):Promise<unknown>{return this.api("GET","/v2/payments/captures/"+checkId(id,70));}
  async captureOrder(id:string,requestId:string):Promise<unknown>{
    return this.api("POST","/v2/checkout/orders/"+checkId(id,60)+"/capture",{},checkId(requestId));
  }
  /** Never mark an order paid solely because PayPal returned HTTP 200. */
  requireCompletedCapture(value:unknown,expectedOrderId:string,expectedTotalCents:number,expectedPaypalId:string):PaypalCaptureResult{
    if(!isObject(value)||value.id!==expectedPaypalId||value.status!=="COMPLETED"||!Array.isArray(value.purchase_units)||value.purchase_units.length!==1)
      throw new PaypalError("PAYPAL_CAPTURE_NOT_COMPLETED");
    const unit=value.purchase_units[0];
    if(!isObject(unit)||unit.custom_id!==expectedOrderId||!isObject(unit.payments)||!Array.isArray(unit.payments.captures)||unit.payments.captures.length!==1)
      throw new PaypalError("PAYPAL_ORDER_MISMATCH");
    const cap=unit.payments.captures[0];
    if(!isObject(cap)||cap.status!=="COMPLETED"||!isObject(cap.amount)||cap.amount.currency_code!=="EUR"||typeof cap.amount.value!=="string"||typeof cap.id!=="string")
      throw new PaypalError("PAYPAL_CAPTURE_INVALID");
    const amountCents=euroToCents(cap.amount.value);
    if(amountCents!==expectedTotalCents)throw new PaypalError("PAYPAL_AMOUNT_MISMATCH");
    return {id:expectedPaypalId,status:"COMPLETED",captureId:checkId(cap.id,70),amountCents,customId:expectedOrderId};
  }
  async verifyWebhook(headers:Headers,event:unknown):Promise<boolean>{
    const required={
      transmission_id:headers.get("paypal-transmission-id"),
      transmission_time:headers.get("paypal-transmission-time"),
      cert_url:headers.get("paypal-cert-url"),
      auth_algo:headers.get("paypal-auth-algo"),
      transmission_sig:headers.get("paypal-transmission-sig")
    };
    if(Object.values(required).some(x=>!x))return false;
    if(!required.cert_url?.startsWith(hosts[this.env]+"/v1/notifications/certs/"))return false;
    if(required.auth_algo!=="SHA256withRSA")return false;
    const timestamp=Date.parse(required.transmission_time!);
    if(!Number.isFinite(timestamp)||Math.abs(Date.now()-timestamp)>10*60*1000)return false;
    const result=await this.api("POST","/v1/notifications/verify-webhook-signature",{
      ...required,webhook_id:this.creds.webhookId,webhook_event:event
    });
    return isObject(result)&&result.verification_status==="SUCCESS";
  }
}
