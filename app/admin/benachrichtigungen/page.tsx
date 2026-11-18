import type {Metadata} from "next";
import {redirect} from "next/navigation";
import {Mail,ShieldCheck,LockKeyhole,AlertTriangle,CheckCircle2,Send,Eye} from "lucide-react";
import {isAdmin} from "@/lib/admin-auth";
import {loadStoreMailSettings,storeMailDefaults} from "@/lib/store-mail-settings";
import {getPrisma} from "@/lib/prisma";
import {orderMailStages,renderOrderMail} from "@/lib/order-mail-templates";
import AdminShell from "../admin-shell";
import {saveStoreMailAction,sendStoreMailTestAction} from "../mail-actions";
export const metadata:Metadata={title:"E-Mails & Vorlagen | Ruby Hair Verwaltung",robots:{index:false,follow:false}};
export const runtime="nodejs";export const dynamic="force-dynamic";
export default async function MailAdmin({searchParams}:{searchParams:Promise<{status?:string}>}){
 if(!await isAdmin())redirect("/admin/login");
 let config:Awaited<ReturnType<typeof loadStoreMailSettings>>={ready:false,stored:false,recipient:storeMailDefaults.notify,password:null};
 let queued=0,dbUnavailable=false;
 try{
   config=await loadStoreMailSettings();
   queued=await getPrisma().orderNotification.count({where:{status:{in:["queued","needs_review"]}}});
 }catch(e){
   dbUnavailable=true;
   const code=(e as {code?:string}).code;
   console.error("RUBY_ADMIN_MAIL_READ_UNAVAILABLE",code==="P2024"||code==="P2028"?code:"OTHER");
 }
 const {status}=await searchParams;
 const messages:Record<string,string>={
  saved:"Einstellungen verschlüsselt gespeichert. Bitte anschließend den SMTP-Test durchführen.",
  "test-sent":"Test-E-Mail wurde vom SMTP-Server angenommen. Bitte Posteingang und Spam-Ordner überprüfen.",
  "test-failed":"Der SMTP-Test war nicht erfolgreich. Passwort, IONOS-Postfach und Serverberechtigung prüfen.",
  "test-invalid-recipient":"Bitte eine gültige Test-E-Mail-Adresse eingeben.",
  invalid:"Ungültige Eingaben. Bitte Passwort und Benachrichtigungsadresse überprüfen.",
  "save-unavailable":"Datenbank vorübergehend ausgelastet. Keine Änderung bestätigt. Bitte später erneut speichern.",
  "vault-missing":"Der verschlüsselte Speicher ist noch nicht bereit. RUBY_PAYMENT_SETTINGS_KEY serverseitig prüfen."
 };
 return <AdminShell current="emails" title="E-Mails & Benachrichtigungen."
   description="IONOS Mailzugang sicher hinterlegen, einen Test senden und die deutschen Bestellvorlagen prüfen.">
  <section className="rh-studio-payments-head">
    <div><span className="rh-studio-eyebrow"><Mail size={14}/> E-MAIL / IONOS SMTP</span>
      <h2>Dein Shop.<br/><em>Persönlich informiert.</em></h2>
      <p>Alle Shop-Nachrichten erhalten den Ruby Hair Look. Das alte WooCommerce-System bleibt bis zur Umstellung unverändert.</p>
    </div><Mail size={44} strokeWidth={1.2}/>
  </section>
  {status&&messages[status]&&<p className={status==="saved"||status==="test-sent"?"rh-admin-success":"rh-admin-warning"} role="status">{messages[status]}</p>}
  {dbUnavailable&&<p className="rh-admin-warning" role="alert">Die Datenbank ist gerade ausgelastet. Die Einstellungen konnten nicht geladen werden. Bitte die Seite später erneut öffnen.</p>}
  <div className="rh-studio-payment-steps">
    <div><span><ShieldCheck size={17}/> SMTP-VERSCHLÜSSELUNG</span><strong>{config.ready?"Schlüsselspeicher bereit":"Noch nicht verfügbar"}</strong><small>Passwort niemals im Klartext anzeigen</small></div>
    <div><span><LockKeyhole size={17}/> MAIL-PASSWORT</span><strong>{config.stored?"Sicher hinterlegt":"Noch nicht gespeichert"}</strong><small>IONOS Benutzer: {storeMailDefaults.user}</small></div>
    <div><span><Send size={17}/> BESTELL-AUTOMATIK</span><strong>{config.stored?"E-Mail-Versand bereit":"SMTP-Zugang fehlt"}</strong><small>{queued} wartende Benachrichtigungen · automatische Zustellung nach Zahlung</small></div>
  </div>
  <section className="rh-admin-panel-card" style={{marginTop:20}}>
    <div className="rh-admin-card-title"><div><span>POSTFACH / EINSTELLUNGEN</span><h2>IONOS SMTP einrichten</h2></div><LockKeyhole size={22}/></div>
    <p className="rh-admin-muted">Aus der bisherigen WooCommerce-Konfiguration übernommen: SMTP-Server <strong>smtp.ionos.de</strong>, Port <strong>587</strong>, STARTTLS, Absender <strong>info@rubyhair.de</strong>. Das Passwort bleibt serverseitig verschlüsselt.</p>
    {!config.ready&&<p className="rh-admin-warning" role="alert">Der verschlüsselte Schlüsselspeicher ist serverseitig nicht eingerichtet. Eingaben bleiben deaktiviert, bis dieser vorhanden ist.</p>}
    <form action={saveStoreMailAction} autoComplete="off" className="rh-admin-credentials-form">
      <div className="rh-admin-credentials-grid">
        <div className="rh-admin-credential-item">
          <label htmlFor="ruby-smtp-password"><span>IONOS SMTP Passwort</span><small>{config.stored?"Sicher gespeichert – leer lassen, um es beizubehalten":"Bitte aus dem IONOS-Postfach eintragen"}</small></label>
          <input id="ruby-smtp-password" name="smtpPassword" type="password" minLength={8} maxLength={512} autoComplete="new-password" spellCheck={false} placeholder={config.stored?"Neues Passwort (optional)":"IONOS Mail-Passwort"} disabled={!config.ready}/>
          {config.stored&&<label className="rh-admin-credential-delete"><input type="checkbox" name="removePassword" disabled={!config.ready}/> Passwort aus dem Speicher entfernen</label>}
        </div>
        <div className="rh-admin-credential-item">
          <label htmlFor="ruby-mail-recipient"><span>Empfänger der Shop-Benachrichtigungen</span><small>Altes WooCommerce: {storeMailDefaults.notify}</small></label>
          <input id="ruby-mail-recipient" name="notificationRecipient" type="email" required maxLength={254} defaultValue={config.recipient} autoComplete="off" spellCheck={false} disabled={!config.ready}/>
        </div>
      </div>
      <div className="rh-admin-credentials-footer"><span>Nur Administratoren · SMTP 587 / STARTTLS</span><button type="submit" disabled={!config.ready}>Zugangsdaten speichern</button></div>
    </form>
    <form action={sendStoreMailTestAction} style={{marginTop:20}}>
      <p className="rh-admin-muted">Der Test sendet nur an die hier angegebene Adresse. Er ändert nicht den regulären Shop-Benachrichtigungsempfänger und löst keine Zahlung oder Bestellung aus.</p>
      <div className="rh-admin-credential-item">
        <label htmlFor="ruby-test-mail-recipient">Test-E-Mail empfangen unter</label>
        <input id="ruby-test-mail-recipient" name="testRecipient" type="email" required maxLength={254} autoComplete="off" defaultValue={config.recipient} disabled={!config.ready||!config.stored}/>
      </div>
      <button type="submit" disabled={!config.ready||!config.stored} className="rh-admin-mail-test-button"><Send size={16}/> SMTP-Test-E-Mail senden</button>
    </form>
  </section>
  <section className="rh-admin-panel-card" style={{marginTop:22}}>
    <div className="rh-admin-card-title"><div><span>RUBY HAIR / E-MAIL DESIGN</span><h2>Vorlagen für jeden Bestellschritt</h2></div><Eye size={22}/></div>
    <p className="rh-admin-muted">Acht deutsche Vorlagen sind angelegt. Nach verifizierter Zahlung legt das System die E-Mails automatisch und wiederholsicher in die Versandwarteschlange. Erst ein erfolgreicher SMTP-Test bestätigt die tatsächliche Auslieferung.</p>
    <div className="rh-admin-mail-preview-grid">
      {orderMailStages.map(stage=>{
        const email=renderOrderMail(stage,{orderNumber:"RH-2026-1001",customerName:"Musterkundin",totalCents:14999,trackingNumber:"123456789012",carrier:"DHL"});
        return <details className="rh-admin-mail-preview" key={stage}>
          <summary><span><Mail size={17}/><b>{email.label}</b></span><span>Vorschau öffnen</span></summary>
          <p><strong>Betreff:</strong> {email.subject}</p>
          <iframe title={email.label+" E-Mail Vorschau"} srcDoc={email.html} sandbox="" loading="lazy" referrerPolicy="no-referrer"/>
        </details>;
      })}
    </div>
  </section>
  <p className="rh-admin-warning" style={{marginTop:22}}><AlertTriangle size={16}/> <strong>Wichtig:</strong> Auch nach einem erfolgreichen SMTP-Test bleibt der Live-Checkout deaktiviert, bis Zahlungen, Webhooks, Lagerbestände und der Bestellprozess end-to-end geprüft sind.</p>
 </AdminShell>;
}
