import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {storyAnalyticsEntries,storyAnalyticsPath,storyAnalyticsPaths} from "../src/data/story-analytics";
import {createAnalyticsReport} from "../src/lib/admin-analytics-report";

const read=(s:string)=>readFileSync(s,"utf8");
const day=new Date("2026-11-19T00:00:00.000Z");
const row=(event:string,path:string,count:number)=>({day,event,path,count,source:"direct",device:"mobile"});

test("Community stories have a stable distinct countable identifier",()=>{
 assert.equal(storyAnalyticsEntries.length,9);
 assert.equal(storyAnalyticsPaths.size,9);
 assert.ok(storyAnalyticsEntries.every(s=>s.path.startsWith("/story/")&&storyAnalyticsPath(s.postUrl)===s.path));
 assert.equal(storyAnalyticsPath("https://example.com/p/unknown/"),null);
});

test("Analytics reports count story views and successful AI renders separately",()=>{
 const [first,second]=storyAnalyticsEntries;
 const report=createAnalyticsReport([
  row("page_view","/",7),row("story_view",first.path,4),
  row("story_view",second.path,2),row("ai_tryon_start","/haar-anprobe",5),row("ai_tryon_success","/haar-anprobe",3),
  row("ai_to_cart","/haar-anprobe",1),row("add_to_cart","/haar-anprobe",1)
 ],7,day);
 assert.equal(report.current.views,7);
 assert.equal(report.current.added,1);
 assert.deepEqual(report.engagement,{storyViews:6,storySectionSeen:0,aiStarts:5,aiTryons:3,aiAdds:1});
 assert.equal(report.stories[0].path,first.path);
 assert.equal(report.stories[0].views,4);
 assert.equal(report.stories[1].views,2);
 assert.equal(report.stories.length,9);
 assert.ok(report.stories.slice(2).every(v=>v.views===0));
});

test("Story and AI tracking requires optional consent and rejects arbitrary event paths",()=>{
 const source=read("src/lib/storefront-analytics.ts");
 const server=read("app/api/analytics/event/route.ts");
 assert.ok(source.includes('if(!analyticsConsent())return;'));
 assert.ok(source.includes('trackRubyEvent(event:RubyEvent,pathOverride?:string)'));
 assert.ok(source.includes('storyAnalyticsPaths.has(path)'));
 assert.ok(server.includes('request.cookies.get("ruby_analytics")'));
 assert.ok(server.includes('storyAnalyticsPaths.has(data.path)'));
 assert.ok(server.includes('data.path==="/haar-anprobe"'));
 assert.ok(server.includes('Event path not allowed'));
 assert.ok(source.includes('"/geschenkgutschein"'));
});

test("AI result displays exact selected variant and adds it to the established shared cart",()=>{
 const wizard=read("src/components/hair-tryon-lab.tsx");
 assert.ok(wizard.includes('const selectedProduct=Number.isInteger(selectedId)?byVariation(selectedId):null;'));
 assert.ok(wizard.includes('selectedProduct?.variation.available&&selectedProduct.variation.purchasable'));
 assert.ok(wizard.includes('cart.add(selectedProduct.variation.id,1,Math.round(selectedProduct.variation.price*100))'));
 assert.ok(wizard.includes('trackRubyEvent("ai_to_cart")'));
 assert.ok(wizard.includes('trackRubyEvent("ai_tryon_start")'));
 assert.ok(wizard.includes('trackRubyEvent("ai_tryon_success")'));
 assert.ok(wizard.includes('router.push("/warenkorb/")'));
 assert.ok(wizard.includes('href={productHref}'));
 assert.ok(!wizard.includes('photo:before.url'));
 const stories=read("src/components/influencer-stories.tsx");
 assert.ok(stories.includes('trackRubyEvent("story_view",path)'));
});

test("Analytics collection is resilient but still strictly opt-in and does not fabricate views",()=>{
 const source=read("src/lib/storefront-analytics.ts");
 const consent=read("src/components/analytics-consent.tsx");
 const server=read("app/api/analytics/event/route.ts");
 const admin=read("app/admin/analytics/page.tsx");
 assert.match(source,/document\.cookie\.split\(";"\)\.some\(part=>part\.trim\(\)===\"ruby_analytics=allow\"\)/);
 assert.match(source,/response\.status===503&&attempt===0/);
 assert.match(source,/send\(1\),850/);
 assert.match(consent,/storedStats===readAnalyticsCookie\(\)\?storedStats:null/);
 assert.match(consent,/if\(\(statsAvailable&&stats===null\)\|\|ads===null\|\|ga===null\)setOpen\(true\)/);
 assert.match(server,/await db\.analyticsAggregate\.upsert/);
 assert.ok(server.indexOf("await db.analyticsAggregate.upsert")<server.indexOf("await db.analyticsAggregate.deleteMany"));
 assert.match(server,/24\*60\*60\*1000/);
 assert.match(server,/RUBY_ANALYTICS_WRITE_UNAVAILABLE/);
 assert.match(admin,/0 erfasste Aufrufe sind kein Nachweis/);
 assert.match(admin,/report\.funnel\.aiViews>0/);
});


test("Story rail exposure is separate from actual Story plays and stays consent gated",()=>{
 const first=storyAnalyticsEntries[0];
 const day=new Date("2026-11-23T00:00:00.000Z");
 const report=createAnalyticsReport([
  {day,event:"story_section_seen",path:"/",count:7,source:"direct",device:"mobile"},
  {day,event:"story_view",path:first.path,count:1,source:"direct",device:"mobile"}
 ],7,day);
 assert.equal(report.engagement.storySectionSeen,7);
 assert.equal(report.engagement.storyViews,1);
 assert.equal(report.stories.find(s=>s.path===first.path)?.views,1);
 const route=read("app/api/analytics/event/route.ts");
 const client=read("src/lib/storefront-analytics.ts");
 const stories=read("src/components/influencer-stories.tsx");
 const consent=read("src/components/analytics-consent.tsx");
 assert.match(route,/data\.event==="story_section_seen"\?data\.path==="\/"/);
 assert.match(client,/else if\(event==="story_section_seen"\)\{if\(path!=="\/"\)return;\}/);
 assert.match(client,/if\(!analyticsConsent\(\)\)return;/);
 assert.match(stories,/IntersectionObserver/);
 assert.match(stories,/intersectionRatio>=\.5/);
 assert.match(stories,/trackRubyEvent\("story_section_seen","\/"\)/);
 assert.match(stories,/sectionTracked\.current=true/);
 assert.match(consent,/ruby-analytics-consent-saved/);
 const admin=read("app/admin/analytics/page.tsx");
 assert.match(admin,/report\.engagement\.storySectionSeen/);
 assert.match(admin,/zählt keine Story-Wiedergaben/);
});
