import type {Metadata} from "next";
import Link from "next/link";
export const metadata:Metadata={title:"Ruby Hair Klarna Test",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function KlarnaQaReturn({searchParams}:{searchParams:Promise<{ref?:string;result?:string}>}){
 const params=await searchParams;
 const ref=typeof params.ref==="string"&&/^[0-9a-f-]{36}$/i.test(params.ref)?params.ref:null;
 const result=["success","cancel","back","failure","error"].includes(String(params.result))?params.result:"unknown";
 const redirectTo=result==="success"&&ref?"/admin/testbestellung?klarnaReturn="+encodeURIComponent(ref):"/admin/testbestellung";
 return <main style={{minHeight:"100svh",background:"#241b20",color:"#f4efea",display:"grid",placeItems:"center",padding:30,fontFamily:"Arial,sans-serif"}}>
  <div style={{maxWidth:560,background:"#3c2b34",padding:"clamp(28px,5vw,54px)",width:"100%"}}>
   <p style={{fontSize:13,letterSpacing:3,color:"#e5b9ca"}}>RUBY HAIR EXTENSIONS</p>
   <h1 style={{fontFamily:"Georgia,serif",fontWeight:400,fontSize:37,margin:"22px 0"}}>{result==="success"?"Klarna-Freigabe erhalten":"Klarna-Test zurückgekehrt"}</h1>
   <p style={{lineHeight:1.8,fontSize:14}}>Diese Seite bucht kein Geld ab. Im geschützten Ruby-Hair-Adminbereich werden die Klarna-Bestellung und der Betrag direkt beim Anbieter geprüft. Eine echte Abbuchung erfordert eine weitere ausdrückliche Bestätigung.</p>
   <Link href={redirectTo} style={{display:"inline-block",marginTop:24,padding:"17px 22px",background:"#f4efea",color:"#241b20",fontWeight:700,textDecoration:"none",fontSize:12,letterSpacing:1}}>ZUM GESCHÜTZTEN TESTPANEL</Link>
  </div>
 </main>;
}
