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
    await getPrisma().$transaction(async tx=>{
      for(const change of changes){
        const where={provider_environment_field:{provider,environment,field:change.field}};
        if(change.value===null){
          await tx.paymentIntegrationSetting.deleteMany({where:{provider,environment,field:change.field}});
        }else{
          const encrypted=encryptPaymentValue(provider,environment,change.field,change.value);
          await tx.paymentIntegrationSetting.upsert({
            where,create:{provider,environment,field:change.field,...encrypted},
            update:encrypted
          });
        }
      }
    });
  }
  revalidatePath("/admin/zahlungen");
  redirect("/admin/zahlungen?status="+(changes.length?"saved":"unchanged")+"&provider="+provider+"&mode="+environment);
}
