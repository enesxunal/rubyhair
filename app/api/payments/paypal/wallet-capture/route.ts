import {recordCheckoutDiagnostic} from "@/lib/checkout-diagnostics";
import {NextRequest,NextResponse,after} from "next/server";
import {isAdmin} from "@/lib/admin-auth";
import {publicCheckoutMode,providerForCheckout,verifyWalletCheckoutSignature,type WalletCheckoutMethod,CustomerCheckoutError} from "@/lib/customer-checkout";
import {finalizePayPalCheckout} from "@/lib/customer-order-finalize";
import {runCustomerJobs} from "@/lib/customer-automation";
import {getPrisma} from "@/lib/prisma";

export const runtime="nodejs",dynamic="force-dynamic",maxDuration=60;
const headers={"Cache-Control":"no-store, private",Pragma:"no-cache","X-Content-Type-Options":"nosniff"};
const obj=(v:unknown):v is Record<string,unknown>=>Boolean(v)&&typeof v==="object"&&!Array.isArray(v);
/** A browser approval is never sufficient. Verify the PayPal order funding source, capture and invoice. */
export async function POST(req:NextRequest){
 const mode=publicCheckoutMode();
 if(mode==="disabled"||mode==="klarna_public"||mode==="admin_test"&&!await isAdmin())
  return NextResponse.json({error:"NOT_AVAILABLE"},{status:404,headers});
 const origin=req.headers.get("origin");
 if(!origin||!["https://rubyhair.de","https://www.rubyhair.de"].includes(origin)||req.headers.get("sec-fetch-site")==="cross-site")
  return NextResponse.json({error:"ORIGIN_NOT_ALLOWED"},{status:403,headers});
 if(Number(req.headers.get("content-length")||0)>2048)return NextResponse.json({error:"REQUEST_TOO_LARGE"},{status:413,headers});
 let input:unknown;
 try{const raw=await req.text();if(raw.length>2048)throw Error();input=JSON.parse(raw);}catch{
  return NextResponse.json({error:"INVALID_REQUEST"},{status:400,headers});
 }
 if(!obj(input)||!(input.method==="apple_pay"||input.method==="google_pay")||typeof input.orderId!=="string"||
  !/^[0-9a-f-]{36}$/i.test(input.orderId)||typeof input.paypalOrderId!=="string"||
  !/^[A-Za-z0-9_-]{8,60}$/.test(input.paypalOrderId)||typeof input.walletState!=="string"||
  !/^[0-9a-f]{64}$/.test(input.walletState))return NextResponse.json({error:"INVALID_REQUEST"},{status:400,headers});
 const method=input.method as WalletCheckoutMethod;
 if(process.env[method==="apple_pay"?"RUBY_PAYPAL_APPLE_PAY_ENABLED":"RUBY_PAYPAL_GOOGLE_PAY_ENABLED"]!=="true")
  return NextResponse.json({error:"NOT_AVAILABLE"},{status:404,headers});
 if(!verifyWalletCheckoutSignature(input.orderId,method,input.walletState))
  return NextResponse.json({error:"INVALID_WALLET_SESSION"},{status:403,headers});
 const reject=(code:string,status:number)=>{after(()=>recordCheckoutDiagnostic(method,"capture",code,"server",input.orderId as string));return NextResponse.json({error:code},{status,headers});};
 try{
  const stored=await getPrisma().order.findUnique({where:{id:input.orderId},select:{id:true,testOnly:true,status:true,paymentReference:true}});
  if(!stored||stored.testOnly||stored.paymentReference!==input.paypalOrderId||!['pending_payment','payment_confirmed'].includes(stored.status))
   return reject("ORDER_REFERENCE_MISMATCH",409);
  const {api}=await providerForCheckout("paypal");
  const remote=await api.getOrderWithPaymentSource(input.paypalOrderId);
  if(!obj(remote)||remote.id!==input.paypalOrderId||!['APPROVED','COMPLETED'].includes(String(remote.status)))
   return reject("PAYPAL_WALLET_NOT_APPROVED",409);
  const source=obj(remote.payment_source)?remote.payment_source:null;
  const wallet=source&&obj(source[method])?source[method]:null;
  if(!wallet)return reject("WALLET_SOURCE_MISMATCH",409);
  // Google Pay may require 3DS; never capture without the required payer action.
  const card=obj(wallet.card)?wallet.card:null;
  const auth=card&&obj(card.authentication_result)?card.authentication_result:null;
  if(auth&&auth.liability_shift!=="POSSIBLE")
   return reject("WALLET_3DS_REQUIRES_REVIEW",409);
  const result=await finalizePayPalCheckout(input.orderId,true,input.paypalOrderId);
  if(!result.paid)return reject("WALLET_CAPTURE_REQUIRES_REVIEW",409);
  after(async()=>{try{await runCustomerJobs(2)}catch{}});
  return NextResponse.json({paid:true,invoiceNumber:result.invoiceNumber},{headers});
 }catch(e){
  const code=e instanceof CustomerCheckoutError?e.reason:"WALLET_CONFIRMATION_REQUIRES_REVIEW";
  return reject(code,e instanceof CustomerCheckoutError?e.http:503);
 }
}
