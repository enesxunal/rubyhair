import "server-only";
import {loadPaymentValues, paymentVaultConfigured} from "@/lib/payment-secrets";
import {databaseConfigured} from "@/lib/prisma";
import {
  buildDhlTokenRequest, dhlMissingFields, dhlRequiredFields,
  type DhlCredentials, type DhlEnvironment
} from "@/lib/dhl-auth-contract";

/**
 * Read-only integration readiness. Secrets stay in the server's encrypted vault.
 * A legacy Shiptastic / WooCommerce password is NOT a DHL OAuth client secret.
 */
async function dhlCredentials(environment:DhlEnvironment):Promise<Partial<DhlCredentials>> {
  if (!databaseConfigured() || !paymentVaultConfigured()) return {};
  const values=await loadPaymentValues("dhl",environment,dhlRequiredFields);
  return Object.fromEntries(dhlRequiredFields.map((key,index)=>[key,values[index]||""]));
}

export async function getDhlIntegrationReadiness(environment:DhlEnvironment) {
  const configured = databaseConfigured() && paymentVaultConfigured();
  if (!configured) return {vaultConfigured:false, credentialsComplete:false, missing:[...dhlRequiredFields], liveEnabled:false};
  const values = await dhlCredentials(environment);
  const missing = dhlMissingFields(values);
  return {vaultConfigured:true, credentialsComplete:missing.length===0, missing, liveEnabled:false};
}

/**
 * No caller may use this to buy labels or charge a customer.
 * Explicit server-side test flags are required for OAuth verification.
 * Never return or log the access token in a response, browser or server logs.
 */
/** An explicitly admin-triggered authentication check; never buys a parcel label. */
export async function checkDhlAuthFromAdmin(environment:DhlEnvironment, doFetch:typeof fetch=fetch):Promise<"authenticated"|"credentials_missing"|"unauthorized"|"unavailable"> {
  const credentials=await dhlCredentials(environment);
  if(dhlMissingFields(credentials).length)return "credentials_missing";
  try{
    const request=buildDhlTokenRequest(environment,credentials as DhlCredentials);
    const response=await doFetch(request.url,{...request.init,signal:AbortSignal.timeout(12000),redirect:"error"});
    if(response.status===401||response.status===403)return "unauthorized";
    if(!response.ok)return "unavailable";
    const payload:unknown=await response.json();
    return payload&&typeof payload==="object"&&"access_token" in payload&&typeof payload.access_token==="string"&&payload.access_token.length>10?
      "authenticated":"unavailable";
  }catch{return "unavailable"}
}

export async function testDhlAuthentication(environment:DhlEnvironment, doFetch:typeof fetch=fetch):Promise<boolean> {
  if (process.env.RUBY_DHL_AUTH_PROBE_ENABLED!=="true") throw new Error("DHL_AUTH_PROBE_DISABLED");
  if (environment==="live" && process.env.RUBY_DHL_LIVE_AUTH_PROBE_ENABLED!=="true")
    throw new Error("DHL_LIVE_AUTH_PROBE_DISABLED");
  const creds = await dhlCredentials(environment);
  if (dhlMissingFields(creds).length) throw new Error("DHL_CREDENTIALS_INCOMPLETE");
  const {url, init} = buildDhlTokenRequest(environment,creds as DhlCredentials);
  const response = await doFetch(url,{...init,signal:AbortSignal.timeout(10000),redirect:"error"});
  if (!response.ok) return false;
  const payload:unknown = await response.json();
  return Boolean(payload && typeof payload==="object" &&
    "access_token" in payload && typeof payload.access_token==="string" && payload.access_token.length>0);
}
