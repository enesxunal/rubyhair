import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(p:string)=>readFileSync(p,"utf8");

test("online withdrawal has explicit two-step confirmation and no reason requirement",()=>{
 const page=read("app/widerruf/page.tsx");
 const form=read("src/components/withdrawal-form.tsx");
 const footer=read("src/components/site-shell.tsx");
 const proxy=read("proxy.ts");
 assert.match(proxy,/publicPostApis=new Set\(\[[^\]]*"\/api\/widerruf"/);
 assert.match(page,/WithdrawalForm/);
 assert.match(form,/Weiter zur Bestätigung/);
 assert.match(form,/Widerruf bestätigen/);
 assert.match(form,/step==="confirm"/);
 assert.match(form,/Bestellnummer \/ Vertrag/);
 assert.doesNotMatch(form,/name="reason"/);
 assert.match(footer,/Vertrag widerrufen/);
});

test("withdrawal intake is durable, validated, anti-CSRF and rate limited",()=>{
 const api=read("app/api/widerruf/route.ts");
 const core=read("src/lib/withdrawal.ts");
 const schema=read("prisma/schema.prisma");
 const migration=read("prisma/migrations/20261118184500_withdrawal_requests/migration.sql");
 assert.match(api,/withdrawalInput.safeParse\(payload\)/);
 assert.match(api,/ORIGIN_NOT_ALLOWED/);
 assert.match(api,/emailCount>=8\|\|ipCount>=25/);
 assert.match(api,/db.withdrawalRequest.create/);
 assert.ok(api.indexOf("withdrawalRequest.create")<api.indexOf("sendWithdrawalAcknowledgment(entry)"));
 assert.match(core,/return z|withdrawalInput=z.object/);
 assert.match(core,/receivedAt.toISOString/);
 assert.match(core,/accepted.includes\(request.email\)/);
 assert.match(schema,/model WithdrawalRequest/);
 assert.match(migration,/CREATE TABLE "withdrawal_requests"/);
});

test("acknowledgment contains original declaration, timestamp and retry protection",()=>{
 const core=read("src/lib/withdrawal.ts");
 const worker=read("app/api/internal/customer-jobs/route.ts");
 assert.match(core,/Eingangsbestätigung des Widerrufs/);
 assert.match(core,/Eingang UTC:/);
 assert.match(core,/Die rechtliche Wirksamkeit|rechtliche Wirksamkeit/);
 assert.match(core,/messageId:"<rubyhair-widerruf-"/);
 assert.match(core,/retryWithdrawalAcknowledgments/);
 assert.match(worker,/retryWithdrawalAcknowledgments\(3\)/);
});
