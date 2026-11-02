"use client";

import {useEffect,useMemo,useState,type ChangeEvent} from "react";
import Link from "next/link";
import {ArrowUpRight,ArrowLeftRight,Check,Clipboard,ImagePlus,LockKeyhole,Scissors,Sparkles,Upload,X} from "lucide-react";

type Variation={color:string;length:string;image:string;key:string};
type Product={slug:string;name:string;pack:string;material:string;variants:Variation[]};
type LocalPhoto={url:string;name:string};
type Density="fein"|"normal"|"dicht";

const recommendation:Record<Density,string>={
 fein:"2–4 Packungen",normal:"4–5 Packungen",dicht:"5–6 Packungen"
};
const densityLabels:Record<Density,string>={fein:"Feines Haar",normal:"Normales Haar",dicht:"Dichtes Haar"};
function unique<T>(items:T[]):T[]{return [...new Set(items)];}
function photoPrompt(product:Product,variant:Variation,density:Density){
 const method=product.slug==="keratin-bondings"
  ?"Keratin-Bondings, als einzelne fein verteilte Echthaarsträhnen mit diskreten Verbindungspunkten"
  :"Tape-in Extensions, als flache Tape-Wefts unter den Deckhaarschichten";
 return [
  "FOTOREALISTISCHE HAARVERLÄNGERUNGS-VORSCHAU – RUBY HAIR",
  "Bearbeite das zusätzlich bereitgestellte ORIGINALFOTO der Person. Ohne Ausgangsfoto nicht generieren.",
  "Das Gesicht, die Identität, Gesichtszüge, Haut, Gesichtsausdruck, Körperproportionen, Pose, Kleidung, Licht und Hintergrund MÜSSEN unverändert bleiben.",
  "Bearbeite ausschließlich den sichtbaren Haarbereich (einschließlich neu hinzukommender Haarlängen unterhalb der ursprünglichen Spitzen).",
  "Bewahre die natürliche Haarlinie, den Scheitel, Haarwuchs und die Grundstruktur des Eigenhaars. Keine Perücke, keine Veränderung des Haarschnitts am Ansatz.",
  "Produkt: "+product.name+" ("+product.material+"). Methode: "+method+".",
  "Ziel-Länge des Extensions-Produkts: "+variant.length+". Die sichtbare Endlänge hängt von Körpergröße und Ansatzposition ab; nicht als Messwert simulieren.",
  "Farb-Referenz aus der Ruby-Hair-Farbkarte: "+variant.color+". NUR den Haarfarbton an das ausgewählte Produkt-Farbfoto annähern und natürlich mit dem Eigenhaar verblenden.",
  "Haardichte als grobe Orientierung: "+densityLabels[density]+". Natürliches, proportional realistisches Zusatzvolumen ohne künstlich überfüllte Silhouette.",
  "Erstelle glaubwürdige Übergänge von Eigenhaar zu Extensions, stimmige Strähnchen, natürliche Spitzen und Schatten. Keine sichtbaren Klebestreifen oder Bondings am Deckhaar.",
  "Keine Gesichtsretusche, kein Makeup, kein Filter, kein anderer Mensch, kein Vorher-Nachher-Collage-Layout.",
  "Liefere EIN bearbeitetes Bild bei gleicher Perspektive und möglichst gleichem Bildausschnitt wie das Original.",
  "Dies ist eine unverbindliche Visualisierung, keine Zusage über das tatsächliche Friseurergebnis."
 ].join("\n");
}

