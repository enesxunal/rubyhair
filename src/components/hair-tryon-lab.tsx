"use client";

import {useEffect,useMemo,useRef,useState,type ChangeEvent,type DragEvent} from "react";
import Link from "next/link";
import {ArrowLeftRight,ArrowUpRight,Check,ChevronDown,Download,ImagePlus,LockKeyhole,RefreshCw,Sparkles,Upload,X} from "lucide-react";

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
 const product=products[0];
 const [color,setColor]=useState(product?.variants[0]?.color||"");
 const [length,setLength]=useState(product?.variants[0]?.length||"");
 const [density,setDensity]=useState<Density>("normal");
 const [before,setBefore]=useState<LocalPhoto|null>(null);
 const [after,setAfter]=useState<LocalPhoto|null>(null);
 const [ratio,setRatio]=useState(50);
 const [issue,setIssue]=useState("");
 const [aiIssue,setAiIssue]=useState("");
 const [showAll,setShowAll]=useState(false);
 const [dragging,setDragging]=useState(false);
 const [aiAvailable,setAiAvailable]=useState<boolean|null>(null);
 const [consent,setConsent]=useState(false);
 const [generating,setGenerating]=useState(false);
 const [aiInfo,setAiInfo]=useState("");
 const photoStageRef=useRef<HTMLElement|null>(null);

 const lengths=useMemo(()=>unique(product?.variants.map(v=>v.length)||[]),[product]);
 const colors=useMemo(()=>unique(product?.variants.map(v=>v.color)||[]),[product]);
 const available=product?.variants.filter(v=>v.color===color)||[];
 const picked=available.find(v=>v.length===length)||available[0]||product?.variants[0];
 const currentColor=picked?.color||color;
 const currentLength=picked?.length||length;
 const colorOptions=(product?colors.map(tone=>product.variants.find(v=>v.color===tone)!).filter(Boolean):[]);

 useEffect(()=>()=>{if(before?.url.startsWith("blob:"))URL.revokeObjectURL(before.url);},[before]);
 useEffect(()=>()=>{if(after?.url.startsWith("blob:"))URL.revokeObjectURL(after.url);},[after]);
 useEffect(()=>{if(after)photoStageRef.current?.scrollIntoView({behavior:"smooth",block:"start"});},[after]);
 useEffect(()=>{
  let active=true;
  fetch("/api/tryon/generate",{cache:"no-store"})
   .then(response=>response.ok?response.json():null)
   .then(data=>{if(active)setAiAvailable(data?.available===true);})
   .catch(()=>{if(active)setAiAvailable(false);});
  return ()=>{active=false;};
 },[]);

 const clearResult=()=>{setAfter(null);setRatio(50);setAiInfo("");setIssue("");setAiIssue("");};
 const choosePhoto=(file:File)=>{
  if(generating)return;
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)){
   setIssue("Bitte JPG-, PNG- oder WebP-Bilder verwenden.");return;
  }
  if(file.size>8*1024*1024){
   setIssue("Die Bilddatei darf maximal 8 MB groß sein.");return;
  }
  setBefore({url:URL.createObjectURL(file),name:file.name,file});
  clearResult();
  // Explicit consent must be given again when the uploaded photo changes.
  setConsent(false);
 };
 const onPhoto=(event:ChangeEvent<HTMLInputElement>)=>{
  const file=event.target.files?.[0];
  if(file)choosePhoto(file);
  event.target.value="";
 };
 const onDrop=(event:DragEvent<HTMLDivElement>)=>{
  event.preventDefault();setDragging(false);
  const file=event.dataTransfer.files?.[0];
  if(file)choosePhoto(file);
 };
 const selectColor=(tone:string)=>{
  const same=product?.variants.find(v=>v.color===tone&&v.length===length);
  const first=product?.variants.find(v=>v.color===tone);
  setColor(tone);
  if(!same&&first)setLength(first.length);
  clearResult();
 };
 const selectLength=(size:string)=>{setLength(size);clearResult();};
 const createTryon=async()=>{
  if(!before?.file||!picked||!aiAvailable||generating)return;
  if(!consent){setAiIssue("Bitte stimme zuerst der Fotoverarbeitung durch OpenAI zu.");return;}
  setGenerating(true);setIssue("");setAiIssue("");setAiInfo("");
  try{
   const compressed=await shrinkImage(before.file);
   const payload=new FormData();
   payload.set("photo",compressed,"hair-original.jpg");
   payload.set("variantKey",picked.key);
   payload.set("density",density);
   payload.set("consent","yes");
   const response=await fetch("/api/tryon/generate",{
    method:"POST",body:payload,cache:"no-store",signal:AbortSignal.timeout(110000)
   });
   const data=await response.json().catch(()=>null);
   if(!response.ok)throw new Error(typeof data?.error==="string"?data.error:"Die KI-Haaranprobe ist fehlgeschlagen.");
   if(typeof data?.image!=="string"||!data.image.startsWith("data:image/webp;base64,"))
    throw new Error("Der KI-Dienst hat kein gültiges Bild geliefert.");
   setAfter({url:data.image,name:"Ruby Hair KI-Vorschau"});
   setRatio(50);
   setAiInfo("Dein Ergebnis ist fertig. Prüfe bitte Haarfarbe und Haaransatz.");
  }catch(error){
   setAiIssue(error instanceof Error?error.message:"Die KI-Haaranprobe ist fehlgeschlagen.");
  }finally{setGenerating(false);}
 };

 return <>
  <section className="rh-shell rh-tryon-intro">
   <nav className="rh-breadcrumb" aria-label="Breadcrumb"><Link href="/">Startseite</Link><span>/</span><span>KI-Haaranprobe</span></nav>
   <span className="rh-tryon-kicker">RUBY HAIR · VIRTUAL STUDIO</span>
   <h1>Dein Haar. <em>Dein neuer Look.</em></h1>
   <p>Foto hochladen, Extensions auswählen und deinen neuen Look entdecken.</p>
   <div className="rh-tryon-progress" aria-label="Drei Schritte zur Haarvorschau">
    <span><b>1</b> Foto hochladen</span>
    <span><b>2</b> Haare wählen</span>
    <span><b>3</b> Ergebnis ansehen</span>
   </div>
  </section>

  <div className="rh-shell rh-tryon-flow">
   <section ref={photoStageRef} className="rh-tryon-stage" aria-label="Foto hochladen und Ergebnis ansehen">
    <div className="rh-tryon-card-head">
     <div className="rh-tryon-card-number">01</div>
     <div><h2>Dein Foto</h2><p>Ein klares Foto mit sichtbaren Haaren genügt.</p></div>
    </div>

    <div className={"rh-tryon-drop-area"+(dragging?" is-dragging":"")}
     onDragOver={event=>{event.preventDefault();if(!generating)setDragging(true);}}
     onDragLeave={()=>setDragging(false)} onDrop={onDrop}>
     {!before?
      <div className="rh-tryon-upload-empty">
       <div className="rh-tryon-upload-icon"><ImagePlus size={32} strokeWidth={1.45}/></div>
       <h3>Wie möchtest du aussehen?</h3>
       <p>Wähle ein Foto von dir aus – von vorne, seitlich oder von hinten.</p>
       <label className="rh-tryon-upload-cta">
        <Upload size={17}/> Foto auswählen
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhoto} disabled={generating}/>
       </label>
       <small>JPG, PNG oder WebP · maximal 8 MB</small>
      </div>:
      <div className="rh-tryon-viewer">
       <div className="rh-tryon-before"><img src={before.url} alt="Vorher: Originalfoto"/></div>
       {after&&<>
        <div className="rh-tryon-after" style={{clipPath:"inset(0 0 0 "+ratio+"%)"}}>
         <img src={after.url} alt="Nachher: KI-Haarvorschau"/>
        </div>
        <div className="rh-tryon-divider" style={{left:ratio+"%"}}><ArrowLeftRight size={18}/></div>
       </>}
       <div className="rh-tryon-photo-labels"><span>ORIGINAL</span>{after&&<span>MIT EXTENSIONS</span>}</div>
       {!after&&<div className="rh-tryon-ready-note"><Check size={15}/> Foto bereit. Wähle jetzt deinen Look.</div>}
      </div>}
    </div>

    {before&&<div className="rh-tryon-photo-tools">
     <label className="rh-tryon-replace"><RefreshCw size={15}/> Foto ändern
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhoto} disabled={generating}/>
     </label>
     <button className="rh-tryon-clear" type="button" disabled={generating}
      onClick={()=>{setBefore(null);setConsent(false);clearResult();}}><X size={15}/> Entfernen</button>
     {after&&<a className="rh-tryon-save" href={after.url} download="ruby-hair-vorschau.webp"><Download size={15}/> Ergebnis speichern</a>}
    </div>}

    {before&&after&&<div className="rh-tryon-slider">
     <label htmlFor="rh-tryon-ratio">Vorher / Nachher</label>
     <input id="rh-tryon-ratio" type="range" min="0" max="100" value={ratio}
      onChange={event=>setRatio(Number(event.target.value))} aria-valuetext={ratio+" Prozent Vorher"}/>
    </div>}
    {issue&&<p className="rh-tryon-error" role="alert">{issue}</p>}
    {aiInfo&&<p className="rh-tryon-success" role="status">{aiInfo}</p>}
   </section>

   <section className="rh-tryon-setup" aria-label="Extensions auswählen und Foto bearbeiten">
    <div className="rh-tryon-card-head">
     <div className="rh-tryon-card-number">02</div>
     <div><h2>Wähle deinen Look</h2><p>Passende Farbe und gewünschte Länge.</p></div>
    </div>
    <div className="rh-tryon-field-heading"><strong>Haarfarbe</strong><span>Farbe {currentColor}</span></div>
    <div className="rh-tryon-shades">
     {colorOptions.slice(0,showAll?undefined:8).map(v=>
      <button key={v.color} type="button" className={currentColor===v.color?"is-selected":""}
       title={"Farbton "+v.color} aria-label={"Farbe "+v.color} aria-pressed={currentColor===v.color}
       disabled={generating} onClick={()=>selectColor(v.color)}>
       <img src={v.image} alt="" loading="lazy"/><span>{v.color}</span>
       {currentColor===v.color&&<Check className="rh-tryon-color-check" size={15}/>}
      </button>)}
    </div>
    {colorOptions.length>8&&<button type="button" className="rh-tryon-expand" aria-expanded={showAll}
     onClick={()=>setShowAll(v=>!v)}>{showAll?"Weniger Farben anzeigen":"Alle "+colorOptions.length+" Farben anzeigen"} <ChevronDown size={15}/></button>}

    <div className="rh-tryon-field-heading rh-tryon-length-heading"><strong>Haarlänge</strong></div>
    <div className="rh-tryon-lengths">{lengths.map(size=>{
     const has=product?.variants.some(v=>v.color===currentColor&&v.length===size);
     return <button key={size} type="button" disabled={!has||generating}
      className={currentLength===size?"is-selected":""} aria-pressed={currentLength===size}
      onClick={()=>selectLength(size)}>{size}</button>;
    })}</div>

    <details className="rh-tryon-extra">
     <summary>Haarfülle anpassen <span>Optional</span><ChevronDown size={16}/></summary>
     <fieldset className="rh-tryon-density">
      <legend>Wie voll ist dein eigenes Haar?</legend>
      {(Object.keys(densityLabels) as Density[]).map(item=>
       <label key={item}><input type="radio" name="tryon-density" checked={density===item}
        disabled={generating} onChange={()=>{setDensity(item);clearResult();}}/>{densityLabels[item]}</label>)}
     </fieldset>
     <p className="rh-tryon-recommendation">Unverbindliche Orientierung: {recommendation[density]}. Die tatsächliche Menge bestimmt eine Fachperson.</p>
    </details>

    <div className="rh-tryon-choice"><img src={picked?.image} alt={"Ausgewählte Tape-in-Farbe "+currentColor}/>
     <div><span>DEINE AUSWAHL</span><strong>Farbe {currentColor} · {currentLength}</strong><small>Ruby Hair Tape-in Extensions</small></div>
     <Link href={"/produkt/"+product?.slug} aria-label="Produktdetails ansehen"><ArrowUpRight size={18}/></Link>
    </div>

    <div className="rh-tryon-start">
     <div className="rh-tryon-start-head"><span className="rh-tryon-card-number">03</span><div>
      <h2>Jetzt ausprobieren</h2><p>Dein Ergebnis wird mit KI erstellt.</p></div></div>
     {aiAvailable===false&&<p role="status" className="rh-tryon-disabled">Die KI ist gerade nicht erreichbar. Versuche es später erneut.</p>}
     {aiAvailable===null&&<p role="status" className="rh-tryon-muted">KI-Verfügbarkeit wird geprüft …</p>}
     {aiAvailable===true&&<label className="rh-tryon-consent">
      <input type="checkbox" checked={consent} onChange={event=>{setConsent(event.target.checked);setAiIssue("");}} disabled={generating}/>
      <span>Ich darf dieses Foto verwenden und stimme zu, dass es zur Prüfung und KI-Bearbeitung an <strong>OpenAI</strong> übermittelt wird. Ruby Hair speichert es nicht dauerhaft. <Link href="/rechtliches/datenschutz/">Datenschutz</Link></span>
     </label>}
     <button type="button" className="rh-tryon-generate-button"
      disabled={!before||!picked||!aiAvailable||generating} onClick={createTryon}>
      <Sparkles size={19}/>{generating?"Dein Look wird erstellt …":after?"Neu erstellen":"Jetzt an mir testen"}
     </button>
     {aiIssue&&<p className="rh-tryon-error" role="alert">{aiIssue}</p>}
     {!before&&<p className="rh-tryon-start-hint">Lade zuerst oben dein Foto hoch.</p>}
     {generating&&<p className="rh-tryon-start-hint" role="status">Dein Foto wird geprüft und verarbeitet. Bitte diese Seite geöffnet lassen.</p>}
    </div>
   </section>
  </div>

  <div className="rh-shell rh-tryon-bottom">
   <div><LockKeyhole size={16}/><span>Dein Foto wird erst nach deiner Einwilligung an OpenAI gesendet.</span></div>
   <details><summary>Wichtige Hinweise</summary><p>Die KI-Vorschau ist eine unverbindliche Simulation. Sie verändert deine Naturhaarfarbe nicht absichtlich; wenn Ansatz oder vorhandene Haarfarbe anders aussehen, verwende das Ergebnis bitte nicht. Schnitt, Farbabgleich und benötigte Menge müssen professionell beurteilt werden. Bestellungen sind auf dieser Vorschauseite noch deaktiviert.</p></details>
  </div>
 </>;
}
