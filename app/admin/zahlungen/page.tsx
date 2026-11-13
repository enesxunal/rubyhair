import type {Metadata} from "next";
import {ShieldCheck,LockKeyhole,AlertCircle,CheckCircle2,ArrowRight} from "lucide-react";
import {redirect} from "next/navigation";
import {isAdmin} from "@/lib/admin-auth";
import {getPrisma} from "@/lib/prisma";
import {databaseConfigured} from "@/lib/prisma";
import {paymentVaultConfigured} from "@/lib/payment-secrets";
import {paymentSettingsSpec,paymentProviders,paymentEnvironments} from "@/lib/payment-settings-spec";
import {savePaymentSettingsAction} from "../payment-actions";
import AdminShell from "../admin-shell";

export const metadata:Metadata={title:"Zahlungen | Ruby Hair Verwaltung",robots:{index:false,follow:false}};
export const runtime="nodejs";export const dynamic="force-dynamic";
export default async function PaymentsReadiness({
  searchParams
}:{searchParams:Promise<{status?:string;provider?:string;mode?:string}>}){
  if(!await isAdmin())redirect("/admin/login");
  const params=await searchParams;
  const ready=databaseConfigured()&&paymentVaultConfigured();
  const saved=await getPrisma().paymentIntegrationSetting.findMany({
    select:{provider:true,environment:true,field:true,updatedAt:true}
  });
  const savedKeys=new Set(saved.map(v=>[v.provider,v.environment,v.field].join(":")));
  const status=params.status==="saved"?"Änderungen sicher gespeichert. Die Zahlungsarten bleiben deaktiviert.":
    params.status==="unchanged"?"Keine Änderungen vorgenommen.":null;
  return <AdminShell current="payments" title="Zahlungen & Integrationen."
    description="Zugangsdaten für PayPal, Kartenzahlungen, Klarna und Banküberweisung geschützt hinterlegen. Noch keine Live-Zahlungen.">
    <section className="rh-studio-payments-head">
      <div><span className="rh-studio-eyebrow"><ShieldCheck size={14}/> PAYMENT READINESS / VORSCHAU</span>
       <h2>Zugangsdaten sicher verwalten.<br/><em>Live-Zahlungen bleiben gesperrt.</em></h2>
       <p>API-Zugänge für Provider geschützt vorbereiten. Ein gespeicherter Schlüssel ist noch keine verifizierte Zahlungsintegration.</p>
      </div><LockKeyhole size={44} strokeWidth={1.2}/>
    </section>
    <div className="rh-studio-payment-steps">
      <div><span><CheckCircle2 size={17}/> 01 / DATENBANK</span><strong>{ready?"Verschlüsselter Speicher bereit":"Verschlüsselter Speicher fehlt"}</strong><small>Serverseitig, keine Klartext-Anzeige</small></div>
      <div><span><AlertCircle size={17}/> 02 / PROVIDER-DATEN</span><strong>{saved.length} Felder gespeichert</strong><small>Kein Live-Status oder Zahlungsnachweis</small></div>
      <div><span><LockKeyhole size={17}/> 03 / TRANSAKTIONEN</span><strong>Noch nicht aktiviert</strong><small>Adapter, Webhooks und Sandbox-QA ausstehend</small></div>
    </div>
    {!ready&&<p role="alert" className="rh-admin-warning">
      Verschlüsselte Speicherung nicht eingerichtet. In der Serverumgebung muss RUBY_PAYMENT_SETTINGS_KEY
      (32 Byte, base64url) gesetzt und die Datenbankmigration eingespielt werden. Speichern ist bis dahin gesperrt.
    </p>}
    {status&&<p role="status" className="rh-admin-success">{status}</p>}
    <p className="rh-admin-warning">Wichtig: Die alte WooCommerce-API zeigt nur angebotene Zahlungsarten. Hier gespeicherte API-Codes
      aktivieren keine Transaktionen. Provideranbindung, Webhook-Prüfung und Sandbox-Test sind separat erforderlich.</p>
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
           <span>Keine Transaktionen aktiviert <ArrowRight size={13}/></span>
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
                <span>Nur intern · Keine Kundenzahlung aktiviert</span>
                <button type="submit" disabled={!ready}>Einstellungen speichern</button>
              </div>
            </form>)}
        </section>;
      })}
    </div>
    <section className="rh-admin-panel-card">
      <div className="rh-admin-card-title"><div><span>LETZTER SCHRITT</span><h2>Was nach dem Speichern folgt</h2></div></div>
      <p className="rh-admin-muted">Wir prüfen Konto-Berechtigungen, erstellen die eigenständige Serveranbindung
        und verifizieren Testzahlungen sowie signierte Webhooks. Erst danach kann der echte Checkout freigeschaltet werden.
        Der bestehende rubyhair.de Shop bleibt unverändert.</p>
    </section>
  </AdminShell>;
}
