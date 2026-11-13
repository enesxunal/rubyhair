"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  isAdmin, clearAdminSession
} from "@/lib/admin-auth";
import { getPrisma } from "@/lib/prisma";
import { requireOrderTransition } from "@/lib/order-lifecycle";

export async function logoutAction(){
  await clearAdminSession();
  redirect("/admin/login");
}
const variantInput=z.object({
  id:z.string().uuid(),
  priceCents:z.coerce.number().int().min(1).max(1_000_000),
  stockQuantity:z.union([z.literal(""),z.coerce.number().int().min(0).max(1_000_000)]),
  active:z.boolean()
});
export async function saveVariantAction(formData:FormData){
  if(!await isAdmin())redirect("/admin/login");
  const parsed=variantInput.safeParse({
    id:formData.get("id"),
    priceCents:formData.get("priceCents"),
    stockQuantity:formData.get("stockQuantity"),
    active:formData.get("active")==="on"
  });
  if(!parsed.success)throw new Error("Ungültige Produktdaten");
  const {id,priceCents,stockQuantity,active}=parsed.data;
  const db=getPrisma();
  const existing=await db.variant.findUnique({
    where:{id},include:{product:{select:{slug:true}}}
  });
  if(!existing)throw new Error("Variante nicht gefunden");
  await db.variant.update({
    where:{id},
    data:{priceCents,stockQuantity:stockQuantity===""?null:stockQuantity,active}
  });
  revalidatePath("/kollektionen/"+existing.product.slug);
  revalidatePath("/produkt/"+existing.product.slug);
  revalidatePath("/admin");
  revalidatePath("/admin/produkte");
  revalidatePath("/api/catalog");
  redirect("/admin/produkte?updated=1");
}


// Elmas Triko-inspired single-submit product variant editor.
// Updates are atomic and reject stale rows, so two administrators cannot silently overwrite changes.
export async function saveVariantBatchAction(formData:FormData){
  if(!await isAdmin())redirect("/admin/login");
  const productId=z.string().uuid().parse(formData.get("productId"));
  const ids=formData.getAll("variantId");
  if(!ids.length||ids.length>80||ids.some(v=>typeof v!=="string"||!z.string().uuid().safeParse(v).success))
    throw new Error("Ungueltige Variantenliste");
  const names=ids as string[];
  if(new Set(names).size!==names.length)throw new Error("Doppelte Varianten-IDs");
  const required=(key:string)=>{
    const value=formData.get(key);
    if(typeof value!=="string")throw new Error("Fehlendes Feld: "+key);
    return value;
  };
  const cents=(s:string)=>{
    const match=/^(\d{1,5})(?:\.(\d{1,2}))?$/.exec(s);
    if(!match)throw new Error("Preis muss ein Eurobetrag mit maximal zwei Dezimalstellen sein");
    const amount=Number(match[1])*100+Number((match[2]||"").padEnd(2,"0"));
    if(amount<1||amount>1_000_000)throw new Error("Preis ausserhalb des erlaubten Bereichs");
    return amount;
  };
  const integer=(s:string)=>{
    if(!/^\d{1,7}$/.test(s)||Number(s)>1_000_000)throw new Error("Ungueltiger Bestand");
    return Number(s);
  };
  const optionalStock=(s:string)=>s===""?null:integer(s);
  const changes=names.map(id=>{
    const beforePrice=integer(required(id+":beforePriceCents"));
    const beforeStock=optionalStock(required(id+":beforeStock"));
    const beforeActive=required(id+":beforeActive")==="1";
    const priceCents=cents(required(id+":priceEUR"));
    const stockQuantity=optionalStock(required(id+":stockQuantity"));
    const active=formData.get(id+":active")==="on";
    return {id,beforePrice,beforeStock,beforeActive,priceCents,stockQuantity,active};
  });
  const db=getPrisma();
  const product=await db.product.findUnique({where:{id:productId},select:{slug:true}});
  if(!product)throw new Error("Produkt nicht gefunden");
  await db.$transaction(async tx=>{
    const existing=await tx.variant.findMany({
      where:{productId,id:{in:names}},
      select:{id:true,priceCents:true,stockQuantity:true,active:true}
    });
    if(existing.length!==changes.length)throw new Error("Varianten stimmen nicht mit Produkt ueberein");
    const byId=new Map(existing.map(v=>[v.id,v]));
    for(const v of changes){
      const current=byId.get(v.id)!;
      if(current.priceCents!==v.beforePrice||current.stockQuantity!==v.beforeStock||current.active!==v.beforeActive)
        throw new Error("Daten wurden inzwischen geaendert. Bitte Seite neu laden.");
      if(v.priceCents===v.beforePrice&&v.stockQuantity===v.beforeStock&&v.active===v.beforeActive)continue;
      const updated=await tx.variant.updateMany({
        where:{id:v.id,productId,priceCents:v.beforePrice,stockQuantity:v.beforeStock,active:v.beforeActive},
        data:{priceCents:v.priceCents,stockQuantity:v.stockQuantity,active:v.active}
      });
      if(updated.count!==1)throw new Error("Gleichzeitige Bearbeitung. Bitte neu laden.");
    }
  });
  revalidatePath("/kollektionen/"+product.slug);
  revalidatePath("/produkt/"+product.slug);
  revalidatePath("/admin");
  revalidatePath("/admin/produkte");
  revalidatePath("/api/catalog");
  redirect("/admin/produkte?updated=bulk");
}

