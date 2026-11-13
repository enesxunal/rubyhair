/**
 * Consent-only event aggregation for the Ruby Hair operator dashboard.
 *
 * This report deliberately never estimates people, sessions, conversion rates,
 * orders or revenue from anonymous page-view / cart / checkout event counts.
 */
export const analyticsPeriods=[7,28,90] as const;
export type AnalyticsPeriod=typeof analyticsPeriods[number];
export type AnalyticsEvent="page_view"|"add_to_cart"|"begin_checkout";
export type AnalyticsRow={
  day:Date;event:string;path:string;source:string;device:string;count:number
};
export type EventCounts={views:number;added:number;checkouts:number};
export type DailyCounts=EventCounts&{day:string;label:string};
export type RankedEntry={key:string;count:number;share:number};
export type PagePerformance={path:string;views:number;cartActions:number};
const empty=():EventCounts=>({views:0,added:0,checkouts:0});
export function isoDay(date:Date){return date.toISOString().slice(0,10);}
export function utcDay(date:Date){return new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()));}
export function addUtcDays(date:Date,offset:number){const result=new Date(date);result.setUTCDate(date.getUTCDate()+offset);return result;}
export function parseAnalyticsPeriod(value:string|undefined):AnalyticsPeriod{
 const days=Number(value);
 return analyticsPeriods.includes(days as AnalyticsPeriod)?days as AnalyticsPeriod:28;
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
export function createAnalyticsReport(rows:AnalyticsRow[],period:AnalyticsPeriod,now:Date=new Date()){
 const end=utcDay(now),start=addUtcDays(end,1-period),previousStart=addUtcDays(start,-period);
 const current=empty(),previous=empty(),days=new Map<string,DailyCounts>();
 for(let i=0;i<period;i++){
  const date=addUtcDays(start,i);
  days.set(isoDay(date),{day:isoDay(date),label:date.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",timeZone:"UTC"}),...empty()});
 }
 const pages=new Map<string,{views:number;cartActions:number}>(),sources=new Map<string,number>(),devices=new Map<string,number>();
 let observedDays=0;
 const observed=new Set<string>();
 for(const row of rows){
  const day=isoDay(row.day), count=Number.isFinite(row.count)?Math.max(0,row.count):0;
  if(row.day<previousStart||row.day>end||count===0)continue;
  if(row.day<start){addEvent(previous,row.event,count);continue;}
  addEvent(current,row.event,count);
  const record=days.get(day);
  if(record){
   addEvent(record,row.event,count);
   if(row.event==="page_view")observed.add(day);
  }
  if(row.event==="page_view"){
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
  period,start,end,previousStart,current,previous,daily:[...days.values()],observedDays,
  pages:pagePerformance,topPages,
  sources:ranking(sources,current.views),devices:ranking(devices,current.views),
  viewChange:comparePercent(current.views,previous.views),
  cartChange:comparePercent(current.added,previous.added),
  checkoutChange:comparePercent(current.checkouts,previous.checkouts)
 };
}
export type AnalyticsReport=ReturnType<typeof createAnalyticsReport>;
export const analyticsSourceLabels:Record<string,string>={
 direct:"Direkter / unbekannter Referrer",search:"Suchmaschinen",social:"Soziale Netzwerke",
 referral:"Externe Verweise",internal:"Interne Navigation"
};
export const analyticsDeviceLabels:Record<string,string>={mobile:"Mobil",desktop:"Desktop"};
export function analyticsPathLabel(path:string){
 const names:Record<string,string>={
  "/":"Startseite","/kollektionen":"Kollektionen","/kollektionen/tape-in-extensions":"Tape-in-Kollektion",
  "/produkt/tape-in-extensions":"Tape-in-Produkt","/warenkorb":"Warenkorb",
  "/kasse":"Kasse","/haar-anprobe":"KI-Haaranprobe","/ratgeber":"Ratgeber",
  "/kontakt":"Kontakt","/versand-zahlung":"Versand & Zahlung","/suche":"Suche"
 };
 return names[path]||path;
}
