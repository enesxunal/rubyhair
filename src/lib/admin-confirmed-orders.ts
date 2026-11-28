import type {Prisma} from "@prisma/client";
// Verified authorization is a successful order, even before capture.
// No draft, abandoned, cancelled, refunded, internal or manually marked sales.
export const confirmedOrderWhere={
 testOnly:false,currency:"EUR",totalCents:{gt:0},
 status:{in:["payment_authorized","payment_confirmed","preparing","shipped","delivered"]},
 OR:[
  {statusEvents:{some:{toStatus:"payment_authorized",reason:"klarna_hpp_verified_authorized"}}},
  {status:{in:["payment_confirmed","preparing","shipped","delivered"]},invoice:{isNot:null},payments:{some:{provider:{in:["paypal","klarna"]},eventType:{in:["PAYMENT.CAPTURE.COMPLETED","KLARNA.CAPTURE.COMPLETED"]}}}}
 ]
} satisfies Prisma.OrderWhereInput;
