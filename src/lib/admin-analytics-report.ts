/**
 * Consent-only event aggregation for the Ruby Hair operator dashboard.
 *
 * This report deliberately never estimates people, sessions, conversion rates,
 * orders or revenue from anonymous page-view / cart / checkout event counts.
 */
export const analyticsPeriods=[7,28,90] as const;
export type AnalyticsPeriod=typeof analyticsPeriods[number];
import {storyAnalyticsEntries} from "@/data/story-analytics";
import {berlinDateKey} from "@/lib/analytics-calendar";
export type AnalyticsEvent="page_view"|"add_to_cart"|"begin_checkout"|"story_view"|"ai_tryon_start"|"ai_tryon_success"|"ai_to_cart";
export type AnalyticsRow={
  day:Date;event:string;path:string;source:string;device:string;count:number
};
export type EventCounts={views:number;added:number;checkouts:number};
export type DailyCounts=EventCounts&{day:string;label:string;storyViews:number;aiStarts:number;aiSuccess:number;aiAdds:number};
export type RankedEntry={key:string;count:number;share:number};
export type PagePerformance={path:string;views:number;cartActions:number};
export type DetailedChannel={key:string;views:number;added:number;checkouts:number;productViews:number};
export type DetailedDevice={key:string;views:number;added:number;checkouts:number};
const empty=():EventCounts=>({views:0,added:0,checkouts:0});
export function isoDay(date:Date){return date.toISOString().slice(0,10);}
export function utcDay(date:Date){return new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()));}
export function addUtcDays(date:Date,offset:number){const result=new Date(date);result.setUTCDate(date.getUTCDate()+offset);return result;}
export function parseAnalyticsPeriod(value:string|undefined):AnalyticsPeriod{
 const days=Number(value);
 return analyticsPeriods.includes(days as AnalyticsPeriod)?days as AnalyticsPeriod:28;
}
export type AnalyticsRange={
 start:Date;end:Date;days:number;label:string;mode:"heute"|"gestern"|"7"|"30"|"90"|"frei";
};
/** Bounded date filter: no dates before retention or after today; never query unlimited history. */
export function parseAnalyticsRange(
 params:{zeitraum?:string;von?:string;bis?:string;tage?:string},
 now:Date=new Date()
):AnalyticsRange{
 const today=berlinDateKey(now);
 const fallback=(days:number,mode:AnalyticsRange["mode"],label:string):AnalyticsRange=>({
  start:addUtcDays(today,1-days),end:today,days,mode,label
 });
 const legacy=params.tage?parseAnalyticsPeriod(params.tage):null;
 if(legacy)return fallback(legacy,legacy===7?"7":legacy===90?"90":"frei",`Letzte ${legacy} Tage`);
 const mode=params.zeitraum;
 if(mode==="heute")return fallback(1,"heute","Heute");
 if(mode==="gestern"){const yesterday=addUtcDays(today,-1);return {start:yesterday,end:yesterday,days:1,mode:"gestern",label:"Gestern"};}
 if(mode==="7")return fallback(7,"7","Letzte 7 Tage");
 if(mode==="90")return fallback(90,"90","Letzte 90 Tage");
 if(mode==="30"||!mode&&!params.von&&!params.bis)return fallback(30,"30","Letzte 30 Tage");
 if(mode==="frei"||params.von||params.bis){
  const parseDate=(v:unknown)=>{
   if(typeof v!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(v))return null;
   const date=new Date(v+"T00:00:00.000Z");
   return Number.isFinite(date.getTime())&&isoDay(date)===v?date:null;
  };
  const start=parseDate(params.von),end=parseDate(params.bis);
  const oldest=addUtcDays(today,-179);
  if(start&&end&&start>=oldest&&end<=today&&end>=start){
   const days=Math.round((end.getTime()-start.getTime())/86400000)+1;
   return {start,end,days,mode:"frei",label:"Freier Zeitraum"};
  }
 }
 return fallback(30,"30","Letzte 30 Tage");
}
function addEvent(counts:EventCounts,event:string,count:number){
 if(event==="page_view")counts.views+=count;
 else if(event==="add_to_cart")counts.added+=count;
 else if(event==="begin_checkout")counts.checkouts+=count;
}
function ranking(m:Map<string,number>,total:number):RankedEntry[]{
 return [...m].map(([key,count])=>({key,count,share:total?100*count/total:0}))
  .sort((a,b)=>b.count-a.count||a.key.localeCompare(b.key));
}
function countInto(map:Map<string,number>,key:string,count:number){
 map.set(key,(map.get(key)||0)+count);
}
export function comparePercent(current:number,previous:number):number|null{
 if(previous===0)return null; // no valid percentage baseline
 return (current-previous)/previous*100;
}
export function createAnalyticsReport(rows:AnalyticsRow[],selection:AnalyticsPeriod|AnalyticsRange,now:Date=new Date()){
 const period=typeof selection==="number"?selection:selection.days;
 const end=typeof selection==="number"?berlinDateKey(now):selection.end;
 const start=typeof selection==="number"?addUtcDays(end,1-period):selection.start;
 const previousStart=addUtcDays(start,-period);
 const current=empty(),previous=empty(),days=new Map<string,DailyCounts>();
 for(let i=0;i<period;i++){
  const date=addUtcDays(start,i);
  days.set(isoDay(date),{day:isoDay(date),label:date.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",timeZone:"UTC"}),...empty(),storyViews:0,aiStarts:0,aiSuccess:0,aiAdds:0});
 }
 const pages=new Map<string,{views:number;cartActions:number}>(),sources=new Map<string,number>(),devices=new Map<string,number>();
 const channels=new Map<string,DetailedChannel>();
 const deviceMetrics=new Map<string,DetailedDevice>();
 const previousDaily=new Map<string,DailyCounts>();
 for(let i=0;i<period;i++){
  const day=addUtcDays(previousStart,i);
  previousDaily.set(isoDay(day),{day:isoDay(day),label:day.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",timeZone:"UTC"}),...empty(),storyViews:0,aiStarts:0,aiSuccess:0,aiAdds:0});
 }
 const storyCounts=new Map<string,number>();
 const funnel={productViews:0,cartViews:0,giftViews:0,aiViews:0};
 const engagement={storyViews:0,aiStarts:0,aiTryons:0,aiAdds:0},previousEngagement={storyViews:0,aiStarts:0,aiTryons:0,aiAdds:0};
 const addEngagement=(target:typeof engagement,event:string,count:number)=>{
  if(event==="story_view")target.storyViews+=count;
  else if(event==="ai_tryon_start")target.aiStarts+=count;
  else if(event==="ai_tryon_success")target.aiTryons+=count;
  else if(event==="ai_to_cart")target.aiAdds+=count;
 };
 let observedDays=0;
 const observed=new Set<string>();
 for(const row of rows){
  const day=isoDay(row.day), count=Number.isFinite(row.count)?Math.max(0,row.count):0;
  if(row.day<previousStart||row.day>end||count===0)continue;
  if(row.day<start){
   addEvent(previous,row.event,count);addEngagement(previousEngagement,row.event,count);
   const prior=previousDaily.get(day);
   if(prior){
    addEvent(prior,row.event,count);
    if(row.event==="story_view")prior.storyViews+=count;
    if(row.event==="ai_tryon_start")prior.aiStarts+=count;
    if(row.event==="ai_tryon_success")prior.aiSuccess+=count;
    if(row.event==="ai_to_cart")prior.aiAdds+=count;
   }
   continue;
  }
  addEngagement(engagement,row.event,count);
  if(row.event==="story_view")countInto(storyCounts,row.path,count);
  addEvent(current,row.event,count);
  const channel=channels.get(row.source)||{key:row.source,views:0,added:0,checkouts:0,productViews:0};
  const device=deviceMetrics.get(row.device)||{key:row.device,views:0,added:0,checkouts:0};
  if(row.event==="page_view"){
   channel.views+=count;device.views+=count;
   if(row.path.startsWith("/produkt/"))channel.productViews+=count;
  }else if(row.event==="add_to_cart"){
   channel.added+=count;device.added+=count;
  }else if(row.event==="begin_checkout"){
   channel.checkouts+=count;device.checkouts+=count;
  }
  channels.set(row.source,channel);deviceMetrics.set(row.device,device);
  const record=days.get(day);
  if(record){
   addEvent(record,row.event,count);
   if(row.event==="story_view")record.storyViews+=count;
   if(row.event==="ai_tryon_start")record.aiStarts+=count;
   if(row.event==="ai_tryon_success")record.aiSuccess+=count;
   if(row.event==="ai_to_cart")record.aiAdds+=count;
   if(row.event==="page_view")observed.add(day);
  }
  if(row.event==="page_view"){
   if(row.path.startsWith("/produkt/"))funnel.productViews+=count;
   if(row.path==="/warenkorb")funnel.cartViews+=count;
   if(row.path==="/geschenkgutschein")funnel.giftViews+=count;
   if(row.path==="/haar-anprobe")funnel.aiViews+=count;
   countInto(sources,row.source,count);
   countInto(devices,row.device,count);
  }
  if(row.event==="page_view"||row.event==="add_to_cart"){
   const entry=pages.get(row.path)||{views:0,cartActions:0};
   if(row.event==="page_view")entry.views+=count;else entry.cartActions+=count;
   pages.set(row.path,entry);
  }
 }
 observedDays=observed.size;
 const pagePerformance=[...pages].map(([path,v])=>({path,...v}))
  .sort((a,b)=>b.views-a.views||b.cartActions-a.cartActions||a.path.localeCompare(b.path));
 const topPages=ranking(new Map(pagePerformance.map(p=>[p.path,p.views])),current.views);
 return {
  period,start,end,previousStart,current,previous,daily:[...days.values()],
  previousDaily:[...previousDaily.values()],observedDays,
  channels:[...channels.values()].sort((a,b)=>b.views-a.views||a.key.localeCompare(b.key)),
  deviceMetrics:[...deviceMetrics.values()].sort((a,b)=>b.views-a.views||a.key.localeCompare(b.key)),
  pages:pagePerformance,topPages,
  engagement,previousEngagement,funnel,
  stories:storyAnalyticsEntries.map(story=>({...story,views:storyCounts.get(story.path)||0}))
   .sort((a,b)=>b.views-a.views||a.name.localeCompare(b.name)),
  sources:ranking(sources,current.views),devices:ranking(devices,current.views),
  viewChange:comparePercent(current.views,previous.views),
  cartChange:comparePercent(current.added,previous.added),
  checkoutChange:comparePercent(current.checkouts,previous.checkouts)
 };
}
export type AnalyticsReport=ReturnType<typeof createAnalyticsReport>;
export const analyticsSourceLabels:Record<string,string>={
 meta_paid:"Meta Ads · andere Anzeigen",meta_post:"Meta Ads · Instagram-Post",meta_reels:"Meta Ads · Elaine-Reels",direct:"Direkter / unbekannter Referrer",search:"Suchmaschinen",social:"Soziale Netzwerke (organisch / unklar)",
 referral:"Externe Verweise",internal:"Interne Navigation"
};
export const analyticsDeviceLabels:Record<string,string>={mobile:"Mobil",desktop:"Desktop"};
export function analyticsPathLabel(path:string){
 const names:Record<string,string>={
  "/":"Startseite","/kollektionen":"Kollektionen","/kollektionen/tape-in-extensions":"Tape-in-Kollektion",
  "/produkt/tape-in-extensions":"Tape-in-Produkt","/warenkorb":"Warenkorb",
  "/kasse":"Kasse","/haar-anprobe":"KI-Haaranprobe","/ratgeber":"Ratgeber",
  "/kontakt":"Kontakt","/versand-zahlung":"Versand & Zahlung","/suche":"Suche","/geschenkgutschein":"Geschenkgutschein"
 };
 return names[path]||path;
}
