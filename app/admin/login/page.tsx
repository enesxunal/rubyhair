import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminConfigured, isAdmin } from "@/lib/admin-auth";
import { loginAction } from "../actions";
export const metadata:Metadata={title:"Admin Anmeldung",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function AdminLogin({searchParams}:{searchParams:Promise<{error?:string}>}){
  if(await isAdmin())redirect("/admin");
  const configured=adminConfigured();
  if(!configured) console.warn("RUBY_ADMIN_READINESS",{
    database: Boolean(process.env.DATABASE_URL?.startsWith("postgres")),
    email: Boolean(process.env.ADMIN_EMAIL?.includes("@")),
    passwordHashFormat: Boolean(process.env.ADMIN_PASSWORD_HASH?.startsWith("$2")),
    sessionLength: (process.env.SESSION_SECRET?.length||0)>=32
  });
  const {error}=await searchParams;
  return <main className="rh-admin-login">
    <div className="rh-admin-eyebrow">RUBY HAIR / VERWALTUNG</div>
    <h1>Admin Anmeldung</h1>
    {!configured?<div role="status" className="rh-admin-notice">
      <strong>Der Administratorzugang ist noch nicht eingerichtet.</strong>
      <p>Die eigene PostgreSQL-Datenbank und die geheimen Anmeldedaten müssen zuerst auf dem Server eingerichtet werden. Es gibt keinen Standardzugang.</p>
    </div>:
    <form action={loginAction} className="rh-admin-login-form">
      {error&&<p role="alert" className="rh-admin-error">
        {error==="locked"?"Zu viele Versuche. Bitte später erneut versuchen.":"Anmeldedaten ungültig."}
      </p>}
      <label>E-Mail<input type="email" name="email" autoComplete="username" required maxLength={254}/></label>
      <label>Passwort<input type="password" name="password" autoComplete="current-password" required maxLength={256}/></label>
      <button type="submit">Sicher anmelden</button>
    </form>}
  </main>;
}
