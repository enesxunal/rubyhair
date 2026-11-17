/** DHL Parcel Germany authentication contract. No browser / UI imports. */
export type DhlEnvironment = "sandbox" | "live";
export type DhlCredentials = {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  accountNumber: string;
  billingNumber: string;
};

export const dhlAuthUrls: Record<DhlEnvironment, string> = {
  sandbox: "https://api-sandbox.dhl.com/parcel/de/account/auth/ropc/v1/token",
  live: "https://api-eu.dhl.com/parcel/de/account/auth/ropc/v1/token"
};

export const dhlRequiredFields = ["clientId", "clientSecret", "username", "password", "accountNumber", "billingNumber"] as const;

export function dhlMissingFields(values: Partial<DhlCredentials>): string[] {
  return dhlRequiredFields.filter(key => !(values[key] || "").trim());
}

export function buildDhlTokenRequest(environment: DhlEnvironment, values: DhlCredentials) {
  if (dhlMissingFields(values).length) throw new Error("DHL_CREDENTIALS_INCOMPLETE");
  const body = new URLSearchParams({
    grant_type: "password",
    username: values.username,
    password: values.password,
    client_id: values.clientId,
    client_secret: values.clientSecret
  });
  return {
    url: dhlAuthUrls[environment],
    init: {
      method: "POST" as const,
      headers: {"Content-Type": "application/x-www-form-urlencoded", Accept: "application/json"},
      body: body.toString(),
      cache: "no-store" as const
    }
  };
}
