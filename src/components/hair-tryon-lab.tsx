"use client";

import {useEffect,useMemo,useRef,useState,type ChangeEvent,type DragEvent,type PointerEvent} from "react";
import Link from "next/link";
import {ArrowLeft,ArrowRight,ArrowLeftRight,Check,ChevronDown,Download,ImagePlus,LockKeyhole,RefreshCw,Scissors,Sparkles,Upload,WandSparkles,X} from "lucide-react";

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
 const [wizardStep,setWizardStep]=useState<0|1|2|3|4>(0);
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
 const wizardFrameRef=useRef<HTMLDivElement|null>(null);

 const lengths=useMemo(()=>unique(product?.variants.map(v=>v.length)||[]),[product]);
 const colors=useMemo(()=>unique(product?.variants.map(v=>v.color)||[]),[product]);
 const available=product?.variants.filter(v=>v.color===color)||[];
 const picked=available.find(v=>v.length===length)||available[0]||product?.variants[0];
 const currentColor=picked?.color||color;
 const currentLength=picked?.length||length;
 const colorOptions=(product?colors.map(tone=>product.variants.find(v=>v.color===tone)!).filter(Boolean):[]);

 useEffect(()=>()=>{if(before?.url.startsWith("blob:"))URL.revokeObjectURL(before.url);},[before]);
 useEffect(()=>()=>{if(after?.url.startsWith("blob:"))URL.revokeObjectURL(after.url);},[after]);
 useEffect(()=>{
  if(wizardStep>0)wizardFrameRef.current?.scrollIntoView({behavior:"smooth",block:"start"});
 },[wizardStep]);
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
   setRatio(50);setWizardStep(4);
   setAiInfo("Dein Ergebnis ist fertig. Prüfe bitte Haarfarbe und Haaransatz.");
  }catch(error){
   setAiIssue(error instanceof Error?error.message:"Die KI-Haaranprobe ist fehlgeschlagen.");
  }finally{setGenerating(false);}
 };

 const goStep=(next:0|1|2|3|4)=>{
  if(generating)return;
  if(next>=2&&!before?.file){setWizardStep(1);return;}
  if(next>=3&&!picked){setWizardStep(2);return;}
  if(next===4&&!after)return;
  setIssue("");setAiIssue("");setWizardStep(next);
 };
 const moveCompare=(event:PointerEvent<HTMLDivElement>)=>{
  const rect=event.currentTarget.getBoundingClientRect();
  if(rect.width>0)setRatio(Math.max(0,Math.min(100,Math.round(100*(event.clientX-rect.left)/rect.width))));
 };
 const startCompare=(event:PointerEvent<HTMLDivElement>)=>{
  if(event.button!==0)return;
  event.currentTarget.setPointerCapture(event.pointerId);
  moveCompare(event);
 };
 const dragCompare=(event:PointerEvent<HTMLDivElement>)=>{
  if(event.currentTarget.hasPointerCapture(event.pointerId))moveCompare(event);
 };

 return <>
  <div className="rh-shell rh-wizard-wrap">
   <nav className="rh-breadcrumb rh-wizard-breadcrumb" aria-label="Breadcrumb">
    <Link href="/">Startseite</Link><span>/</span><span>KI-Haaranprobe</span>
   </nav>
   <div className="rh-wizard-frame" ref={wizardFrameRef}>
    <header className="rh-wizard-topline">
     <span>RUBY HAIR <small>VIRTUAL STUDIO</small></span>
     <span>{wizardStep===0?"DEIN LOOK BEGINNT HIER":"SCHRITT "+wizardStep+" VON 4"}</span>
    </header>
    {wizardStep>0&&<nav className="rh-wizard-progress" aria-label="Dein Fortschritt">
     {["Foto","Look","Freigabe","Ergebnis"].map((label,i)=>{
      const n=i+1;
      return <span key={label} className={n===wizardStep?"is-active":n<wizardStep?"is-complete":""}>
       <i>{n<wizardStep?<Check size={13}/>:n}</i><small>{label}</small>
      </span>;
     })}
    </nav>}

    {wizardStep===0&&<section className="rh-wizard-intro">
     <div className="rh-wizard-intro-art" aria-hidden="true">
      <span className="rh-wizard-intro-halo"/>
      <Scissors size={105} className="rh-wizard-intro-icon" strokeWidth={1.2}/>
      <Sparkles size={25} className="rh-wizard-intro-sparkle"/>
     </div>
     <div className="rh-wizard-intro-copy">
      <span className="rh-wizard-eyebrow">DEIN PERSÖNLICHES HAIR STUDIO</span>
      <h1>Dein Haar.<br/><em>Dein neuer Look.</em></h1>
      <p>Wie würden Ruby Hair Extensions an dir aussehen? Lade ein Foto hoch, finde deinen Farbton und entdecke deinen neuen Look.</p>
      <div className="rh-wizard-intro-benefits">
       <span><Check size={15}/> Dein Foto</span>
       <span><Check size={15}/> Deine Haarfarbe</span>
       <span><Check size={15}/> Vorher & Nachher</span>
      </div>
      <button type="button" className="rh-wizard-main-button" onClick={()=>goStep(1)}>
       Jetzt entdecken <ArrowRight size={18}/>
      </button>
      <small>Unverbindliche KI-Vorschau · Keine Bestellung erforderlich</small>
     </div>
    </section>}

    {wizardStep===1&&<section className="rh-wizard-content">
     <div className="rh-wizard-heading">
      <span className="rh-wizard-eyebrow">01 / DEIN FOTO</span>
      <h1>Zeig uns dein Haar.</h1>
      <p>Ein klares Foto mit gut sichtbaren Haaren genügt. Von vorne, seitlich oder von hinten.</p>
     </div>
     <div className={"rh-wizard-upload"+(dragging?" is-dragging":"")}
      onDragOver={event=>{event.preventDefault();setDragging(true);}}
      onDragLeave={()=>setDragging(false)} onDrop={onDrop}>
      {before?<div className="rh-wizard-upload-preview">
       <img src={before.url} alt="Dein hochgeladenes Originalfoto"/>
       <span><Check size={16}/> Foto ausgewählt</span>
      </div>:<div className="rh-wizard-upload-empty">
       <span className="rh-wizard-upload-icon"><ImagePlus size={32}/></span>
       <strong>Dein Foto hochladen</strong>
       <p>Kopf und Haare sollten vollständig zu sehen sein.</p>
       <label className="rh-wizard-upload-cta">
        <Upload size={17}/> Foto auswählen
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhoto}/>
       </label>
       <small>JPG, PNG oder WebP · max. 8 MB</small>
      </div>}
     </div>
     {before&&<label className="rh-wizard-change-photo"><RefreshCw size={16}/> Anderes Foto auswählen
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhoto}/>
     </label>}
     {issue&&<p role="alert" className="rh-wizard-error">{issue}</p>}
     <div className="rh-wizard-buttons">
      <button type="button" className="rh-wizard-back" onClick={()=>goStep(0)}><ArrowLeft size={17}/> Zurück</button>
      <button type="button" className="rh-wizard-main-button" disabled={!before} onClick={()=>goStep(2)}>Weiter <ArrowRight size={17}/></button>
     </div>
    </section>}

    {wizardStep===2&&<section className="rh-wizard-content">
     <div className="rh-wizard-heading">
      <span className="rh-wizard-eyebrow">02 / DEIN WUNSCHLOOK</span>
      <h1>Finde deinen Farbton.</h1>
      <p>Wähle die passende Haarfarbe und deine gewünschte Länge.</p>
     </div>
     <div className="rh-wizard-picker">
      <div>
       <div className="rh-wizard-field-title"><strong>Haarfarbe</strong><span>Farbe {currentColor}</span></div>
       <div className="rh-wizard-shades">
        {colorOptions.slice(0,showAll?undefined:8).map(v=><button key={v.color} type="button"
         className={currentColor===v.color?"is-selected":""} aria-label={"Farbe "+v.color}
         aria-pressed={currentColor===v.color} title={"Farbton "+v.color}
         onClick={()=>{setColor(v.color);const same=product.variants.find(x=>x.color===v.color&&x.length===length);if(!same)setLength(v.length);clearResult();}}>
         <img src={v.image} alt="" loading="lazy"/><span>{v.color}</span>
         {currentColor===v.color&&<Check size={14} className="rh-wizard-shade-check"/>}
        </button>)}
       </div>
       {colorOptions.length>8&&<button className="rh-wizard-more" type="button" aria-expanded={showAll} onClick={()=>setShowAll(x=>!x)}>
        {showAll?"Weniger Farben anzeigen":"Alle "+colorOptions.length+" Farben ansehen"} <ChevronDown size={15}/>
       </button>}
       <div className="rh-wizard-field-title rh-wizard-length-head"><strong>Haarlänge</strong></div>
       <div className="rh-wizard-lengths">{lengths.map(size=>{
        const has=product.variants.some(v=>v.color===currentColor&&v.length===size);
        return <button key={size} type="button" disabled={!has} aria-pressed={currentLength===size}
         className={currentLength===size?"is-selected":""} onClick={()=>{setLength(size);clearResult();}}>{size}</button>;
       })}</div>
       <details className="rh-wizard-extra"><summary>Haarfülle anpassen <span>Optional</span><ChevronDown size={15}/></summary>
        <fieldset><legend>Wie voll ist dein eigenes Haar?</legend>
         {(Object.keys(densityLabels) as Density[]).map(item=><label key={item}>
          <input type="radio" name="tryon-density" checked={density===item} onChange={()=>{setDensity(item);clearResult();}}/>{densityLabels[item]}
         </label>)}
        </fieldset>
       </details>
      </div>
      <aside className="rh-wizard-picked">
       <img src={picked?.image} alt={"Ausgewählter Ruby Hair Farbton "+currentColor}/>
       <div><small>DEINE AUSWAHL</small><strong>Farbe {currentColor}</strong><span>{currentLength} · Tape-in Extensions</span></div>
      </aside>
     </div>
     <div className="rh-wizard-buttons">
      <button type="button" className="rh-wizard-back" onClick={()=>goStep(1)}><ArrowLeft size={17}/> Zurück</button>
      <button type="button" className="rh-wizard-main-button" disabled={!picked} onClick={()=>goStep(3)}>Weiter <ArrowRight size={17}/></button>
     </div>
    </section>}

    {wizardStep===3&&<section className="rh-wizard-content">
     {!generating?<>
      <div className="rh-wizard-heading">
       <span className="rh-wizard-eyebrow">03 / DEINE FREIGABE</span>
       <h1>Bereit für deinen neuen Look?</h1>
       <p>Überprüfe deine Auswahl und gib dein Foto zur KI-Bearbeitung frei.</p>
      </div>
      <div className="rh-wizard-summary">
       {before&&<img src={before.url} alt="Dein Foto vor der KI-Haarvorschau"/>}
       <div><small>DEIN WUNSCHLOOK</small><strong>Farbe {currentColor} · {currentLength}</strong><span>Ruby Hair Tape-in Extensions</span>
        <button type="button" onClick={()=>goStep(2)}>Auswahl ändern</button></div>
       <Check size={19}/>
      </div>
      <div className="rh-wizard-consent-area">
       <LockKeyhole size={22}/>
       <label><input type="checkbox" checked={consent} onChange={event=>{setConsent(event.target.checked);setAiIssue("");}}/>
        <span>Ich darf dieses Foto verwenden und stimme zu, dass es für die Foto-Eignungsprüfung und die KI-Haarbearbeitung an <strong>OpenAI</strong> übermittelt wird. Ruby Hair speichert das Foto nicht dauerhaft. <Link href="/rechtliches/datenschutz/">Datenschutz</Link></span>
       </label>
      </div>
      {aiAvailable===false&&<p role="status" className="rh-wizard-error">Die KI ist gerade nicht verfügbar. Bitte versuche es später erneut.</p>}
      {aiAvailable===null&&<p role="status" className="rh-wizard-muted">KI-Verfügbarkeit wird geprüft …</p>}
      {aiIssue&&<div role="alert" className="rh-wizard-error"><p>{aiIssue}</p><button type="button" onClick={()=>goStep(1)}>Anderes Foto wählen</button></div>}
      <div className="rh-wizard-buttons">
       <button type="button" className="rh-wizard-back" onClick={()=>goStep(2)}><ArrowLeft size={17}/> Zurück</button>
       <button type="button" className="rh-wizard-main-button" disabled={!before||!picked||!aiAvailable||!consent} onClick={createTryon}>
        <WandSparkles size={18}/> Meinen Look erstellen
       </button>
      </div>
      {!consent&&<p className="rh-wizard-consent-hint">Bitte zuerst die Fotoverarbeitung bestätigen.</p>}
     </>:<div className="rh-wizard-creating" role="status" aria-live="polite" aria-label="Deine KI-Haarvorschau wird erstellt">
      <div className="rh-wizard-animation" aria-hidden="true">
       <span className="rh-wizard-animation-ring"/>
       <span className="rh-wizard-hairstrand strand-a"/><span className="rh-wizard-hairstrand strand-b"/>
       <span className="rh-wizard-hairstrand strand-c"/><span className="rh-wizard-hairstrand strand-d"/>
       <Scissors className="rh-wizard-scissors" size={66} strokeWidth={1.4}/>
       <Sparkles className="rh-wizard-anim-star star-a" size={22}/>
       <Sparkles className="rh-wizard-anim-star star-b" size={16}/>
      </div>
      <h1>Ein bisschen Haar-Magie …</h1>
      <p>Dein Foto wird geprüft und die ausgewählten Extensions werden virtuell ergänzt.</p>
      <div className="rh-wizard-dots" aria-hidden="true"><i/><i/><i/></div>
      <small>Dein Look wird erstellt. Bitte diese Seite geöffnet lassen.</small>
     </div>}
    </section>}

    {wizardStep===4&&before&&after&&<section className="rh-wizard-content rh-wizard-result">
     <div className="rh-wizard-heading">
      <span className="rh-wizard-eyebrow"><Sparkles size={16}/> DEIN NEUER LOOK IST DA</span>
      <h1>Voilà! <em>Dein neuer Look.</em></h1>
      <p>Ziehe die Linie nach links oder rechts und entdecke den Unterschied.</p>
     </div>
     <div className="rh-wizard-compare" onPointerDown={startCompare} onPointerMove={dragCompare}
      role="group" aria-label="Vorher-Nachher-Fotovergleich">
      <img className="rh-wizard-original" src={before.url} alt="Vorher: Originalfoto" draggable={false}/>
      <div className="rh-wizard-edited" style={{clipPath:"inset(0 0 0 "+ratio+"%)"}}>
       <img src={after.url} alt="Nachher: KI-Vorschau mit Extensions" draggable={false}/>
      </div>
      <div className="rh-wizard-comparison-line" style={{left:ratio+"%"}}><span><ArrowLeftRight size={20}/></span></div>
      <div className="rh-wizard-comparison-labels"><span>VORHER</span><span>NACHHER</span></div>
     </div>
     <div className="rh-wizard-compare-slider"><span>Vorher</span>
      <input id="rh-tryon-ratio" type="range" min="0" max="100" value={ratio}
       aria-label="Vorher-Nachher-Vergleich" aria-valuetext={ratio+" Prozent Vorher"}
       onChange={event=>setRatio(Number(event.target.value))}/>
      <span>Nachher</span>
     </div>
     <p className="rh-wizard-result-note">Dies ist eine unverbindliche KI-Vorschau. Bitte vergleiche den Haaransatz und die ursprüngliche Haarfarbe mit dem Original.</p>
     <div className="rh-wizard-buttons">
      <button type="button" className="rh-wizard-back" onClick={()=>{clearResult();goStep(2);}}>
       <RefreshCw size={17}/> Anderen Look testen
      </button>
      <a className="rh-wizard-main-button" href={after.url} download="ruby-hair-vorschau.webp"><Download size={17}/> Ergebnis speichern</a>
     </div>
    </section>}
   </div>
   <div className="rh-wizard-foot">
    <LockKeyhole size={15}/><span>Dein Foto wird nur nach ausdrücklicher Einwilligung an OpenAI übertragen.</span>
    <details><summary>Wichtige Hinweise</summary>
     <p>Das KI-Ergebnis ist eine unverbindliche Vorschau. Die eigene Haarfarbe soll unverändert bleiben; bei abweichender Haarfarbe oder unnatürlichem Ansatz ist das Ergebnis nicht zuverlässig. Die tatsächliche Haarmenge und Farbabstimmung beurteilt eine Fachperson. Bestellungen sind auf dieser Vorschauseite noch deaktiviert.</p>
    </details>
   </div>
  </div>
 </>;
}
