// Public field labels only. DO NOT place provider credentials or secrets in this file.
export const paymentSettingsSpec={
  paypal:{
    label:"PayPal",
    explanation:"REST API Zugänge aus dem PayPal Developer Dashboard. Nicht das WordPress-Plugin-Passwort.",
    fields:[
      {name:"clientId",label:"REST Client ID",secret:true},
      {name:"clientSecret",label:"REST Client Secret",secret:true},
      {name:"webhookId",label:"Webhook ID",secret:true}
    ]
  },
  card:{
    label:"Kartenzahlung / PSP",
    explanation:"Separater Stripe- oder PSP-Zugang. WooPayments Plugin-Credentials sind nicht automatisch verwendbar.",
    fields:[
      {name:"publicKey",label:"Publishable Key / Public ID",secret:false},
      {name:"secretKey",label:"Server Secret Key",secret:true},
      {name:"webhookSecret",label:"Webhook Signing Secret",secret:true}
    ]
  },
  klarna:{
    label:"Klarna",
    explanation:"Nur wenn ein eigenständiger Klarna-Zugang bestätigt ist; Doppelanbindung vermeiden.",
    fields:[
      {name:"username",label:"Merchant API Username",secret:true},
      {name:"password",label:"Merchant API Password",secret:true},
      {name:"merchantId",label:"Merchant ID",secret:true}
    ]
  },
  trustly:{
    label:"Trustly",
    explanation:"Nur eintragen, wenn die direkte API-Nutzung vom Zahlungsanbieter bestätigt wurde.",
    fields:[
      {name:"merchantId",label:"Merchant ID",secret:true},
      {name:"apiKey",label:"API Key / Provider Token",secret:true}
    ]
  },
  bank:{
    label:"Banküberweisung / Vorkasse",
    explanation:"Nur nach Abstimmung mit dem Händler. Kontodaten werden verschlüsselt gespeichert.",
    fields:[
      {name:"accountHolder",label:"Kontoinhaber",secret:false},
      {name:"iban",label:"IBAN",secret:true},
      {name:"bic",label:"BIC / SWIFT",secret:false},
      {name:"paymentNote",label:"Verwendungszweck-Hinweis",secret:false}
    ]
  }
} as const;
export type PaymentProvider=keyof typeof paymentSettingsSpec;
export const paymentProviders=Object.keys(paymentSettingsSpec) as PaymentProvider[];
export type PaymentEnvironment="sandbox"|"live";
export const paymentEnvironments:PaymentEnvironment[]=["sandbox","live"];
export function paymentFieldAllowed(provider:PaymentProvider,field:string):boolean{
  return paymentSettingsSpec[provider].fields.some(f=>f.name===field);
}
