import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {berlinMidnightUTC} from '../src/lib/analytics-calendar';
import {commerceRangeUTC,createCommerceReport,type CapturedOrder} from '../src/lib/admin-commerce-report';
import {parseAnalyticsRange,createAnalyticsReport,isoDay} from '../src/lib/admin-analytics-report';
const at=new Date('2026-11-22T16:00:00Z');
const range=parseAnalyticsRange({zeitraum:'7'},at);
const capture=(id:string,amount:number,gift:number,status:string,date='2026-11-22T14:00:00Z'):CapturedOrder=>({
 id,status,totalCents:amount,giftAppliedCents:gift,createdAt:new Date('2026-11-21T23:20:00Z'),capturedAt:new Date(date),
 lines:[{productName:'Tape-in Extensions',quantity:2,lineTotalCents:amount-gift}]
});
const stock={verifiedUnits:20,outOfStock:2,lowStock:3,unknownStock:4,totalVariants:18};
test('Berlin midnight bounds are correct for winter and both DST changes',()=>{
 assert.equal(berlinMidnightUTC('2026-11-22').toISOString(),'2026-11-21T23:00:00.000Z');
 assert.equal(berlinMidnightUTC('2026-07-22').toISOString(),'2026-07-21T22:00:00.000Z');
 assert.equal(berlinMidnightUTC('2026-03-29').toISOString(),'2026-03-28T23:00:00.000Z');
 assert.equal(berlinMidnightUTC('2026-10-25').toISOString(),'2026-10-24T22:00:00.000Z');
 assert.equal(berlinMidnightUTC('2026-03-30').toISOString(),'2026-03-29T22:00:00.000Z');
 assert.throws(()=>berlinMidnightUTC('2026-02-30'),RangeError);
 const r=commerceRangeUTC(range);assert.equal(r.endExclusive.toISOString(),'2026-11-22T23:00:00.000Z');
});
test('Verified payments only: do not count refunds, uncollected gift balance or pending orders as cash',()=>{
 const current=[capture('paid',22000,4000,'payment_confirmed'),capture('refunded',12500,0,'refunded'),capture('cancel',5000,0,'cancelled'),capture('second',12000,0,'shipped')];
 const result=createCommerceReport({confirmed:current,previousConfirmed:[],captured:current,previous:[capture('previous',30000,0,'delivered')],
  cohorts:[{status:'pending_payment',count:5},{status:'payment_authorized',count:2},{status:'preparing',count:1}],stock,truncated:false},range);
 assert.equal(result.verifiedOrders,2);
 assert.equal(result.collectedCents,30000);
 assert.equal(result.previousCollectedCents,30000);
 assert.equal(result.avgCollectedCents,15000);
 assert.equal(result.outstandingOrders,7);
 assert.equal(result.pendingOrders,5);assert.equal(result.authorizedOrders,2);
 assert.equal(result.otherOrders,1);
 assert.equal(result.stock.unknownStock,4);
 assert.equal(result.daily.reduce((sum,d)=>sum+d.cashCents,0),30000);
 assert.equal(result.daily.reduce((sum,d)=>sum+d.paidOrders,0),2);
 assert.equal(result.topProducts[0]?.units,4);
});
test('Prior period aligns by relative day, and channel breakdown uses actual aggregate events',()=>{
 const rows=[
  {day:new Date('2026-11-22T00:00:00Z'),event:'page_view',path:'/kollektionen',source:'meta_post',device:'mobile',count:30},
  {day:new Date('2026-11-22T00:00:00Z'),event:'add_to_cart',path:'/produkt/tape-in-extensions',source:'meta_post',device:'mobile',count:4},
  {day:new Date('2026-11-22T00:00:00Z'),event:'begin_checkout',path:'/kasse',source:'meta_post',device:'mobile',count:2},
  {day:new Date('2026-11-15T00:00:00Z'),event:'page_view',path:'/kollektionen',source:'meta_reels',device:'desktop',count:12}
 ];
 const data=createAnalyticsReport(rows,range,at);
 assert.equal(data.current.views,30);assert.equal(data.previous.views,12);
 assert.equal(data.previousDaily.reduce((v,d)=>v+d.views,0),12);
 assert.equal(data.channels.find(c=>c.key==='meta_post')?.added,4);
 assert.equal(data.deviceMetrics.find(d=>d.key==='mobile')?.checkouts,2);
 assert.equal(isoDay(data.daily[0]&&new Date(data.daily[0].day+'T00:00:00Z')),'2026-11-16');
});
test('Advanced page uses admin authentication, safe independent verified payments and CSV export',()=>{
 const page=readFileSync('app/admin/analytics/page.tsx','utf8');
 const service=readFileSync('src/lib/admin-commerce-server.ts','utf8');
 const exportCSV=readFileSync('app/admin/analytics/export/route.ts','utf8');
 const pure=readFileSync('src/lib/admin-commerce-report.ts','utf8');
 const styles=readFileSync('src/styles/admin-v2.css','utf8');
 assert.ok(page.indexOf('if(!await isAdmin())redirect')<page.indexOf('loadCommerceReportSafely(range)'));
 assert.ok(page.includes('<AdminCommercePanel data={commerce}/>'));
 assert.ok(page.includes('AdminAnalyticsTrend daily={report.daily} previousDaily={report.previousDaily}'));
 assert.ok(page.includes('<AdminAnalyticsChannels report={report} enabled={enabled}/>'));
 assert.ok(service.includes('order:{testOnly:false}'));
 assert.ok(service.includes('loadCommerceReportSafely'));
 assert.ok(service.includes('P2024'));
 assert.ok(service.includes('RUBY_ANALYTICS_COMMERCE_READ_FAILED'));
 assert.ok(page.indexOf('await loadAnalyticsReport(range)')<page.indexOf('await loadCommerceReportSafely(range)'));
 assert.ok(service.includes('"PAYMENT.CAPTURE.COMPLETED"'));
 assert.ok(service.includes('"KLARNA.CAPTURE.COMPLETED"'));
 assert.ok(!service.includes('customerEmail'));
 assert.ok(!service.includes('shippingAddress'));
 assert.ok(pure.includes('Math.max(0,o.totalCents-o.giftAppliedCents)'));
 assert.ok(exportCSV.includes('if(!await isAdmin())'));
 assert.ok(exportCSV.includes('Bestaetigte_Bestellungen;Bestellwert_EUR;Eingegangene_EUR'));
 for(const style of ['rh-adv-commerce-kpis','rh-adv-hero','rh-adv-inventory','rh-adv-two-col','rh-analytics-trend-toolbar','@media(max-width:720px)'])assert.ok(styles.includes(style),style);
});


