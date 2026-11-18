"use client";
import {useState} from "react";
import Link from "next/link";

type Details={name:string;contract:string;email:string};
type ResponseData={received?:boolean;receivedAt?:string;reference?:string;acknowledgmentSent?:boolean;error?:string};
const labelStyle:React.CSSProperties={display:"grid",gap:8,fontSize:14,fontWeight:600};
const inputStyle:React.CSSProperties={padding:"13px 14px",border:"1px solid #baa9ac",borderRadius:3,fontSize:16,width:"100%",background:"#fff"};
const actionStyle:React.CSSProperties={padding:"15px 22px",background:"#563847",color:"#fff",border:0,fontSize:14,fontWeight:700,cursor:"pointer"};
export default function WithdrawalForm(){
 const [step,setStep]=useState<"details"|"confirm"|"received">("details");
 const [details,setDetails]=useState<Details>({name:"",contract:"",email:""});
 const [result,setResult]=useState<ResponseData|null>(null);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(false);
 const set=(key:keyof Details,value:string)=>setDetails(v=>({...v,[key]:value}));
 const send=async()=>{
  if(loading)return;
  setLoading(true);setError("");
  try{
   const response=await fetch("/api/widerruf",{
    method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json"},body:JSON.stringify(details),
    signal:AbortSignal.timeout(40000)
   });
   const data=await response.json() as ResponseData;
   if(!response.ok||!data.received){
    if(data.error==="RATE_LIMITED")throw new Error("Zu viele Anfragen. Bitte kontaktiere info@rubyhair.de.");
    throw new Error("Die Erklärung konnte nicht sicher übermittelt werden. Bitte sende deinen Widerruf direkt an info@rubyhair.de.");
   }
   setResult(data);setStep("received");
  }catch(e){setError(e instanceof Error?e.message:"Die Übermittlung ist vorübergehend nicht möglich.");}
  finally{setLoading(false);}
 };
 return <section style={{maxWidth:620,margin:"28px 0 64px",padding:24,background:"#f7f3f0",border:"1px solid #e5dcda"}}>
  {step==="details"&&<form onSubmit={e=>{e.preventDefault();setError("");setStep("confirm");}} style={{display:"grid",gap:20}}>
   <p>Bitte gib deinen Namen, eine Bestell- oder Vertragsreferenz und deine E-Mail-Adresse für die Eingangsbestätigung an. Eine Begründung ist nicht erforderlich.</p>
   <label style={labelStyle}>Name
    <input style={inputStyle} type="text" value={details.name} onChange={e=>set("name",e.target.value)} minLength={2} maxLength={120} autoComplete="name" required/>
   </label>
   <label style={labelStyle}>Bestellnummer / Vertrag oder betroffener Vertragsteil
    <input style={inputStyle} type="text" value={details.contract} onChange={e=>set("contract",e.target.value)} minLength={3} maxLength={160} required/>
   </label>
   <label style={labelStyle}>E-Mail-Adresse für die Eingangsbestätigung
    <input style={inputStyle} type="email" value={details.email} onChange={e=>set("email",e.target.value)} maxLength={254} autoComplete="email" required/>
   </label>
   <button style={actionStyle} type="submit">Weiter zur Bestätigung</button>
  </form>}
  {step==="confirm"&&<div style={{display:"grid",gap:17}}>
   <h2 style={{fontSize:28}}>Widerruf prüfen</h2>
   <p>Hiermit widerrufe ich den angegebenen Vertrag beziehungsweise den angegebenen Vertragsteil.</p>
   <dl style={{display:"grid",gridTemplateColumns:"minmax(105px,1fr) 2fr",gap:12,overflowWrap:"anywhere"}}>
    <dt>Name</dt><dd>{details.name}</dd>
    <dt>Vertrag</dt><dd>{details.contract}</dd>
    <dt>Bestätigung an</dt><dd>{details.email}</dd>
   </dl>
   <p>Der Widerruf wird erst durch den nächsten Klick übermittelt.</p>
   {error&&<p role="alert" style={{color:"#9c3043"}}>{error}</p>}
   <button style={actionStyle} type="button" disabled={loading} onClick={send}>{loading?"Widerruf wird übermittelt …":"Widerruf bestätigen"}</button>
   <button type="button" disabled={loading} onClick={()=>{setError("");setStep("details");}} style={{padding:12,border:"1px solid #bca6af",background:"transparent",cursor:"pointer"}}>Angaben korrigieren</button>
  </div>}
  {step==="received"&&result&&<div role="status" style={{display:"grid",gap:14}}>
   <h2 style={{fontSize:28}}>Widerruf eingegangen</h2>
   <p>Deine Widerrufserklärung wurde registriert. Die Prüfung ihrer rechtlichen Wirksamkeit erfolgt gesondert.</p>
   <p><strong>Eingang:</strong> {result.receivedAt?new Date(result.receivedAt).toLocaleString("de-DE",{dateStyle:"medium",timeStyle:"medium",timeZone:"Europe/Berlin"}):"Registriert"}</p>
   <p style={{overflowWrap:"anywhere"}}><strong>Referenz:</strong> {result.reference}</p>
   <p>{result.acknowledgmentSent?"Die Eingangsbestätigung wurde per E-Mail versandt.":"Die E-Mail-Eingangsbestätigung ist noch ausstehend. Deine Erklärung ist registriert; bitte prüfe dein Postfach oder kontaktiere info@rubyhair.de."}</p>
   <Link href="/">Zur Startseite</Link>
  </div>}
 </section>;
}
