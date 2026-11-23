"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {z} from "zod";
import {isAdmin} from "@/lib/admin-auth";
import {getPrisma} from "@/lib/prisma";
import {encryptPaymentValue,paymentVaultConfigured} from "@/lib/payment-secrets";
import {paymentSettingsSpec,paymentFieldAllowed,paymentProviders,
  paymentEnvironments,type PaymentProvider,type PaymentEnvironment} from "@/lib/payment-settings-spec";

const requestSchema=z.object({
  provider:z.enum(paymentProviders as [PaymentProvider,...PaymentProvider[]]),
  environment:z.enum(paymentEnvironments as [PaymentEnvironment,...PaymentEnvironment[]])
});

export async function savePaymentSettingsAction(formData:FormData){
  if(!await isAdmin())redirect("/admin/login");
  if(!paymentVaultConfigured())throw new Error("Sichere Speicherung ist noch nicht eingerichtet.");
  const params=requestSchema.safeParse({
    provider:formData.get("provider"),environment:formData.get("environment")
  });
  if(!params.success)throw new Error("Ungültiger Zahlungsanbieter");
  const {provider,environment}=params.data;
  if(provider==="bank"&&environment!=="live")throw new Error("Bankdaten sind nur für den Live-Modus vorgesehen");
  const changes:{field:string;value:string|null}[]=[];
  for(const field of paymentSettingsSpec[provider].fields){
    if(!paymentFieldAllowed(provider,field.name))continue;
    const submitted=formData.get("setting:"+field.name);
    const deletion=formData.get("delete:"+field.name)==="on";
    if(typeof submitted!=="string"||submitted.length>2048)
      throw new Error("Ungültige Eingabe für "+field.name);
    const value=submitted.trim();
    if(deletion&&value)throw new Error("Ein Feld kann nicht gleichzeitig überschrieben und gelöscht werden");
    if(value)changes.push({field:field.name,value});
    else if(deletion)changes.push({field:field.name,value:null});
  }
  if(changes.length){
    const db=getPrisma();
    // Batch transactions avoid Prisma's 2s interactive-transaction start deadline.
    // With the single-connection serverless pool, the former callback transaction
    // often failed before acquiring a connection, losing the submitted DHL fields.
    // All changes remain atomic; never log their plaintext values.
    const persist=()=>db.$transaction(changes.map(change=>{
      if(change.value===null){
        return db.paymentIntegrationSetting.deleteMany({where:{provider,environment,field:change.field}});
      }
      const encrypted=encryptPaymentValue(provider,environment,change.field,change.value);
      return db.paymentIntegrationSetting.upsert({
        where:{provider_environment_field:{provider,environment,field:change.field}},
        create:{provider,environment,field:change.field,...encrypted},
        update:encrypted
      });
    }));
    for(let attempt=0;attempt<3;attempt++){
      try{await persist();break;}catch(error){
        // Upsert/deleteMany are idempotent, and the batch is all-or-nothing.
        const code=(error as {code?:string}).code;
        if(attempt===2||!code||!["P1001","P2024","P2028"].includes(code))throw error;
        await new Promise<void>(resolve=>setTimeout(resolve,300*(attempt+1)));
      }
    }
  }
  revalidatePath("/admin/zahlungen");
  redirect("/admin/zahlungen?status="+(changes.length?"saved":"unchanged")+"&provider="+provider+"&mode="+environment);
}
