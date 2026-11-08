"use client";

import {useEffect,useMemo,useState,type ChangeEvent} from "react";
import Link from "next/link";
import {ArrowUpRight,ArrowLeftRight,ImagePlus,LockKeyhole,Scissors,Sparkles,Upload,X} from "lucide-react";

type Variation={color:string;length:string;image:string;key:string};
type Product={slug:string;name:string;pack:string;material:string;variants:Variation[]};
type LocalPhoto={url:string;name:string;file?:File};
type Density="fein"|"normal"|"dicht";

const recommendation:Record<Density,string>={
 fein:"2–4 Packungen",normal:"3–4 Packungen",dicht:"6–8 Packungen"
};
const densityLabels:Record<Density,string>={fein:"Feines Haar",normal:"Normales Haar",dicht:"Dichtes Haar"};
function unique<T>(items:T[]):T[]{return [...new Set(items)];}
async function shrinkImage(file:File):Promise<Blob>{
 const bitmap=await createImageBitmap(file);
 try{
  const scale=Math.min(1,1280/bitmap.width,1536/bitmap.height);
  const canvas=document.createElement("canvas");
  canvas.width=Math.max(1,Math.round(bitmap.width*scale));
  canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const context=canvas.getContext("2d");
  if(!context)throw new Error("Bilder können in diesem Browser nicht verarbeitet werden.");
  context.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const convert=(quality:number)=>new Promise<Blob>((resolve,reject)=>
   canvas.toBlob(result=>result?resolve(result):reject(new Error("Bildkomprimierung fehlgeschlagen.")),"image/jpeg",quality));
  let result=await convert(.82);
  if(result.size>3_500_000)result=await convert(.65);
  if(result.size>3_500_000)throw new Error("Foto ist auch nach Verkleinerung zu groß.");
  return result;
 }finally{bitmap.close();}
}
export default function HairTryonLab({products}:{products:Product[]}){
 const first=products[0];
 const product=first;
 const [color,setColor]=useState(first?.variants[0]?.color||"");
 const [length,setLength]=useState(first?.variants[0]?.length||"");
 const [density,setDensity]=useState<Density>("normal");
 const [before,setBefore]=useState<LocalPhoto|null>(null);
 const [after,setAfter]=useState<LocalPhoto|null>(null);
 const [ratio,setRatio]=useState(50);
 const [issue,setIssue]=useState("");
 const [showAll,setShowAll]=useState(false);
 const [aiAvailable,setAiAvailable]=useState<boolean|null>(null);
 const [testCode,setTestCode]=useState("");
 const [consent,setConsent]=useState(false);
 const [generating,setGenerating]=useState(false);
 const [aiInfo,setAiInfo]=useState("");
 const lengths=useMemo(()=>unique(product?.variants.map(v=>v.length)||[]),[product]);
 const colors=useMemo(()=>unique(product?.variants.map(v=>v.color)||[]),[product]);
 const available=product?.variants.filter(v=>v.color===color)||[];
 const picked=available.find(v=>v.length===length)||available[0]||product?.variants[0];
 const currentColor=picked?.color||color;
 const currentLength=picked?.length||length;
 const colorOptions=colors.map(tone=>product.variants.find(v=>v.color===tone)!).filter(Boolean);
 useEffect(()=>()=>{if(before?.url.startsWith("blob:"))URL.revokeObjectURL(before.url);},[before]);
 useEffect(()=>()=>{if(after?.url.startsWith("blob:"))URL.revokeObjectURL(after.url);},[after]);
 useEffect(()=>{
  let active=true;
  fetch("/api/tryon/generate",{cache:"no-store"})
   .then(response=>response.ok?response.json():null)
   .then(data=>{if(active)setAiAvailable(data?.available===true);})
   .catch(()=>{if(active)setAiAvailable(false);});
  return ()=>{active=false;};
 },[]);
 const onPhoto=(event:ChangeEvent<HTMLInputElement>,kind:"before"|"after")=>{
   const file=event.target.files?.[0];
   if(!file)return;
   if(!["image/jpeg","image/png","image/webp"].includes(file.type)){
     setIssue("Bitte JPG-, PNG- oder WebP-Bilder verwenden.");event.target.value="";return;
   }
   if(file.size>8*1024*1024){
     setIssue("Die Bilddatei darf maximal 8 MB groß sein.");event.target.value="";return;
   }
   setIssue("");
   const photo={url:URL.createObjectURL(file),name:file.name,file};
   if(kind==="before"){setBefore(photo);setAfter(null);}
   else setAfter(photo);
   setRatio(50);event.target.value="";
 };
 const createTryon=async()=>{
   if(!before?.file||!picked||!aiAvailable||generating)return;
   if(!consent){setIssue("Bitte zuerst der Übermittlung deines Fotos an OpenAI zustimmen.");return;}
   if(testCode.trim().length<12){setIssue("Bitte den privaten Test-Zugangscode eingeben.");return;}
   setGenerating(true);setIssue("");setAiInfo("");
   try{
     const compressed=await shrinkImage(before.file);
     const payload=new FormData();
     payload.set("photo",compressed,"hair-original.jpg");
     payload.set("variantKey",picked.key);
     payload.set("density",density);
     payload.set("consent","yes");
     payload.set("testCode",testCode.trim());
     const response=await fetch("/api/tryon/generate",{method:"POST",body:payload,cache:"no-store",signal:AbortSignal.timeout(110000)});
     const data=await response.json().catch(()=>null);
     if(!response.ok)throw new Error(typeof data?.error==="string"?data.error:"Die KI-Haaranprobe ist fehlgeschlagen.");
     if(typeof data?.image!=="string"||!data.image.startsWith("data:image/webp;base64,"))
       throw new Error("Der KI-Dienst hat kein gültiges Bild geliefert.");
     setAfter({url:data.image,name:"Ruby Hair KI-Vorschau"});
     setRatio(50);setAiInfo("KI-Vorschau erstellt. Vergleiche Haaransatz und ursprüngliche Haarlängen mit dem Original. Wenn sich deine Eigenhaarfarbe verändert hat, verwende dieses Ergebnis nicht.");
   }catch(error){setIssue(error instanceof Error?error.message:"Die KI-Haaranprobe ist fehlgeschlagen.");}
   finally{setGenerating(false);}
 };
 return <>
   <section className="rh-tryon-hero rh-shell">
    <nav className="rh-breadcrumb" aria-label="Breadcrumb"><Link href="/">Startseite</Link><span>/</span><span>Hair Preview Lab</span></nav>
    <div className="rh-tryon-hero-grid">
      <div><div className="rh-eyebrow">RUBY HAIR / VIRTUAL HAIR STUDIO</div>
       <h1>See the <em>possibility.</em></h1>
       <p>Wähle Farbe und Länge deiner Tape-in Extensions. Die KI soll nur Haare ergänzen – deine eigene Haarfarbe bleibt erhalten. Der Bildtest ist derzeit geschützt.</p>
       <div className="rh-tryon-status"><LockKeyhole size={17}/><span>GESCHÜTZTER TEST · KI-Verarbeitung nur nach deiner ausdrücklichen Zustimmung</span></div>
      </div>
      <div className="rh-tryon-feature-note">
        <Sparkles size={28} strokeWidth={1.4}/><span>YOUR NEXT<br/>HAIR STORY.</span>
        <p>Nur zusätzliche Länge und Volumen – keine virtuelle Haarfärbung.</p>
      </div>
    </div>
   </section>
   <div className="rh-shell rh-tryon-layout">
    <section className="rh-tryon-controls" aria-label="Extensions konfigurieren">
      <div className="rh-tryon-block">
       <span className="rh-tryon-step">01 / PRODUKT</span>
       <h2>Tape-in Extensions.</h2>
       <p className="rh-tryon-muted">Wähle Farbe und Länge. Deine Naturhaarfarbe wird nicht verändert.</p>
      </div>
      <div className="rh-tryon-block">
       <span className="rh-tryon-step">02 / FARBE</span>
       <h2>Wähle deinen Ton.</h2>
       <div className="rh-tryon-shades">{colorOptions.slice(0,showAll?undefined:12).map(v=><button key={v.color} type="button" className={currentColor===v.color?"is-selected":""} aria-pressed={currentColor===v.color} title={"Farbton "+v.color} onClick={()=>{setColor(v.color);const same=product.variants.find(x=>x.color===v.color&&x.length===length);if(!same)setLength(v.length);}}>
        <img src={v.image} alt="" loading="lazy"/><span>{v.color}</span>
       </button>)}</div>
       {colorOptions.length>12&&<button type="button" className="rh-tryon-expand" onClick={()=>setShowAll(x=>!x)}>{showAll?"Weniger Farbtöne":"Alle "+colorOptions.length+" Farbtöne ansehen"}</button>}
       <p className="rh-tryon-muted">Die Farbfotos stammen aus dem bisherigen Ruby Hair Sortiment. Bildschirmfarben können abweichen.</p>
      </div>
      <div className="rh-tryon-block">
       <span className="rh-tryon-step">03 / LÄNGE & VOLUMEN</span>
       <h2>Dein gewünschter Look.</h2>
       <div className="rh-tryon-lengths">{lengths.map(size=>{
        const has=product.variants.some(v=>v.color===currentColor&&v.length===size);
        return <button key={size} type="button" disabled={!has} className={currentLength===size?"is-selected":""} aria-pressed={currentLength===size} onClick={()=>{setLength(size);}}>{size}</button>;
       })}</div>
       <fieldset className="rh-tryon-density"><legend>Deine natürliche Haarfülle</legend>
         {(Object.keys(densityLabels) as Density[]).map(item=><label key={item}><input type="radio" name="tryon-density" checked={density===item} onChange={()=>setDensity(item)}/>{densityLabels[item]}</label>)}
       </fieldset>
       <p className="rh-tryon-recommendation">Ruby Hair Orientierung: <strong>{recommendation[density]}</strong>. Die tatsächliche Menge bestimmt die Fachperson vor Ort.</p>
      </div>
      <div className="rh-tryon-selected">
       <img src={picked?.image} alt={"Ruby Hair Musterfarbton "+currentColor} />
       <div><span>DEINE AUSWAHL</span><strong>{product?.name}</strong><small>Farbe {currentColor} · {currentLength}</small>
        <Link href={"/produkt/"+product?.slug}>Zum Produkt <ArrowUpRight size={13}/></Link></div>
      </div>
    </section>
    <section className="rh-tryon-workspace" aria-label="Vorher Nachher Vergleich">
     <div className="rh-tryon-workspace-head"><div><span className="rh-tryon-step">04 / DEIN VERGLEICH</span><h2>Before. <em>After.</em></h2></div><span>PRIVATER TEST</span></div>
     <div className="rh-tryon-photo-actions">
      <label className="rh-tryon-photo-button"><Upload size={17}/> {before?"Ausgangsfoto ersetzen":"Originalfoto auswählen"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>onPhoto(e,"before")}/></label>
      <label className={"rh-tryon-photo-button secondary"+(!before?" is-disabled":"")}><ImagePlus size={17}/> {after?"Ergebnis ersetzen":"KI-Ergebnis importieren"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={!before} onChange={e=>onPhoto(e,"after")}/></label>
      {before&&<button className="rh-tryon-clear" type="button" onClick={()=>{setBefore(null);setAfter(null);setIssue("");setRatio(50);}}><X size={15}/> Bilder entfernen</button>}
     </div>
     <div className="rh-tryon-generate">
      <div className="rh-tryon-generate-heading"><Sparkles size={21}/><div><strong>Extensions an dir testen</strong><small>Die KI soll deine Eigenhaarfarbe erhalten und nur Extensions ergänzen.</small></div></div>
      {aiAvailable===false&&<p role="status" className="rh-tryon-disabled">Der Bildgenerator ist noch nicht freigeschaltet. Für den Test fehlen Server-API-Schlüssel und Testzugang.</p>}
      {aiAvailable===null&&<p role="status" className="rh-tryon-muted">KI-Verfügbarkeit wird geprüft …</p>}
      {aiAvailable===true&&<div className="rh-tryon-ai-access">
       <label>Privater Test-Zugangscode<input type="password" value={testCode} autoComplete="off" placeholder="Testcode eingeben" onChange={e=>setTestCode(e.target.value)} maxLength={256}/></label>
       <label className="rh-tryon-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>Ich bestätige, dass ich das Foto verwenden darf. Ich stimme zu, dass es einmalig zur KI-Haarbearbeitung an <strong>OpenAI</strong> übermittelt wird. Es wird von Ruby Hair nicht dauerhaft gespeichert. <Link href="/rechtliches/datenschutz/">Datenschutz</Link></span></label>
      </div>}
      <button type="button" className="rh-tryon-generate-button" disabled={!before||!aiAvailable||generating} onClick={createTryon}>
       <Sparkles size={19}/>{generating?"KI erstellt dein Ergebnis …":"Saçımda Dene · Haare virtuell verlängern"}
      </button>
      {generating&&<p role="status" className="rh-tryon-muted">Dein Foto wird verarbeitet. Bitte diese Seite geöffnet lassen und den Button nicht erneut drücken.</p>}
      {aiInfo&&<p role="status" className="rh-tryon-success">{aiInfo}</p>}
     </div>
     {issue&&<p role="alert" className="rh-tryon-error">{issue}</p>}
     {!before?<div className="rh-tryon-placeholder"><Scissors size={49} strokeWidth={1.2}/><h3>Dein Foto. Dein Look.</h3><p>Bitte lade ein eigenes Foto mit gut sichtbaren Haaren und Schultern hoch. Keine Hüte, keine starken Filter – idealerweise von vorn oder leicht seitlich.</p><small>JPG, PNG, WebP · max. 8 MB · keine Serverübertragung</small></div>:
       <div className="rh-tryon-viewer">
        <div className="rh-tryon-before"><img src={before.url} alt="Vorher: Originalfoto" /></div>
        {after&&<><div className="rh-tryon-after" style={{clipPath:"inset(0 0 0 "+ratio+"%)"}}><img src={after.url} alt="Nachher: manuell hochgeladenes KI-Ergebnis"/></div><div className="rh-tryon-divider" style={{left:ratio+"%"}}><ArrowLeftRight size={18}/></div></>}
        <div className="rh-tryon-photo-labels"><span>VORHER</span><span>{after?"NACHHER":"ERGEBNIS FEHLT"}</span></div>
        {!after&&<div className="rh-tryon-no-after">Ausgangsfoto bereit.<br/>Klicke auf „Saçımda Dene“ oder importiere für den Vergleich ein vorhandenes KI-Ergebnis.</div>}
       </div>}
     {before&&after&&<div className="rh-tryon-slider"><label htmlFor="rh-tryon-ratio">Vergleich verschieben</label><input id="rh-tryon-ratio" type="range" min="0" max="100" value={ratio} onChange={e=>setRatio(Number(e.target.value))} aria-valuetext={ratio+" Prozent Vorher"}/><span>{ratio}%</span></div>}
     {(before||after)&&<p className="rh-tryon-privacy"><LockKeyhole size={15}/> Die Bilder werden vorübergehend in deinem Browser angezeigt. Nur bei Klick auf „Saçımda Dene“ mit Einwilligung wird das Originalfoto zur Bildverarbeitung an OpenAI übertragen.</p>}
     <p className="rh-tryon-final-note">KI-Ergebnisse können abweichen: Falls dein vorhandenes Haar im Ergebnis heller oder anders gefärbt erscheint, ist die Vorschau nicht korrekt. Die Vorschau simuliert kein technisch exaktes Friseurergebnis. Ansatzposition, Schnitt, Farbangleichung, Tragegefühl und benötigte Menge müssen professionell beurteilt werden. Bestellungen sind auf dieser Website noch deaktiviert.</p>
    </section>
   </div>
 </>;
}
