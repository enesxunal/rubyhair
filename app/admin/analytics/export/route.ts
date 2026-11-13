import {NextRequest,NextResponse} from "next/server";
import {isAdmin} from "@/lib/admin-auth";
import {parseAnalyticsPeriod} from "@/lib/admin-analytics-report";
import {loadAnalyticsReport} from "@/lib/admin-analytics-server";

export const dynamic="force-dynamic";
export const runtime="nodejs";
export async function GET(request:NextRequest){
 if(!await isAdmin())return NextResponse.redirect(new URL("/admin/login",request.url),{status:307});
 const period=parseAnalyticsPeriod(new URL(request.url).searchParams.get("tage")||undefined);
 const report=await loadAnalyticsReport(period);
 const csv=["Datum;Seitenaufrufe;Warenkorb_Aktionen;Kassenaufrufe",
   ...report.daily.map(d=>[d.day,d.views,d.added,d.checkouts].join(";"))].join("\r\n");
 return new NextResponse("\ufeff"+csv+"\r\n",{
  status:200,
  headers:{
   "Content-Type":"text/csv; charset=utf-8",
   "Content-Disposition":`attachment; filename="rubyhair-events-${period}-tage.csv"`,
   "Cache-Control":"private, no-store",
   "X-Content-Type-Options":"nosniff"
  }
 });
}
