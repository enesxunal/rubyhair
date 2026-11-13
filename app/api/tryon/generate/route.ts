import {readFile} from "node:fs/promises";
import path from "node:path";
import {NextRequest,NextResponse} from "next/server";
import catalog from "@/data/products.json";
import {checkPhotoSuitability,photoSuitabilityMessage} from "@/lib/tryon-photo-suitability";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=120;

const MODEL="gpt-image-2.5-sunburst";
const VALID_DENSITIES=["fein","normal","dicht"] as const;
const MAX_IMAGE_BYTES=3_500_000;
const MAX_RESPONSE_BASE64=3_700_000;
const MIME_TYPES=["image/jpeg","image/png","image/webp"] as const;
const NO_STORE={"Cache-Control":"no-store, private","X-Robots-Tag":"noindex, nofollow"};
const deny=(message:string,status:number)=>NextResponse.json({error:message},{status,headers:NO_STORE});

function isConfigured(){
 // The provider key is a server-only Vercel secret, never sent to the browser.
 return Boolean(process.env.RUBY_HAIR_OPENAI_API_KEY?.startsWith("sk-"));
}
function validMagic(bytes:Buffer,mime:string){
 if(mime==="image/jpeg")return bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(mime==="image/png")return bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 if(mime==="image/webp")return bytes.toString("ascii",0,4)==="RIFF"&&bytes.toString("ascii",8,12)==="WEBP";
 return false;
}
const products=Object.values(catalog.products);
function selection(key:unknown){
 if(typeof key!=="string"||key.length>100)return null;
 for(const product of products){
  for(const variant of product.variations){
   if(product.slug+"-"+variant.id===key)return {product,variant};
  }
 }
 return null;
}
function promptFor(method:string,tone:string,length:string,density:string){
 const application=method==="keratin-bondings"
  ?"Small discreet strand-by-strand keratin bond extensions, concealed below the existing upper hair."
  :"Flat sandwich tape-in extensions professionally attached BELOW the person's existing natural upper hair layer; attachment points remain hidden.";
 return [
  "EDIT IMAGE 1: PHOTOREALISTIC HAIR EXTENSION TRY-ON. Image 1 is the customer's ORIGINAL PHOTO and is the absolute reference for all existing hair and everything else in the frame.",
  "CRITICAL, HIGHEST PRIORITY — EXISTING HAIR COLOR LOCK: Do not recolor, brighten, dye, bleach, warm, tone, highlight, soften, or regenerate the person's NATURAL EXISTING HAIR, from its ROOTS THROUGH ITS ORIGINAL TIPS. Keep every originally visible native strand the SAME color, depth, undertone, gradients, shadows, roots, mid-lengths and texture as in image 1.",
  "The original dark/brown/black/blonde etc hair must remain visibly original THROUGH THE ENTIRE EXISTING LENGTH — protecting just the roots is NOT sufficient. Never produce new balayage, ombre, highlights, blonde mid-lengths, lighter roots, or color transitions on existing native hair unless they were ALREADY present in image 1.",
  "ONLY ADD extension strands alongside and especially BELOW the original hair ends. The new hair should follow the existing growth direction, sit naturally underneath and among the existing tips, and extend the visible silhouette with realistic length and volume. Do not replace the existing hairstyle with a wig or repaint the person's entire hair mass.",
  "IMAGE 2 is ONLY a Ruby Hair product color SWATCH for the ADDED strands. Never apply image 2's color to any original/native hair. Do not transfer lighting, styling, background or any other feature from image 2. If product shade differs from the person's original hair, keep the contrast restricted to NEWLY ADDED extensions; NEVER disguise the mismatch by lightening or recoloring their native hair. Color fidelity of existing hair takes priority over a perfect blend.",
  "Keep the original face, identity, skin, eyes, brows, expression, body, clothes, pose, camera angle, crop, background and lighting unchanged. No beautification or filters.",
  "Extension application: "+application,
  "NEW added extension strands only: selected Ruby Hair shade "+tone+" (reference photo 2).",
  "New extension product length "+length+" measured from attachment, not extra length beyond the original ends. Keep the length believable for the photo's body proportions.",
  "Natural density: "+density+". Add proportional volume only; no wig, no exaggerated fullness or visible tapes.",
  "Before completing, internally verify that the person's existing hair is still the same uncolored hair seen in image 1 along its whole original length. If the selected shade clashes, accept a natural two-tone result rather than changing the person's own hair.",
  "Output ONE after image of the same person and the same scene; no text, no collage and no before/after layout. This is a non-binding visualization, not a guaranteed salon result."
 ].join("\n");
}

