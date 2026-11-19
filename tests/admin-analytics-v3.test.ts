import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {parseAnalyticsRange,createAnalyticsReport,isoDay} from "../src/lib/admin-analytics-report";

const today=new Date("2026-11-19T20:25:00Z");
const row=(day:string,event:string,count:number,path="/")=>({day:new Date(day+"T00:00:00.000Z"),event,count,path,source:"direct",device:"mobile"});
const read=(file:string)=>readFileSync(file,"utf8");
test("Today and yesterday use distinct day ranges with preceding matching comparison periods",()=>{
 const todayRange=parseAnalyticsRange({zeitraum:"heute"},today);
 const yesterdayRange=parseAnalyticsRange({zeitraum:"gestern"},today);
 assert.deepEqual([isoDay(todayRange.start),isoDay(todayRange.end),todayRange.days],["2026-11-19","2026-11-19",1]);
 assert.deepEqual([isoDay(yesterdayRange.start),isoDay(yesterdayRange.end),yesterdayRange.days],["2026-11-18","2026-11-18",1]);
 const report=createAnalyticsReport([row("2026-11-18","page_view",8),row("2026-11-19","page_view",5)],todayRange,today);
 assert.equal(report.current.views,5);
 assert.equal(report.previous.views,8);
 assert.equal(report.daily.length,1);
});
test("Custom date range and standard periods preserve exact dates and comparison sizes",()=>{
 const range=parseAnalyticsRange({zeitraum:"frei",von:"2026-11-10",bis:"2026-11-12"},today);
 assert.deepEqual([isoDay(range.start),isoDay(range.end),range.days],["2026-11-10","2026-11-12",3]);
 const report=createAnalyticsReport([row("2026-11-11","story_view",3,"/story/example"),row("2026-11-12","ai_tryon_start",2,"/haar-anprobe")],range,today);
 assert.equal(report.engagement.storyViews,3);
 assert.equal(report.daily.length,3);
 assert.equal(report.daily[1].storyViews,3);
 assert.equal(report.daily[2].aiStarts,2);
 for(const [key,days] of [["7",7],["30",30],["90",90]] as const)assert.equal(parseAnalyticsRange({zeitraum:key},today).days,days);
});
test("Reject malformed, reversed, expired or future custom dates and fall back safely",()=>{
 for(const [von,bis] of [
  ["2026-02-01","2026-11-19"],["2026-11-12","2026-11-11"],
  ["2026-11-11","2026-11-20"],["2026-02-30","2026-03-03"],
  ["hacked' OR 1=1","2026-11-11"],["2026-11-01",""]
 ])assert.equal(parseAnalyticsRange({zeitraum:"frei",von,bis},today).days,30);
 assert.equal(parseAnalyticsRange({},today).days,30);
});
test("Event funnel only counts product and checkout events, never invents visitor transitions",()=>{
 const report=createAnalyticsReport([
  row("2026-11-19","page_view",20,"/"),
  row("2026-11-19","page_view",12,"/produkt/tape-in-extensions"),
  row("2026-11-19","page_view",4,"/produkt/keratin-bondings"),
  row("2026-11-19","page_view",7,"/warenkorb"),
  row("2026-11-19","page_view",3,"/geschenkgutschein"),
  row("2026-11-19","add_to_cart",18,"/produkt/tape-in-extensions"),
  row("2026-11-19","begin_checkout",5,"/kasse")
 ],parseAnalyticsRange({zeitraum:"heute"},today),today);
 assert.equal(report.funnel.productViews,16);
 assert.equal(report.funnel.cartViews,7);
 assert.equal(report.funnel.giftViews,3);
 assert.equal(report.current.views,46);
 assert.equal(report.current.added,18);
 assert.equal(report.current.checkouts,5);
 assert.ok(!("users" in report));
});
test("CSV respects bounded date filter; admin reads short-lived cached aggregates only",()=>{
 const page=read("app/admin/analytics/page.tsx");
 const route=read("app/admin/analytics/export/route.ts");
 const loader=read("src/lib/admin-analytics-server.ts");
 const shell=read("app/admin/admin-shell.tsx");
 for(const label of ["Heute","Gestern","7 Tage","30 Tage","90 Tage","Funnel","CSV exportieren","Von","Bis"])assert.ok(page.includes(label),label);
 assert.ok(page.includes('type="date"'));
 assert.ok(page.includes("keine Conversion-Rate"));
 assert.ok(page.includes("keine eindeutigen Besucher")||page.includes("Keine eindeutigen Besucher"));
 assert.ok(route.includes("parseAnalyticsRange"));
 assert.ok(route.includes("Story_Aufrufe"));
 assert.ok(route.includes('if(!await isAdmin())'));
 assert.ok(loader.includes("revalidate:30"));
 assert.ok(loader.includes("analyticsAggregate.findMany"));
 assert.ok(!loader.includes("customerEmail"));
 assert.ok(shell.includes('prefetch={false}'));
});
test("Cookie banner starts compact, uses separate opt-in choices and allows equal reject control",()=>{
 const banner=read("src/components/analytics-consent.tsx");
 const css=read("src/styles/shop.css");
 assert.ok(banner.includes('const [detailsOpen,setDetailsOpen]=useState(false)'));
 assert.ok(banner.includes("Anpassen"));
 assert.ok(banner.includes("Alle ablehnen"));
 assert.ok(banner.includes("Alle akzeptieren"));
 assert.ok(banner.includes("Auswahl speichern"));
 assert.ok(banner.includes("setDetailsOpen(true);setOpen(true)"));
 assert.ok(banner.includes("draftGoogle")&&banner.includes("draftMarketing")&&banner.includes("draftStatistics"));
 assert.ok(css.includes("rh-consent-simplified"));
 assert.ok(banner.includes('save("deny","deny","deny")'));
});
