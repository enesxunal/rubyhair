import "server-only";
import {getPrisma} from "./prisma";
type JourneyRow={session:string;event:string;method:string|null;stage:string|null;code:string|null;source:string|null;device:string|null;createdAt:Date;orderStatus:string|null;captured:boolean|null};
export async function loadRecentJourneys(){
 try{
 const rows=await getPrisma().$queryRaw<JourneyRow[]>`
 WITH recent AS (
 SELECT session,MAX("createdAt") AS last FROM checkout_journey_events
 WHERE "createdAt">=NOW()-INTERVAL '7 days'
 GROUP BY session HAVING BOOL_OR(event IN ('add_to_cart','begin_checkout','payment_attempt','order_created'))
 ORDER BY last DESC LIMIT 30
 )
 SELECT e.session::text,e.event,e.method,e.stage,e.code,e.source,e.device,e."createdAt",
 CASE WHEN o."testOnly"=false THEN o.status END AS "orderStatus",
 CASE WHEN o."testOnly"=false THEN EXISTS(SELECT 1 FROM payment_events p WHERE p."orderId"=o.id AND p."eventType"='PAYMENT.CAPTURE.COMPLETED' AND p.provider<>'manual') END AS captured
 FROM recent r JOIN LATERAL (
 SELECT * FROM checkout_journey_events e WHERE e.session=r.session AND e."createdAt">=NOW()-INTERVAL '7 days' ORDER BY e."createdAt" DESC LIMIT 40
 ) e ON TRUE LEFT JOIN orders o ON o.id=e."orderId"
 ORDER BY r.last DESC,e."createdAt" ASC
 `;
 const sessions=new Map<string,JourneyRow[]>();
 for(const row of rows){const current=sessions.get(row.session)||[];current.push(row);sessions.set(row.session,current)}
 return Array.from(sessions.values());
 }catch{return null}
}
