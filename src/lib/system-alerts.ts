import "server-only";
import {createHash,randomUUID} from "node:crypto";
import {getPrisma} from "@/lib/prisma";
import {sendSystemAlertMail} from "@/lib/store-mail-transport";
import {monitorSnapshotId,monitorAlertReasons} from "@/lib/system-monitor-schema";
import {systemAreas,systemCodes} from "@/lib/system-diagnostic-policy";
const stage="system:mail";
function alertId(key:string){const h=createHash("sha256").update("rubyhair-system-alert:"+key).digest("hex");return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`}
export async function testSystemAlertMail(){await sendSystemAlertMail("Sistem izleme testi","Bu mesaj Ruby Hair sitesinin mevcut IONOS SMTP servisi tarafindan gonderilmistir. Gercek siparis veya odeme olusturulmadi.",randomUUID())}
// Invoked only by the existing authenticated five-minute scheduler. No new public mail endpoint.
// Persist a durable claim before SMTP; ambiguous delivery is not retried immediately.
export async function runSystemAlerts(){
 try{
  const db=getPrisma(),now=Date.now(),since=new Date(now-20*60000);
  const rows=await db.checkoutDiagnostic.findMany({where:{createdAt:{gte:since},origin:"server",stage:{in:systemAreas.map(a=>"system:"+a)},code:{in:[...systemCodes]}},select:{stage:true,code:true},take:100,orderBy:{createdAt:"desc"}});
  const failures=new Set(rows.map(r=>r.stage.slice(7)+": "+r.code));
  // Mirror only the authenticated, bounded independent snapshot. Its raw JSON
  // never enters mail; a missing or stale mirror is itself a warning.
  if(process.env.RUBY_SYSTEM_MONITOR_SECRET){
   const snapshot=await db.checkoutDiagnostic.findUnique({where:{id:monitorSnapshotId},select:{code:true}});
   let raw:unknown=null;try{raw=JSON.parse(snapshot?.code||"null")}catch{}
   for(const reason of monitorAlertReasons(raw,now))failures.add(reason);
  }

  // Read-only HTTP/content checks. Do not create an order or call payment capture.
  await Promise.all([["checkout","/kasse","Almost"],["catalog","/api/catalog",'"source":"postgresql"']].map(async ([area,path,marker])=>{try{const response=await fetch("https://rubyhair.de"+path,{cache:"no-store",redirect:"error",signal:AbortSignal.timeout(6000),headers:{"User-Agent":"RubyHair-System-Check/1.0"}});const body=await response.text();if(response.status!==200||!body.includes(marker))failures.add(area+": HTTP_OR_CONTENT_FAILED")}catch{failures.add(area+": NETWORK_OR_TIMEOUT")}}));
  console.info("RUBY_SYSTEM_ALERT_CHECK",{failures:failures.size});
  if(!failures.size)return;
  const id=alertId(String(Math.floor(now/(4*3600000))));
  try{await db.checkoutDiagnostic.create({data:{id,method:"unknown",stage,code:"MAIL_CLAIMED",origin:"server"}})}catch(e){if((e as {code?:string}).code==="P2002")return;throw e}
  try{await sendSystemAlertMail("Sistem hata bildirimi",`UTC: ${new Date(now).toISOString()}\n\n${[...failures].sort().join("\n")}\n\nhttps://rubyhair.de/admin/system\nMusteri veya odeme verisi icermez.`,id);await db.checkoutDiagnostic.update({where:{id},data:{code:"MAIL_ACCEPTED"}});console.info("RUBY_SYSTEM_MAIL_ACCEPTED")}catch{await db.checkoutDiagnostic.update({where:{id},data:{code:"MAIL_UNCONFIRMED"}}).catch(()=>{});console.warn("RUBY_SYSTEM_MAIL_UNCONFIRMED")}
 }catch{console.warn("RUBY_SYSTEM_ALERT_JOB_UNAVAILABLE")}
}
