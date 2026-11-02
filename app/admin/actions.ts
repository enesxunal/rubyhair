"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  isAdmin, loginAllowed, adminConfigured, recordLoginAttempt,
  checkAdminCredentials, issueAdminSession, clearAdminSession
} from "@/lib/admin-auth";
import { getPrisma } from "@/lib/prisma";

const loginSchema=z.object({email:z.email().max(254),password:z.string().min(1).max(256)});
export async function loginAction(formData:FormData){
  if(!adminConfigured())redirect("/admin/login?error=unconfigured");
  const parsed=loginSchema.safeParse({
    email:formData.get("email"),password:formData.get("password")
  });
  if(!parsed.success)redirect("/admin/login?error=invalid");
  const {key,allowed,reset}=await loginAllowed();
  if(!allowed)redirect("/admin/login?error=locked");
  const {email,password}=parsed.data;
  if(!await checkAdminCredentials(email,password)){
    await recordLoginAttempt(key,reset);
    redirect("/admin/login?error=invalid");
  }
  await issueAdminSession();
  redirect("/admin");
}
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