test('Analytics refresh retains current view and reports actual cached snapshot timestamps',()=>{
 const page=readFileSync('app/admin/analytics/page.tsx','utf8');
 const refresh=readFileSync('src/components/admin-analytics-refresh.tsx','utf8');
 const service=readFileSync('src/lib/admin-commerce-server.ts','utf8');
 assert.match(refresh,/startTransition\(\(\)=>router.refresh\(\)\)/);
 assert.match(refresh,/disabled=\{pending\}/);
 assert.match(page,/trafficAt=\{report.loadedAt\}/);
 assert.match(service,/revalidate:30/);
 assert.doesNotMatch(service,/Promise\.all\(/);
 assert.match(service,/loadedAt:new Date\(\).toISOString\(\)/);
});

test("Klarna approval is a sale immediately, not a cash receipt; later capture does not double count",()=>{
 const approved=capture("klarna",48099,0,"payment_authorized");
 const yesterday=capture("klarna-previous",84649,0,"payment_authorized","2026-11-21T14:00:00Z");
 const pending=capture("abandoned",48099,0,"pending_payment");
 const data=createCommerceReport({confirmed:[approved,approved,yesterday,pending],previousConfirmed:[],captured:[],previous:[],cohorts:[{status:"pending_payment",count:1}],stock,truncated:false},range);
 assert.equal(data.confirmedOrders,2);assert.equal(data.orderCents,132748);assert.equal(data.collectedCents,0);assert.equal(data.verifiedOrders,0);
 assert.equal(data.daily.reduce((sum,d)=>sum+d.confirmedOrders,0),2);
 const later=createCommerceReport({confirmed:[{...approved,status:"payment_confirmed"},yesterday],previousConfirmed:[],captured:[{...approved,status:"payment_confirmed"}],previous:[],cohorts:[],stock,truncated:false},range);
 assert.equal(later.confirmedOrders,2);assert.equal(later.orderCents,132748);assert.equal(later.collectedCents,48099);
 const policy=readFileSync("src/lib/admin-confirmed-orders.ts","utf8");
 assert.ok(policy.includes("klarna_hpp_verified_authorized")&&policy.includes("testOnly:false")&&policy.includes("invoice:{isNot:null}"));
});

import {orderListFilter,orderListWhere,orderListPresentation} from "../src/lib/admin-order-list-policy";
test("order list defaults to verified successful orders; pending and closed attempts are separate",()=>{
 const row={testOnly:false,status:"payment_authorized",currency:"EUR",totalCents:48099,invoice:null,payments:[],statusEvents:[{toStatus:"payment_authorized",reason:"klarna_hpp_verified_authorized"}]};
 assert.equal(orderListFilter(undefined),"bestaetigt");
 assert.equal(orderListFilter("ohne-testkennzeichen"),"bestaetigt");
 assert.deepEqual(orderListPresentation(row),{label:"Bestätigt",tone:"confirmed",provider:"Klarna"});
 assert.equal(orderListPresentation({...row,status:"pending_payment"}).tone,"pending");
 assert.equal(orderListPresentation({...row,statusEvents:[]}).tone,"pending");
 assert.equal(orderListPresentation({...row,status:"cancelled"}).tone,"closed");
 assert.equal(orderListPresentation({...row,status:"refunded"}).tone,"closed");
 assert.equal(orderListPresentation({...row,testOnly:true}).tone,"neutral");
 assert.deepEqual(orderListWhere("offen").NOT,orderListWhere("bestaetigt"));
});
