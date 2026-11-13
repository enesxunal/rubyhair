import "server-only";
import {getPrisma} from "@/lib/prisma";
import {
  createAnalyticsReport,addUtcDays,utcDay,
  type AnalyticsPeriod
} from "@/lib/admin-analytics-report";

/** Only aggregate counts. Never pull user identifiers or session-level events. */
export async function loadAnalyticsReport(period:AnalyticsPeriod,now:Date=new Date()){
 const end=utcDay(now);
 const previousStart=addUtcDays(end,1-period*2);
 const rows=await getPrisma().analyticsAggregate.findMany({
  where:{day:{gte:previousStart,lte:end}},
  select:{day:true,event:true,path:true,source:true,device:true,count:true}
 });
 return createAnalyticsReport(rows,period,now);
}
