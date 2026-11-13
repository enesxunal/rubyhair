import {test} from "node:test";
import assert from "node:assert/strict";
import {addUtcDays,createAnalyticsReport,comparePercent,parseAnalyticsPeriod} from "../src/lib/admin-analytics-report";
const now=new Date("2026-11-13T12:00:00Z");
const row=(day:string,event:string,count:number,path="/",source="direct",device="desktop")=>
 ({day:new Date(day+"T00:00:00Z"),event,count,path,source,device});
test("reports sum aggregate events with UTC date boundaries and comparison without invented sessions",()=>{
 const report=createAnalyticsReport([
  row("2026-11-13","page_view",5,"/produkt/tape-in-extensions","social","mobile"),
  row("2026-11-12","page_view",7),
  row("2026-11-12","add_to_cart",2,"/produkt/tape-in-extensions"),
  row("2026-11-12","begin_checkout",1,"/kasse"),
  row("2026-11-06","page_view",4),
  row("2026-11-05","add_to_cart",1),
  row("2026-10-30","page_view",999) // older than comparison window
 ],7,now);
 assert.deepEqual(report.current,{views:12,added:2,checkouts:1});
 assert.deepEqual(report.previous,{views:4,added:1,checkouts:0});
 assert.equal(report.viewChange,200);
 assert.equal(report.cartChange,100);
 assert.equal(report.checkoutChange,null);
 assert.equal(report.daily.length,7);
 assert.equal(report.daily[6].views,5);
 assert.equal(report.observedDays,2);
 assert.equal(report.sources.find(x=>x.key==="social")?.count,5);
 assert.equal(report.devices.find(x=>x.key==="mobile")?.count,5);
 assert.equal(report.pages.find(x=>x.path==="/produkt/tape-in-extensions")?.cartActions,2);
});
test("zero comparison remains null and no fake rate or sessions are calculated",()=>{
 const report=createAnalyticsReport([row("2026-11-13","page_view",1)],28,now);
 assert.equal(report.viewChange,null);
 assert.equal(report.current.views,1);
 assert.equal(report.current.added,0);
 assert.equal(report.daily.length,28);
 assert.equal(report.sources[0].share,100);
 assert.ok(!("sessions" in report.current));
});
test("range only accepts 7, 28 and 90; dates use UTC midnight",()=>{
 assert.equal(parseAnalyticsPeriod("7"),7);
 assert.equal(parseAnalyticsPeriod("14"),28);
 assert.equal(parseAnalyticsPeriod("NaN"),28);
 assert.equal(addUtcDays(new Date("2026-11-13T00:00:00Z"),-7).toISOString(),"2026-11-06T00:00:00.000Z");
});
test("comparison math handles negative change and zero safely",()=>{
 assert.equal(comparePercent(4,8),-50);
 assert.equal(comparePercent(0,0),null);
});
