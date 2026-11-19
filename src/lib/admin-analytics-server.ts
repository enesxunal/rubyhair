import "server-only";
import {unstable_cache} from "next/cache";
import {getPrisma} from "@/lib/prisma";
import {
  createAnalyticsReport,addUtcDays,utcDay,
  type AnalyticsPeriod,type AnalyticsRange,type AnalyticsRow
} from "@/lib/admin-analytics-report";

/**
 * Safe shared cache: only anonymous daily aggregate counts, never session,
 * personal or payment records. Auth is verified by each caller before reading.
 * Short TTL avoids repeated PostgreSQL reads on panel navigation/CSV export.
 */
const cachedAggregateRows=unstable_cache(async(startISO:string,endISO:string)=>{
 const rows=await getPrisma().analyticsAggregate.findMany({
  where:{day:{gte:new Date(startISO),lte:new Date(endISO)}},
  select:{day:true,event:true,path:true,source:true,device:true,count:true}
 });
 return rows.map(row=>({...row,day:row.day.toISOString()}));
},["rubyhair-analytics-daily"],{revalidate:30});

/** Only anonymous aggregate counts. Never pull user identifiers or session-level events. */
export async function loadAnalyticsReport(selection:AnalyticsPeriod|AnalyticsRange,now:Date=new Date()){
 const end=typeof selection==="number"?utcDay(now):selection.end;
 const days=typeof selection==="number"?selection:selection.days;
 const start=typeof selection==="number"?addUtcDays(end,1-days):selection.start;
 const previousStart=addUtcDays(start,-days);
 const rows=await cachedAggregateRows(previousStart.toISOString(),end.toISOString());
 const decoded:AnalyticsRow[]=rows.map(row=>({...row,day:new Date(row.day)}));
 return createAnalyticsReport(decoded,selection,now);
}