const productInput=z.object({
  id:z.string().uuid(),
  name:z.string().trim().min(3).max(120),
  headline:z.string().trim().max(180),
  intro:z.string().trim().min(10).max(1800),
  pack:z.string().trim().min(1).max(100),
  material:z.string().trim().min(1).max(100),
  image:z.string().regex(/^\/media\/[a-zA-Z0-9_.-]+\.(?:png|jpg|jpeg|webp)$/),
  active:z.boolean()
});
export async function saveProductAction(formData:FormData){
  if(!await isAdmin())redirect("/admin/login");
  const parsed=productInput.safeParse({
    id:formData.get("id"),
    name:formData.get("name"),
    headline:formData.get("headline"),
    intro:formData.get("intro"),
    pack:formData.get("pack"),
    material:formData.get("material"),
    image:formData.get("image"),
    active:formData.get("active")==="on"
  });
  if(!parsed.success)throw new Error("Ungueltige Produktangaben");
  const {id,image,...fields}=parsed.data;
  // Restrict editable media to known local files; do not accept remote URLs.
  if(!existsSync(join(process.cwd(),"public",image)))throw new Error("Produktbild nicht vorhanden");
  const db=getPrisma();
  const product=await db.product.findUnique({where:{id},select:{slug:true}});
  if(!product)throw new Error("Produkt nicht gefunden");
  await db.product.update({where:{id},data:{...fields,image}});
  revalidatePath("/kollektionen");
  revalidatePath("/kollektionen/"+product.slug);
  revalidatePath("/produkt/"+product.slug);
  revalidatePath("/suche");
  revalidatePath("/api/catalog");
  revalidatePath("/admin");
  revalidatePath("/admin/produkte");
  redirect("/admin/produkte?productUpdated=1");
}

// Only a verified, paid order may enter a fulfillment transition.
// No admin control can mark payment as captured, refund money, or create a real customer order.
const fulfillmentInput=z.object({
  id:z.string().uuid(),
  next:z.enum(["preparing","shipped","delivered"]),
  carrier:z.string().trim().max(65),
  tracking:z.string().trim().max(120),
  note:z.string().trim().max(200)
}).superRefine((data,ctx)=>{
  if(data.next==="shipped"&&(!data.carrier||data.tracking.length<4)){
    ctx.addIssue({code:"custom",message:"Tracking and carrier required",path:["tracking"]});
  }
});

export async function updateFulfillmentAction(formData:FormData){
  if(!await isAdmin())redirect("/admin/login");
  const input=fulfillmentInput.safeParse({
    id:formData.get("id"),next:formData.get("next"),
    carrier:formData.get("carrier")??"",tracking:formData.get("tracking")??"",
    note:formData.get("note")??""
  });
  if(!input.success)throw new Error("Ungültiger Versandstatus oder Sendungsnummer");
  const data=input.data;
  const db=getPrisma();
  await db.$transaction(async tx=>{
    const order=await tx.order.findUnique({where:{id:data.id},include:{
      payments:{select:{eventType:true,provider:true,providerEventId:true}}
    }});
    if(!order||order.testOnly)throw new Error("Eine echte Bestellung ist nicht vorhanden");
    // A status field alone cannot establish payment. Only the future verified
    // payment webhook may append the provider payment-confirmation event.
    const providerPaid=order.paymentReference&&order.payments.some(p=>
      p.eventType==="payment_confirmed"&&p.provider!=="manual"&&p.providerEventId.length>0);
    if(!providerPaid)throw new Error("Kein verifizierter Zahlungseingang: Versand gesperrt");
    requireOrderTransition(order.status,data.next,"fulfillment");
    const result=await tx.order.updateMany({where:{id:data.id,status:order.status,testOnly:false},data:{
      status:data.next,
      ...(data.next==="shipped"?{trackingCarrier:data.carrier,trackingNumber:data.tracking,shippedAt:new Date()}:{}),
      ...(data.next==="delivered"?{deliveredAt:new Date()}:{}),
      ...(data.note?{fulfillmentNote:data.note}:{})
    }});
    if(result.count!==1)throw new Error("Status hat sich geändert; bitte Seite neu laden");
    await tx.orderStatusEvent.create({data:{
      orderId:order.id,fromStatus:order.status,toStatus:data.next,
      reason:"admin_fulfillment"+(data.note?": "+data.note:"")
    }});
  });
  revalidatePath("/admin/bestellungen");
  revalidatePath("/admin");
  redirect("/admin/bestellungen?updated=1");
}
