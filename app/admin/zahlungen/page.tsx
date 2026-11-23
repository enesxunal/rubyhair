import type {Metadata} from "next";
import {ShieldCheck,LockKeyhole,AlertCircle,CheckCircle2,ArrowRight} from "lucide-react";
import {redirect} from "next/navigation";
import {isAdmin} from "@/lib/admin-auth";
import {getPrisma} from "@/lib/prisma";
import {databaseConfigured} from "@/lib/prisma";
import {paymentVaultConfigured,loadPaymentValue} from "@/lib/payment-secrets";
import {paymentSettingsSpec,paymentProviders,paymentEnvironments} from "@/lib/payment-settings-spec";
import {savePaymentSettingsAction} from "../payment-actions";
import {publicCheckoutMode} from "@/lib/customer-checkout";
import AdminShell from "../admin-shell";

export const metadata:Metadata={title:"Zahlungen | Ruby Hair Verwaltung",robots:{index:false,follow:false}};
export const runtime="nodejs";export const dynamic="force-dynamic";
export default async function PaymentsReadiness({
  searchParams
}:{searchParams:Promise<{status?:string;provider?:string;mode?:string}>}){
  if(!await isAdmin())redirect("/admin/login");
  const params=await searchParams;
  const ready=databaseConfigured()&&paymentVaultConfigured();
  const publicPayments=["public","payments_public","klarna_public"].includes(publicCheckoutMode());
  // Read-only comparison within the authenticated server. Never render the
  // stored Merchant ID or expose the vault key to the browser or logs.
  const portalMerchantIds=["K6701613","K6712909"] as const;
  type MatchResult="match"|"mismatch"|"unavailable";
  let merchantIdMatches:Record<(typeof portalMerchantIds)[number],MatchResult>={
    K6701613:"unavailable",K6712909:"unavailable"
  };
  try{
    const storedMerchantId=await loadPaymentValue("klarna","live","merchantId");
    if(storedMerchantId?.trim()){
      const normalized=storedMerchantId.trim().toUpperCase();
      merchantIdMatches={
        K6701613:normalized===portalMerchantIds[0]?"match":"mismatch",
        K6712909:normalized===portalMerchantIds[1]?"match":"mismatch"
      };
    }
  }catch{
    // Never return decrypted values or log secrets, even in failure.
  }

  const saved=await getPrisma().paymentIntegrationSetting.findMany({
    where:{provider:{in:paymentProviders}},
    select:{provider:true,environment:true,field:true,updatedAt:true}
  });
  const savedKeys=new Set(saved.map(v=>[v.provider,v.environment,v.field].join(":")));
  const status=params.status==="saved"?"Einstellungen verschlüsselt gespeichert. Gespeicherte API-Felder müssen separat getestet werden.":
    params.status==="unchanged"?"Keine Änderungen vorgenommen.":null;
  return <AdminShell current="payments" title="Zahlungen & Integrationen."
    description="PayPal, Klarna und DHL Zugangsdaten sicher verwalten. Kundenzahlungen sind aktiv; DHL-Etiketten benötigen separat geprüfte Zugangsdaten.">
    <section className="rh-studio-payments-head">
      <div><span className="rh-studio-eyebrow"><ShieldCheck size={14}/> LIVE INTEGRATION / SICHER</span>
       <h2>Zugangsdaten sicher verwalten.<br/><em>{publicPayments?"PayPal & Klarna live.":"Checkout in Vorbereitung."}</em></h2>
       <p>API-Zugänge für Provider geschützt vorbereiten. Ein gespeicherter Schlüssel ist noch keine verifizierte Zahlungsintegration.</p>
      </div><LockKeyhole size={44} strokeWidth={1.2}/>
    </section>
    <div className="rh-studio-payment-steps">
      <div><span><CheckCircle2 size={17}/> 01 / DATENBANK</span><strong>{ready?"Verschlüsselter Speicher bereit":"Verschlüsselter Speicher fehlt"}</strong><small>Serverseitig, keine Klartext-Anzeige</small></div>
      <div><span><AlertCircle size={17}/> 02 / PROVIDER-DATEN</span><strong>{saved.length} Felder gespeichert</strong><small>Kein Live-Status oder Zahlungsnachweis</small></div>
      <div><span><LockKeyhole size={17}/> 03 / TRANSAKTIONEN</span><strong>{publicPayments?"Kundencheckout aktiviert":"Checkout nicht öffentlich"}</strong><small>DHL-Versandlabel bleibt bis zur Freigabe deaktiviert</small></div>
    </div>
    {!ready&&<p role="alert" className="rh-admin-warning">
      Verschlüsselte Speicherung nicht eingerichtet. In der Serverumgebung muss RUBY_PAYMENT_SETTINGS_KEY
      (32 Byte, base64url) gesetzt und die Datenbankmigration eingespielt werden. Speichern ist bis dahin gesperrt.
    </p>}
    {status&&<p role="status" className="rh-admin-success">{status}</p>}
    <p className="rh-admin-warning">Wichtig: PayPal und Klarna werden bereits im aktuellen Checkout angeboten. Die gespeicherten DHL-Daten ersetzen keine DHL-API-Freigabe. Bis alle sechs DHL-Live-Felder, das Paketgewicht und die Versandfreigabe geprüft wurden, bleibt die automatische Etikettenerstellung deaktiviert.</p>
    <section className="rh-admin-panel-card" id="klarna-merchant-match" aria-label="Klarna Merchant ID Kontovergleich" style={{margin:"20px 0"}}>
      <div className="rh-admin-card-title"><div><span>KLARNA / LIVE-KONTOABGLEICH</span><h2>Ist dieses Klarna-Konto mit Ruby Hair verknüpft?</h2></div><ShieldCheck size={22}/></div>
      <p className="rh-admin-muted">Abgleich mit den beiden Ruby Hair Extensions Konten im Klarna Merchant Portal. Der verschlüsselte Merchant ID wird ausschließlich serverseitig verglichen, niemals angezeigt.</p>
      {portalMerchantIds.map(id=>{
        const result=merchantIdMatches[id];
        return <div key={id} style={{padding:"10px 0",borderBottom:"1px solid #eee"}}>
          <strong>Klarna Merchant ID {id}</strong>
          <p data-merchant-id={id} data-merchant-match={result} role="status" style={{fontSize:15,fontWeight:650,margin:"6px 0",color:result==="match"?"#246c44":"#8e485e"}}>
            {result==="match"?"BESTÄTIGT: im Shop gespeicherte Merchant ID stimmt überein.":
             result==="mismatch"?"ABWEICHUNG: Die gespeicherte Merchant ID stimmt nicht überein.":
             "NICHT BESTÄTIGT: Die Merchant ID konnte nicht geprüft werden."}
          </p>
        </div>;
      })}
      <small>Dieser reine Lesevergleich ändert weder Klarna-Anmeldedaten noch Shop-Bestellungen, Zahlungen oder Einstellungen.</small>
    </section>
    <div className="rh-admin-payment-sections">
      {paymentProviders.map(provider=>{
        const definition=paymentSettingsSpec[provider];
        return <section className="rh-admin-panel-card" key={provider}>
          <div className="rh-admin-card-title">
            <div><span>INTEGRATION / {provider.toUpperCase()}</span><h2>{definition.label}</h2></div>
            <span>{definition.fields.length} Felder</span>
          </div>
          <p className="rh-admin-muted">{definition.explanation}</p>
          <div className="rh-studio-provider-note">
           <span>{saved.filter(v=>v.provider===provider).length} gespeicherte Einstellungen</span>
           <span>{provider==="dhl"?"DHL-Labels: nicht freigegeben":publicPayments?"Kundenzahlungen im Shop aktiv":"Provider-Zugang prüfen"} <ArrowRight size={13}/></span>
          </div>
          {(provider==="bank"?["live"] as const:paymentEnvironments).map(environment=>
            <form action={savePaymentSettingsAction} key={environment} className="rh-admin-credentials-form" autoComplete="off">
              <input type="hidden" name="provider" value={provider}/>
              <input type="hidden" name="environment" value={environment}/>
              <div className="rh-admin-credentials-heading">
                <strong>{environment==="sandbox"?"TEST / SANDBOX":"LIVE / PRODUKTION"}</strong>
                <small>Zugangsdaten werden nie im Klartext zurückgegeben</small>
              </div>
              <div className="rh-admin-credentials-grid">
                {definition.fields.map(field=>{
                  const hasValue=savedKeys.has([provider,environment,field.name].join(":"));
                  return <div className="rh-admin-credential-item" key={field.name}>
                    <label htmlFor={provider+"-"+environment+"-"+field.name}>
                      <span>{field.label}</span><small>{hasValue?"Gespeichert":"Noch nicht gespeichert"}</small>
                    </label>
                    <input
                      type={field.secret?"password":"text"}
                      id={provider+"-"+environment+"-"+field.name}
                      name={"setting:"+field.name}
                      maxLength={2048} autoComplete="off" spellCheck={false}
                      placeholder={hasValue?"Neuen Wert eingeben, um zu ersetzen":"Zugangswert eingeben"}
                      disabled={!ready}
                    />
                    {hasValue&&<label className="rh-admin-credential-delete">
                      <input type="checkbox" name={"delete:"+field.name} disabled={!ready}/> Gespeicherten Wert entfernen
                    </label>}
                  </div>;
                })}
              </div>
              <div className="rh-admin-credentials-footer">
                <span>{provider==="dhl"?"Nur intern · DHL-Labels weiterhin deaktiviert":"Nur intern · keine neuen Zahlungen durch Speichern"}</span>
                <button type="submit" disabled={!ready}>Einstellungen speichern</button>
              </div>
            </form>)}
        </section>;
      })}
    </div>
    <section className="rh-admin-panel-card">
      <div className="rh-admin-card-title"><div><span>DHL LIVE-ZUGANG</span><h2>Was für automatische Labels noch fehlt</h2></div></div>
      <p className="rh-admin-muted">Die DHL Paket DE Versenden API erfordert einen freigeschalteten Developer-Zugang mit Client ID und Secret, Geschäftskundenportal-Zugang, bestätigte Abrechnungsnummer sowie ein geprüftes Paketgewicht. Für bereits autorisierte Klarna-Bestellungen darf der Einzug nur nach tatsächlicher Paketübergabe bestätigt werden.</p>
      <p><a href="/admin/dhl">DHL Zugang & Versandstatus prüfen</a></p>
      <p><a href="https://developer.dhl.com/" target="_blank" rel="noopener noreferrer">DHL Developer Portal öffnen</a></p>
    </section>
  </AdminShell>;
}
