import {z} from "zod";
export const monitorServices=["home","product","collection","cart","checkout","catalog","quote","account","admin_login","server_disk","server_memory","rubyhair-db-tls.service","rubyhair-stock-reservations.timer","rubyhair-db-backup.timer"] as const;
export const monitorSnapshotId="20a42304-d183-4e9f-9dd6-8033ad48ec24";
export const monitorSnapshotSchema=z.object({time:z.string().datetime({offset:true}),checks:z.array(z.object({service:z.enum(monitorServices),status:z.number().int().min(0).max(599),ms:z.number().int().min(0).max(90000),reason:z.enum(["OK","HTTP_ERROR","NETWORK_OR_TIMEOUT","INVALID_RESPONSE","DISK_HIGH","MEMORY_LOW","UNAVAILABLE","UNIT_INACTIVE","UNIT_STATUS_UNAVAILABLE"])}).strict()).length(monitorServices.length)}).strict().refine(v=>new Set(v.checks.map(c=>c.service)).size===monitorServices.length);

/** Fixed health codes only. Missing/stale snapshots are incidents, never a healthy zero. */
export function monitorAlertReasons(raw:unknown,now=Date.now()):string[]{
 const parsed=monitorSnapshotSchema.safeParse(raw);
 if(!parsed.success||Math.abs(now-Date.parse(parsed.data.time))>6*60000)return ["monitor: SNAPSHOT_STALE_OR_UNAVAILABLE"];
 return parsed.data.checks.filter(c=>c.reason!=="OK").map(c=>c.service+": "+c.reason+(c.service==="server_disk"||c.service==="server_memory"?" ("+c.ms+" %)":""));
}