export async function GET(){
 return NextResponse.json({
  available:isConfigured(),
  provider:"OpenAI Images API",
  model:MODEL,
  requiresConsent:true
 },{headers:NO_STORE});
}
export async function POST(request:NextRequest){
 if(!isConfigured())return deny("KI-Haaranprobe ist noch nicht eingerichtet. Bitte OpenAI API-Schlüssel auf dem Server hinterlegen.",503);
 const origin=request.headers.get("origin");
 if(!origin||origin!==new URL(request.url).origin)return deny("Ungültige Anforderungsquelle.",403);
 const lengthHeader=Number(request.headers.get("content-length")||0);
 if(lengthHeader>4_400_000)return deny("Bild zu groß (max. 3,5 MB).",413);
 let form:FormData;
 try{form=await request.formData();}catch{return deny("Ungültige Bilddaten.",400);}
 if(form.get("consent")!=="yes")return deny("Bitte zuerst der einmaligen Verarbeitung des Fotos durch den KI-Anbieter zustimmen.",403);
 const selected=selection(form.get("variantKey"));
 if(!selected||selected.product.slug!=="tape-in-extensions")return deny("Bitte eine gültige Ruby Hair Tape-in Variante auswählen.",400);
 const density=form.get("density");
 if(typeof density!=="string"||!VALID_DENSITIES.includes(density as typeof VALID_DENSITIES[number]))
   return deny("Ungültige Haardichte.",400);
 const photo=form.get("photo");
 if(!(photo instanceof File)||!MIME_TYPES.includes(photo.type as typeof MIME_TYPES[number])||
   photo.size<1024||photo.size>MAX_IMAGE_BYTES)
  return deny("Bitte ein JPG-, PNG- oder WebP-Bild bis 3,5 MB hochladen.",400);
 const imageBytes=Buffer.from(await photo.arrayBuffer());
 if(!validMagic(imageBytes,photo.type))return deny("Bilddatei ist ungültig.",400);
 // Reject unsuitable photos BEFORE calling the expensive hair editing endpoint.
 // On classifier error, fail closed: never try to generate from an unchecked image.
 const suitability=await checkPhotoSuitability(
  imageBytes,photo.type as "image/jpeg"|"image/png"|"image/webp",
  process.env.RUBY_HAIR_OPENAI_API_KEY!
 );
 if(suitability.status==="unavailable")
  return deny("Foto-Prüfung derzeit nicht verfügbar. Bitte später erneut versuchen.",503);
 if(suitability.status==="rejected")
  return NextResponse.json({
   error:photoSuitabilityMessage(suitability.reason),
   code:"photo_unsuitable",reason:suitability.reason
  },{status:422,headers:NO_STORE});
 const {product,variant}=selected;
 if(!variant.image.startsWith("/media/")||!/^\/media\/[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp)$/.test(variant.image))
  return deny("Farbmuster für dieses Produkt fehlt.",422);
 let swatch:Buffer;
 try{swatch=await readFile(path.join(process.cwd(),"public",variant.image.slice(1)));}
 catch{return deny("Referenzfoto ist aktuell nicht verfügbar.",422);}
 const swatchMime=variant.image.match(/\.png$/)?"image/png":variant.image.match(/\.webp$/)?"image/webp":"image/jpeg";
 if(swatch.length>4_000_000||!validMagic(swatch,swatchMime))
  return deny("Referenzfoto ist derzeit ungültig.",422);
 const payload=new FormData();
 payload.append("model",MODEL);
 // Keep upload filenames consistent with the actual binary/MIME type: image API validates both.
 const originalSuffix=photo.type==="image/png"?"png":photo.type==="image/webp"?"webp":"jpg";
 const shadeSuffix=swatchMime==="image/png"?"png":swatchMime==="image/webp"?"webp":"jpg";
 payload.append("image[]",new Blob([new Uint8Array(imageBytes)],{type:photo.type}),"customer-original."+originalSuffix);
 payload.append("image[]",new Blob([new Uint8Array(swatch)],{type:swatchMime}),"rubyhair-shade."+shadeSuffix);
 payload.append("prompt",promptFor(product.slug,variant.color_label,variant.length_label,density));
 payload.append("size","1024x1536");
 payload.append("quality","medium");
 payload.append("output_format","webp");
 payload.append("output_compression","65");
 payload.append("n","1");
 try{
  const result=await fetch("https://api.openai.com/v1/images/edits",{
   method:"POST",
   headers:{Authorization:"Bearer "+process.env.RUBY_HAIR_OPENAI_API_KEY},
   body:payload,
   cache:"no-store",
   signal:AbortSignal.timeout(98_000)
  });
  if(!result.ok){
   // Provider errors may contain sensitive request/account details. Never relay or log the raw body.
   const failure:unknown=await result.json().catch(()=>null);
   const rawError=(failure as {error?:{code?:unknown;type?:unknown}}|null)?.error;
   const rawCode=rawError?.code??rawError?.type;
   const code=typeof rawCode==="string"&&/^[a-z0-9_.-]{1,60}$/.test(rawCode)?rawCode:"unknown";
   const reason=(()=>{
    if(code==="invalid_api_key"||result.status===401)return "OpenAI hat den API-Schlüssel abgelehnt. Bitte den Projekt-Schlüssel in Vercel prüfen.";
    if(code==="insufficient_quota"||code==="billing_hard_limit_reached"||code==="billing_not_active")return "OpenAI API-Guthaben oder das Ausgabenlimit reicht nicht aus. Bitte API Billing prüfen.";
    if(code==="organization_verification_required"||code==="model_not_found"||code==="model_not_available"||code==="model_access_denied")return "Für dieses OpenAI-Projekt ist das gewählte Bildmodell nicht freigegeben. Bitte Modellzugriff und Organisation prüfen.";
    if(result.status===403)return "OpenAI verweigert dem Projekt den Modellzugriff. Bitte API-Projektberechtigungen prüfen.";
    if(code==="invalid_image"||code==="invalid_image_format"||code==="invalid_image_file"||code==="unsupported_image")return "OpenAI hat eines der hochgeladenen Bilder abgelehnt. Bitte eine andere JPG/PNG-Datei testen.";
    if(result.status===400)return "OpenAI hat die Bildanfrage abgelehnt. Bitte den API-Fehlercode prüfen.";
    if(result.status===429)return "OpenAI hat das Anbieterlimit erreicht. Bitte API-Rate-Limit und Guthaben prüfen.";
    return "OpenAI hat die Bildbearbeitung abgelehnt.";
   })();
   // Structured diagnostics only: no key, photo, prompt or upstream error message.
   console.warn("RubyHair tryon provider rejection",{
    providerHttpStatus:result.status,providerErrorCode:code,
    providerRequestId:result.headers.get("x-request-id")||undefined
   });
   const suffix=code==="unknown"?"":" / "+code;
   return deny(reason+" (OpenAI HTTP "+result.status+suffix+")",result.status===429?429:502);
  }
  const data:unknown=await result.json();
  const base64=(data as {data?:{b64_json?:string}[]})?.data?.[0]?.b64_json;
  if(typeof base64!=="string"||base64.length===0||base64.length>MAX_RESPONSE_BASE64||!/^[A-Za-z0-9+/=]+$/.test(base64)){
   console.warn("RubyHair tryon provider invalid image response",{base64Present:typeof base64==="string",responseSize:typeof base64==="string"?base64.length:0});
   return deny("Der KI-Anbieter hat kein gültiges Bild zurückgegeben.",502);
  }
  return NextResponse.json({image:"data:image/webp;base64,"+base64,model:MODEL,notice:"KI-Visualisierung, keine Zusage des tatsächlichen Ergebnisses."},{headers:NO_STORE});
 }catch{
  return deny("Die Bildbearbeitung konnte nicht abgeschlossen werden. Bitte erneut versuchen.",504);
 }
}