export default function HairTryonLab({products}:{products:Product[]}){
 const first=products[0];
 const [slug,setSlug]=useState(first?.slug||"");
 const product=products.find(p=>p.slug===slug)||first;
 const [color,setColor]=useState(first?.variants[0]?.color||"");
 const [length,setLength]=useState(first?.variants[0]?.length||"");
 const [density,setDensity]=useState<Density>("normal");
 const [before,setBefore]=useState<LocalPhoto|null>(null);
 const [after,setAfter]=useState<LocalPhoto|null>(null);
 const [ratio,setRatio]=useState(50);
 const [issue,setIssue]=useState("");
 const [copied,setCopied]=useState(false);
 const [showAll,setShowAll]=useState(false);
 const lengths=useMemo(()=>unique(product?.variants.map(v=>v.length)||[]),[product]);
 const colors=useMemo(()=>unique(product?.variants.map(v=>v.color)||[]),[product]);
 const available=product?.variants.filter(v=>v.color===color)||[];
 const picked=available.find(v=>v.length===length)||available[0]||product?.variants[0];
 const currentColor=picked?.color||color;
 const currentLength=picked?.length||length;
 const colorOptions=colors.map(tone=>product.variants.find(v=>v.color===tone)!).filter(Boolean);
 const prompt=product&&picked?photoPrompt(product,picked,density):"";
 useEffect(()=>()=>{if(before)URL.revokeObjectURL(before.url);},[before]);
 useEffect(()=>()=>{if(after)URL.revokeObjectURL(after.url);},[after]);
 const chooseProduct=(next:string)=>{
   const p=products.find(item=>item.slug===next);
   if(!p)return;
   setSlug(next);setColor(p.variants[0]?.color||"");setLength(p.variants[0]?.length||"");
   setShowAll(false);setCopied(false);
 };
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
   const photo={url:URL.createObjectURL(file),name:file.name};
   if(kind==="before"){setBefore(photo);setAfter(null);}
   else setAfter(photo);
   setRatio(50);event.target.value="";
 };
 const copyPrompt=async()=>{
   try{
     await navigator.clipboard.writeText(prompt);
     setCopied(true);setIssue("");
   }catch{setIssue("Kopieren nicht verfügbar: Markiere den Text im Feld und kopiere ihn manuell.");}
 };
 return <>
   <section className="rh-tryon-hero rh-shell">
    <nav className="rh-breadcrumb" aria-label="Breadcrumb"><Link href="/">Startseite</Link><span>/</span><span>Hair Preview Lab</span></nav>
    <div className="rh-tryon-hero-grid">
      <div><div className="rh-eyebrow">RUBY HAIR / VIRTUAL HAIR STUDIO</div>
       <h1>See the <em>possibility.</em></h1>
       <p>Finde deine Extensions-Methode, Farbe und Länge. Mit unserem privaten Vergleichslabor kannst du dein Ausgangsbild und ein separat erstelltes KI-Ergebnis direkt übereinander vergleichen.</p>
       <div className="rh-tryon-status"><LockKeyhole size={17}/><span>TESTVERSION · Bilder bleiben in diesem Browser · Keine automatische KI-Bildgenerierung</span></div>
      </div>
      <div className="rh-tryon-feature-note">
        <Sparkles size={28} strokeWidth={1.4}/><span>YOUR NEXT<br/>HAIR STORY.</span>
        <p>Ein realistischer Ausblick auf Länge, Farbwirkung und Haarvolumen – keine Garantie für das Ergebnis einer professionellen Anwendung.</p>
      </div>
    </div>
   </section>
   <div className="rh-shell rh-tryon-layout">
    <section className="rh-tryon-controls" aria-label="Extensions konfigurieren">
      <div className="rh-tryon-block">
       <span className="rh-tryon-step">01 / METHODE</span>
       <h2>Deine Extensions.</h2>
       <div className="rh-tryon-methods">{products.map(p=><button key={p.slug} type="button" className={p.slug===slug?"is-selected":""} onClick={()=>chooseProduct(p.slug)} aria-pressed={p.slug===slug}><strong>{p.name}</strong><small>{p.pack}</small></button>)}</div>
      </div>
      <div className="rh-tryon-block">
       <span className="rh-tryon-step">02 / FARBE</span>
       <h2>Wähle deinen Ton.</h2>
       <div className="rh-tryon-shades">{colorOptions.slice(0,showAll?undefined:12).map(v=><button key={v.color} type="button" className={currentColor===v.color?"is-selected":""} aria-pressed={currentColor===v.color} title={"Farbton "+v.color} onClick={()=>{setColor(v.color);const same=product.variants.find(x=>x.color===v.color&&x.length===length);if(!same)setLength(v.length);setCopied(false);}}>
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
        return <button key={size} type="button" disabled={!has} className={currentLength===size?"is-selected":""} aria-pressed={currentLength===size} onClick={()=>{setLength(size);setCopied(false);}}>{size}</button>;
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
     {issue&&<p role="alert" className="rh-tryon-error">{issue}</p>}
     {!before?<div className="rh-tryon-placeholder"><Scissors size={49} strokeWidth={1.2}/><h3>Dein Foto. Dein Look.</h3><p>Bitte lade ein eigenes Foto mit gut sichtbaren Haaren und Schultern hoch. Keine Hüte, keine starken Filter – idealerweise von vorn oder leicht seitlich.</p><small>JPG, PNG, WebP · max. 8 MB · keine Serverübertragung</small></div>:
       <div className="rh-tryon-viewer">
        <div className="rh-tryon-before"><img src={before.url} alt="Vorher: Originalfoto" /></div>
        {after&&<><div className="rh-tryon-after" style={{clipPath:"inset(0 0 0 "+ratio+"%)"}}><img src={after.url} alt="Nachher: manuell hochgeladenes KI-Ergebnis"/></div><div className="rh-tryon-divider" style={{left:ratio+"%"}}><ArrowLeftRight size={18}/></div></>}
        <div className="rh-tryon-photo-labels"><span>VORHER</span><span>{after?"NACHHER":"ERGEBNIS FEHLT"}</span></div>
        {!after&&<div className="rh-tryon-no-after">Ausgangsfoto bereit.<br/>Erstelle ein KI-Bild mit dem Prompt und importiere es hier für den Vergleich.</div>}
       </div>}
     {before&&after&&<div className="rh-tryon-slider"><label htmlFor="rh-tryon-ratio">Vergleich verschieben</label><input id="rh-tryon-ratio" type="range" min="0" max="100" value={ratio} onChange={e=>setRatio(Number(e.target.value))} aria-valuetext={ratio+" Prozent Vorher"}/><span>{ratio}%</span></div>}
     {(before||after)&&<p className="rh-tryon-privacy"><LockKeyhole size={15}/> Die ausgewählten Bilder werden nur vorübergehend in deinem Browser angezeigt und beim Verlassen der Seite nicht gespeichert.</p>}
     <div className="rh-tryon-prompt-panel">
      <div className="rh-tryon-prompt-head"><div><span className="rh-tryon-step">05 / KI-BILDVORLAGE</span><h3>Dein Bildauftrag.</h3></div><button type="button" onClick={copyPrompt}><Clipboard size={16}/>{copied?<><Check size={13}/> Kopiert</>:"Prompt kopieren"}</button></div>
      <p>Für den Test kannst du dein Originalfoto und das gewählte Ruby-Hair-Farbfoto zusammen mit diesem Auftrag in einem Bildeditor mit KI verwenden. Importiere danach das Ergebnis oben. Ein KI-Anbieter ist hier noch nicht angebunden.</p>
      <textarea readOnly aria-label="KI Prompt für die ausgewählte Ruby Hair Variante" value={prompt} rows={7} onFocus={e=>e.target.select()}/>
     </div>
     <p className="rh-tryon-final-note">Die Vorschau simuliert kein technisch exaktes Friseurergebnis. Ansatzposition, Schnitt, Farbangleichung, Tragegefühl und benötigte Menge müssen professionell beurteilt werden. Bestellungen sind auf dieser Website noch deaktiviert.</p>
    </section>
   </div>
 </>;
}
