import {createHash,timingSafeEqual} from "node:crypto";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {NextRequest,NextResponse} from "next/server";
import catalog from "@/data/products.json";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=120;

const MODEL="gpt-image-2.5-sunburst";
const VALID_DENSITIES=["fein","normal","dicht"] as const;
const MAX_IMAGE_BYTES=3_500_000;
const MAX_RESPONSE_BASE64=3_700_000;
const MIME_TYPES=["image/jpeg","image/png","image/webp"] as const;
const NO_STORE={"Cache-Control":"no-store, private","X-Robots-Tag":"noindex, nofollow"};
const attempts=new Map<string,{until:number,count:number}>();
const deny=(message:string,status:number)=>NextResponse.json({error:message},{status,headers:NO_STORE});

function isConfigured(){
 return Boolean(process.env.OPENAI_API_KEY?.startsWith("sk-") &&
   (process.env.RUBY_TRYON_TEST_CODE||"").trim().length>=12);
}
function authorized(candidate:unknown){
 const expected=(process.env.RUBY_TRYON_TEST_CODE||"").trim();
 if(typeof candidate!=="string"||candidate.length>256||expected.length<12)return false;
 const a=createHash("sha256").update(candidate).digest();
 const b=createHash("sha256").update(expected).digest();
 return timingSafeEqual(a,b);
}
function validMagic(bytes:Buffer,mime:string){
 if(mime==="image/jpeg")return bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(mime==="image/png")return bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 if(mime==="image/webp")return bytes.toString("ascii",0,4)==="RIFF"&&bytes.toString("ascii",8,12)==="WEBP";
 return false;
}
function sessionLimited(key:string){
 const now=Date.now();
 if(attempts.size>1000)for(const [entry,value] of attempts)if(value.until<now)attempts.delete(entry);
 const row=attempts.get(key);
 if(row&&row.until>now){
  if(row.count>=3)return true;
  row.count++;
 }else attempts.set(key,{count:1,until:now+20*60_000});
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
  ?"Professionally installed, very small discreet strand-by-strand keratin bond hair extensions."
  :"Professionally installed, flat sandwich tape-in hair extensions, fully concealed beneath the upper hair layer.";
 return [
 "Create one PHOTOREALISTIC AFTER image by EDITING image 1 (the actual person's photo).",
 "IMAGE 2 IS ONLY A REAL RUBY HAIR HAIR-COLOR SWATCH REFERENCE. Never copy image 2's background, person or framing.",
 "Only change hair length, extension volume and the added hair tone. The original person's face, identity, skin, eyebrows, eyes, mouth, expression, neck, body, clothes, jewelry, posture, lighting, camera perspective and background must remain essentially IDENTICAL.",
 "Maintain the original natural hairline, roots, part and texture. Preserve any natural color at the roots; blend only the new extensions toward the chosen product color.",
 "Application: "+application,
 "Desired extension hair length: "+length+" from the attachment point; actual visual endpoint depends on height and placement. Make the after appearance clearly longer and naturally fuller than image 1, with long, fine, believable strands and softly blended tips.",
 "Chosen Ruby Hair product tone: "+tone+". Match the added hair shade to the color reference in image 2 as closely as realistic lighting allows.",
 "Natural hair density category: "+density+". Proportional fullness; no wig-like outline.",
 "Show no tape joints or exposed bond beads in the hair surface. Ensure a realistic blend from natural hair to extensions, no abrupt seam or cut line.",
 "No face retouching, no makeup, no beauty filters, no changes to clothing/background, no text, no collage. Output the single edited AFTER portrait from the same camera angle.",
 "An approximate preview only, not a guaranteed salon result."
 ].join("\n");
}

export async function GET(){
 return NextResponse.json({
  available:isConfigured(),
  provider:"OpenAI Images API",
  model:MODEL,
  testOnly:true,
  requiresConsent:true
 },{headers:NO_STORE});
}
export async function POST(request:NextRequest){
 if(!isConfigured())return deny("KI-Haaranprobe ist noch nicht freigeschaltet. Test-Zugang und API-Verbindung fehlen.",503);
 const origin=request.headers.get("origin");
 if(!origin||origin!==new URL(request.url).origin)return deny("Ungültige Anforderungsquelle.",403);
 const lengthHeader=Number(request.headers.get("content-length")||0);
 if(lengthHeader>4_400_000)return deny("Bild zu groß (max. 3,5 MB).",413);
 let form:FormData;
 try{form=await request.formData();}catch{return deny("Ungültige Bilddaten.",400);}
 if(form.get("consent")!=="yes")return deny("Bitte zuerst der einmaligen Verarbeitung des Fotos durch den KI-Anbieter zustimmen.",403);
 if(!authorized(form.get("testCode")))return deny("Ungültiger Test-Zugangscode.",401);
 const selected=selection(form.get("variantKey"));
 if(!selected)return deny("Bitte ein gültiges Ruby Hair Produkt auswählen.",400);
 const density=form.get("density");
 if(typeof density!=="string"||!VALID_DENSITIES.includes(density as typeof VALID_DENSITIES[number]))
   return deny("Ungültige Haardichte.",400);
 const photo=form.get("photo");
 if(!(photo instanceof File)||!MIME_TYPES.includes(photo.type as typeof MIME_TYPES[number])||
   photo.size<1024||photo.size>MAX_IMAGE_BYTES)
  return deny("Bitte ein JPG-, PNG- oder WebP-Bild bis 3,5 MB hochladen.",400);
 const imageBytes=Buffer.from(await photo.arrayBuffer());
 if(!validMagic(imageBytes,photo.type))return deny("Bilddatei ist ungültig.",400);
 const clientIp=request.headers.get("x-real-ip")||request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"anonymous";
 const key=createHash("sha256").update(clientIp+"|"+process.env.RUBY_TRYON_TEST_CODE).digest("hex");
 if(sessionLimited(key))return deny("Testlimit erreicht: maximal drei Anproben in 20 Minuten.",429);
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
   headers:{Authorization:"Bearer "+process.env.OPENAI_API_KEY},
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
   // Structured diagnostics only: no key, private test code, photo, prompt or upstream error message.
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
