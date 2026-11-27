"use client";
import {useEffect} from "react";
import {reportBrowserSystemError} from "@/components/system-browser-monitor";

export default function StorefrontError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
 useEffect(()=>{
  // Display a stable customer-facing message. Server logs keep the diagnostic.
  console.error("RUBY_STOREFRONT_RENDER_FAILED",error.digest||error.name);
  reportBrowserSystemError("BROWSER_RUNTIME_FAILED");
 },[error]);
 return <main style={{minHeight:"52vh",display:"grid",placeItems:"center",padding:"48px 20px",background:"#faf7f4",fontFamily:"Arial,sans-serif"}}>
  <section role="alert" style={{width:"100%",maxWidth:540,textAlign:"center",padding:"36px 20px",color:"#3d2834"}}>
   <span style={{fontSize:12,letterSpacing:3,color:"#80586a"}}>RUBY HAIR</span>
   <h1 style={{fontFamily:"Georgia,serif",fontWeight:400,fontSize:"clamp(28px,5vw,45px)",lineHeight:1.14,margin:"20px 0"}}>Einen Moment, bitte.</h1>
   <p style={{lineHeight:1.8,color:"#6c5d65"}}>Diese Seite konnte gerade nicht geladen werden. Deine Bestellung und mögliche Zahlungen werden dadurch nicht erneut ausgelöst. Versuche es bitte erneut.</p>
   <button type="button" onClick={reset} style={{background:"#614052",color:"white",border:0,padding:"15px 30px",fontWeight:700,cursor:"pointer"}}>Seite erneut laden</button>
   <p><a style={{display:"inline-block",marginTop:18,color:"#614052"}} href="/">Zur Startseite</a></p>
   <small>Wenn der Fehler bestehen bleibt: <a href="mailto:info@rubyhair.de" style={{color:"#614052"}}>info@rubyhair.de</a></small>
  </section>
 </main>;
}
