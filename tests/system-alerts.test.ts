import {test} from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";
test("operational mail uses existing SMTP and fixed dedicated recipient",()=>{const s=readFileSync("src/lib/store-mail-transport.ts","utf8").split("export async function sendSystemAlertMail")[1];assert.match(s,/enesunal700@gmail.com/);assert.match(s,/loadStoreMailSettings/);assert.match(s,/requireTLS:true/);assert.doesNotMatch(s,/sendStoreOrderMail|adminOrderNotificationRecipients/)});
test("system job is authenticated and never executes on stock audit",()=>{const s=readFileSync("app/api/internal/stock-reservations/route.ts","utf8");assert.ok(s.indexOf("timingSafeEqual(supplied,expected)")<s.indexOf("after(runSystemAlerts)"));assert.match(s,/if\(!dryRun\)after/);const a=readFileSync("src/lib/system-alerts.ts","utf8");assert.ok(a.indexOf("checkoutDiagnostic.create")<a.indexOf('sendSystemAlertMail("Sistem hata bildirimi"'));assert.match(a,/P2002/);assert.doesNotMatch(a,/orderId|capturePayment|createOrder/)});

import {monitorAlertReasons,monitorServices} from "../src/lib/system-monitor-schema";
test("independent monitor alerts are fresh, bounded and include disk usage",()=>{
 const now=Date.parse("2026-11-27T23:32:00Z");
 const snapshot={time:new Date(now).toISOString(),checks:monitorServices.map(service=>({service,status:service==="server_disk"?503:200,ms:service==="server_disk"?92:200,reason:service==="server_disk"?"DISK_HIGH":"OK"}))};
 assert.deepEqual(monitorAlertReasons(snapshot,now),["server_disk: DISK_HIGH (92 %)"]);
 assert.deepEqual(monitorAlertReasons(snapshot,now+7*60000),["monitor: SNAPSHOT_STALE_OR_UNAVAILABLE"]);
 assert.deepEqual(monitorAlertReasons(null,now),["monitor: SNAPSHOT_STALE_OR_UNAVAILABLE"]);
 assert.deepEqual(monitorAlertReasons({...snapshot,checks:snapshot.checks.map(c=>({...c,reason:"OK"}))},now),[]);
 assert.deepEqual(monitorAlertReasons({...snapshot,checks:snapshot.checks.map(c=>({...c,reason:"raw secret"}))},now),["monitor: SNAPSHOT_STALE_OR_UNAVAILABLE"]);
});
