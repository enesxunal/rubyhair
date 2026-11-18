import type {Metadata} from "next";
import Link from "next/link";
export const metadata:Metadata={title:"Ruby Hair PayPal Test",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function QaPaypalReturn({searchParams}:{searchParams:Promise<{token?:string;cancel?:string;variantTest?:string}>}){
 const data=await searchParams;
 const token=typeof data.token==="string"&&/^[A-Za-z0-9_-]{8,60}$/.test(data.token)?data.token:null;
 const cancelled=data.cancel==="1";
 const to=data.variantTest==="1"?
  token&&!cancelled?"/kasse?liveTest=1&paypalToken="+encodeURIComponent(token):"/kasse?liveTest=1&testStatus=cancelled":
  token&&!cancelled?"/admin/testbestellung?paypalToken="+encodeURIComponent(token):"/admin/testbestellung";
 return <main style={{minHeight:"100svh",background:"#241b20",color:"#f4efea",display:"grid",placeItems:"center",padding:30,fontFamily:"Arial,sans-serif"}}>
  <div style={{maxWidth:560,background:"#3c2b34",padding:"clamp(28px,5vw,54px)",width:"100%"}}>
   <p style={{fontSize:13,letterSpacing:3,color:"#e5b9ca"}}>RUBY HAIR EXTENSIONS</p>
   <h1 style={{fontFamily:"Georgia,serif",fontWeight:400,fontSize:37,margin:"22px 0"}}>{cancelled?"PayPal-Test abgebrochen":"PayPal-Freigabe erhalten"}</h1>
   <p style={{lineHeight:1.8,fontSize:14}}>{cancelled?
    "Es wurde auf dieser Seite keine Zahlung ausgelöst. Bitte kontrolliere den Status im Adminbereich, bevor du neu startest.":
    "Der Zahlungsvorgang muss im geschützten Ruby-Hair-Adminbereich bestätigt und anhand der PayPal-Daten geprüft werden. Diese Seite bucht kein Geld ab."}</p>
   <Link href={to} style={{display:"inline-block",marginTop:24,padding:"17px 22px",background:"#f4efea",color:"#241b20",fontWeight:700,textDecoration:"none",fontSize:12,letterSpacing:1}}>ZUM GESCHÜTZTEN TESTPANEL</Link>
  </div>
 </main>;
}
