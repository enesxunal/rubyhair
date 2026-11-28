/** Confirmed orders and separately verified cash receipts; no customer records. */
import {berlinISODate,berlinMidnightUTC} from "@/lib/analytics-calendar";
import {addUtcDays,isoDay,type AnalyticsRange} from "@/lib/admin-analytics-report";
export type CapturedOrder={
 id:string;status:string;totalCents:number;giftAppliedCents:number;createdAt:Date;capturedAt:Date;
 lines:Array<{productName:string;quantity:number;lineTotalCents:number}>;
};
export type ConfirmedOrder=Omit<CapturedOrder,"capturedAt">;
export type OrderCohort={status:string;count:number};
export type StockSnapshot={verifiedUnits:number;outOfStock:number;lowStock:number;unknownStock:number;totalVariants:number};
export type CommerceDay={day:string;label:string;cashCents:number;paidOrders:number;confirmedOrders:number;orderCents:number};
export type CommerceReport={
 confirmedOrders:number;orderCents:number;avgOrderCents:number;previousConfirmedOrders:number;previousOrderCents:number;
 verifiedOrders:number;collectedCents:number;productCents:number;avgCollectedCents:number;
 previousOrders:number;previousCollectedCents:number;
 pendingOrders:number;authorizedOrders:number;otherOrders:number;
 digitalOnlyOrders:number;outstandingOrders:number;
 topProducts:Array<{name:string;units:number;lineCents:number}>;
 daily:CommerceDay[];stock:StockSnapshot;truncated:boolean;
};
export function commerceRangeUTC(range:AnalyticsRange){
 const first=berlinMidnightUTC(isoDay(range.start));
 const last=berlinMidnightUTC(isoDay(addUtcDays(range.end,1)));
 const prior=berlinMidnightUTC(isoDay(addUtcDays(range.start,-range.days)));
 return {start:first,endExclusive:last,previousStart:prior};
}
export function createCommerceReport(input:{
 confirmed:ConfirmedOrder[];previousConfirmed:ConfirmedOrder[];captured:CapturedOrder[];previous:CapturedOrder[];cohorts:OrderCohort[];stock:StockSnapshot;truncated:boolean;
},range:AnalyticsRange):CommerceReport{
 const valid=(o:CapturedOrder)=>!["cancelled","refunded"].includes(o.status)&&o.totalCents>0;
 const current=input.captured.filter(valid),previous=input.previous.filter(valid);
 const distinct=(rows:ConfirmedOrder[])=>[...new Map(rows.filter(o=>["payment_authorized","payment_confirmed","preparing","shipped","delivered"].includes(o.status)&&o.totalCents>0).map(o=>[o.id,o])).values()];
 const confirmed=distinct(input.confirmed),previousConfirmed=distinct(input.previousConfirmed);
 const orderCents=confirmed.reduce((v,o)=>v+o.totalCents,0);
 const previousOrderCents=previousConfirmed.reduce((v,o)=>v+o.totalCents,0);
 const cash=(o:CapturedOrder)=>Math.max(0,o.totalCents-o.giftAppliedCents);
 const collectedCents=current.reduce((v,o)=>v+cash(o),0);
 const previousCollectedCents=previous.reduce((v,o)=>v+cash(o),0);
 const productCents=confirmed.reduce((v,o)=>v+o.lines.reduce((sum,l)=>sum+l.lineTotalCents,0),0);
 const summary=new Map<string,{units:number;lineCents:number}>();
 const daily=new Map<string,CommerceDay>();
 for(let i=0;i<range.days;i++){
  const date=addUtcDays(range.start,i),day=isoDay(date);
  daily.set(day,{day,label:date.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",timeZone:"UTC"}),cashCents:0,paidOrders:0,confirmedOrders:0,orderCents:0});
 }
 for(const o of current){
  const day=berlinISODate(o.capturedAt),entry=daily.get(day);
  if(entry){entry.cashCents+=cash(o);entry.paidOrders++;}
 }
 for(const o of confirmed){
  const entry=daily.get(berlinISODate(o.createdAt));
  if(entry){entry.confirmedOrders++;entry.orderCents+=o.totalCents;}
  for(const l of o.lines){
   const name=l.productName.trim().slice(0,120)||"Artikel";
   const item=summary.get(name)||{units:0,lineCents:0};
   item.units+=l.quantity;item.lineCents+=l.lineTotalCents;summary.set(name,item);
  }
 }
 const counts=new Map(input.cohorts.map(x=>[x.status,x.count]));
 const pending=counts.get("pending_payment")||0,authorized=counts.get("payment_authorized")||0;
 return {
  confirmedOrders:confirmed.length,orderCents,avgOrderCents:confirmed.length?Math.round(orderCents/confirmed.length):0,previousConfirmedOrders:previousConfirmed.length,previousOrderCents,
  verifiedOrders:current.length,collectedCents,productCents,
  avgCollectedCents:current.length?Math.round(collectedCents/current.length):0,
  previousOrders:previous.length,previousCollectedCents,
  pendingOrders:pending,authorizedOrders:authorized,
  otherOrders:Math.max(0,input.cohorts.reduce((a,r)=>a+r.count,0)-pending-authorized),
  digitalOnlyOrders:current.filter(o=>o.lines.length===0).length,
  outstandingOrders:pending+authorized,
  topProducts:[...summary.entries()].map(([name,v])=>({name,...v}))
   .sort((a,b)=>b.units-a.units||b.lineCents-a.lineCents||a.name.localeCompare(b.name)).slice(0,8),
  daily:[...daily.values()],stock:input.stock,truncated:input.truncated
 };
}
