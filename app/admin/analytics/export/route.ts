import {NextRequest,NextResponse} from "next/server";
import {isAdmin} from "@/lib/admin-auth";
import {parseAnalyticsRange,isoDay} from "@/lib/admin-analytics-report";
import {loadAnalyticsReport} from "@/lib/admin-analytics-server";

export const dynamic="force-dynamic";
export const runtime="nodejs";
export async function GET(request:NextRequest){
 if(!await isAdmin())return NextResponse.redirect(new URL("/admin/login",request.url),{status:307});
 const query=new URL(request.url).searchParams;
 const range=parseAnalyticsRange({
  zeitraum:query.get("zeitraum")||undefined,von:query.get("von")||undefined,
  bis:query.get("bis")||undefined,tage:query.get("tage")||undefined
 });
 const report=await loadAnalyticsReport(range);
 const csv=["Datum;Seitenaufrufe;Warenkorb_Aktionen;Kassenaufrufe;Story_Aufrufe;KI_Gestartet;KI_Ergebnisse;KI_zum_Warenkorb",
   ...report.daily.map(d=>[d.day,d.views,d.added,d.checkouts,d.storyViews,d.aiStarts,d.aiSuccess,d.aiAdds].join(";"))].join("\r\n");
 return new NextResponse("\ufeff"+csv+"\r\n",{
  status:200,
  headers:{
   "Content-Type":"text/csv; charset=utf-8",
   "Content-Disposition":`attachment; filename="rubyhair-events-${isoDay(range.start)}-${isoDay(range.end)}.csv"`,
   "Cache-Control":"private, no-store",
   "X-Content-Type-Options":"nosniff"
  }
 });
}
