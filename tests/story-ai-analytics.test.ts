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
 assert.deepEqual(report.engagement,{storyViews:6,aiStarts:5,aiTryons:3,aiAdds:1});
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
 assert.ok(wizard.includes('cart.add(selectedProduct.variation.id,1)'));
 assert.ok(wizard.includes('trackRubyEvent("ai_to_cart")'));
 assert.ok(wizard.includes('trackRubyEvent("ai_tryon_start")'));
 assert.ok(wizard.includes('trackRubyEvent("ai_tryon_success")'));
 assert.ok(wizard.includes('router.push("/warenkorb/")'));
 assert.ok(wizard.includes('href={productHref}'));
 assert.ok(!wizard.includes('photo:before.url'));
 const stories=read("src/components/influencer-stories.tsx");
 assert.ok(stories.includes('trackRubyEvent("story_view",path)'));
});
