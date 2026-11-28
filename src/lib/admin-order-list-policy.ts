import type {Prisma} from "@prisma/client";
import {confirmedOrderWhere} from "@/lib/admin-confirmed-orders";
export const orderListFilters=["bestaetigt","offen","storniert","tests","alle","test-offen"] as const;
export type OrderListFilter=typeof orderListFilters[number];
export function orderListFilter(value?:string):OrderListFilter{
 return orderListFilters.find(f=>f===value)||"bestaetigt";
}
export const closedOrderWhere={testOnly:false,status:{in:["cancelled","refunded"]}} satisfies Prisma.OrderWhereInput;
export const openOrderWhere={testOnly:false,status:{notIn:["cancelled","refunded"]},NOT:confirmedOrderWhere} satisfies Prisma.OrderWhereInput;
export function orderListWhere(filter:OrderListFilter):Prisma.OrderWhereInput{
 switch(filter){
  case "bestaetigt":return confirmedOrderWhere;
  case "offen":return openOrderWhere;
  case "storniert":return closedOrderWhere;
  case "tests":return {testOnly:true};
  case "test-offen":return {testOnly:true,status:"test_reserved"};
  case "alle":return {};
 }
}
type Row={testOnly:boolean;status:string;currency:string;totalCents:number;invoice:unknown;payments:{provider:string;eventType:string}[];statusEvents:{toStatus:string;reason:string}[]};
export function orderListPresentation(o:Row){
 const captured=o.payments.find(p=>["paypal","klarna"].includes(p.provider)&&["PAYMENT.CAPTURE.COMPLETED","KLARNA.CAPTURE.COMPLETED"].includes(p.eventType));
 const authorized=o.statusEvents.some(s=>s.toStatus==="payment_authorized"&&s.reason==="klarna_hpp_verified_authorized");
 const provider=authorized||captured?.provider==="klarna"?"Klarna":captured?.provider==="paypal"?"PayPal":null;
 if(o.testOnly)return {label:"Testbestellung",tone:"neutral",provider:null};
 if(o.status==="cancelled")return {label:"Storniert",tone:"closed",provider};
 if(o.status==="refunded")return {label:"Erstattet",tone:"closed",provider};
 const verified=o.currency==="EUR"&&o.totalCents>0&&["payment_authorized","payment_confirmed","preparing","shipped","delivered"].includes(o.status)&&(authorized||Boolean(o.status!=="payment_authorized"&&o.invoice&&captured));
 if(verified)return {label:"Bestätigt",tone:"confirmed",provider};
 return {label:"Nicht bestätigt",tone:"pending",provider};
}
