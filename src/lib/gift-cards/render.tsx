import {ImageResponse} from "next/og";
import {euroGift} from "./public";
import {giftLogoLightDataUrl,giftLogoDarkDataUrl} from "./brand-logos";

type PreviewGift={recipientName:string;senderName:string|null;message:string|null;amountCents:number;theme:string};
const palettes={
 classic:{bg:"#49303e",text:"#fffaf7",muted:"#eed6de",line:"#bc94a7",accent:"#e9c1d2"},
 soft:{bg:"#f1e8e3",text:"#513a46",muted:"#806977",line:"#bea0ad",accent:"#805667"},
 black:{bg:"#202024",text:"#fff9f2",muted:"#ddc9b7",line:"#a58b74",accent:"#e7cba5"}
} as const;

/** The real purchased card uses the same visual hierarchy as the storefront editor. */
export function renderGiftCardImage(p:PreviewGift,code:string){
 const style=palettes[p.theme as keyof typeof palettes]||palettes.classic;
 const name=p.recipientName.slice(0,80),from=p.senderName?.slice(0,80),message=p.message?.slice(0,180);
 const logo=p.theme==="soft"?giftLogoDarkDataUrl:giftLogoLightDataUrl;
 return new ImageResponse(
  <div style={{display:"flex",flexDirection:"column",width:1200,height:760,background:style.bg,color:style.text,padding:"68px 80px 49px",fontFamily:"Georgia,serif",position:"relative"}}>
   <div style={{position:"absolute",left:23,right:23,top:23,bottom:23,border:`1px solid ${style.line}`,borderRadius:5,display:"flex",opacity:.78}}/>
   <div style={{display:"flex",flexDirection:"row",alignItems:"center",justifyContent:"space-between",height:78}}>
    <img src={logo} width={253} height={64} alt="Ruby Hair Extensions" style={{width:253,height:64,objectFit:"contain"}}/>
    <div style={{fontFamily:"Arial,sans-serif",fontSize:13,letterSpacing:3.5,color:style.muted}}>DIGITAL GIFT CARD</div>
   </div>
   <div style={{display:"flex",flexDirection:"column",flex:1,alignItems:"center",justifyContent:"center",gap:19,paddingTop:12,paddingBottom:9}}>
    <div style={{fontFamily:"Arial,sans-serif",fontSize:14,fontWeight:600,letterSpacing:5.5,color:style.accent}}>FÜR BESONDERE MOMENTE</div>
    <div style={{fontFamily:"Georgia,serif",fontSize:78,letterSpacing:-2.5,lineHeight:1.1}}>Geschenkgutschein</div>
    <div style={{width:92,height:1,background:style.line,display:"flex",marginTop:5}}/>
    <div style={{fontFamily:"Georgia,serif",fontSize:92,letterSpacing:-1,lineHeight:1.1}}>{euroGift(p.amountCents)}</div>
   </div>
   <div style={{display:"flex",flexDirection:"column",borderTop:`1px solid ${style.line}`,paddingTop:21,minHeight:140}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontFamily:"Arial,sans-serif",gap:18}}>
     <div style={{display:"flex",alignItems:"baseline",gap:14}}><span style={{fontSize:13,letterSpacing:3,color:style.accent}}>FÜR</span><span style={{fontFamily:"Georgia,serif",fontSize:28}}>{name}</span></div>
     {from&&<div style={{display:"flex",alignItems:"baseline",gap:11}}><span style={{fontSize:13,letterSpacing:3,color:style.accent}}>VON</span><span style={{fontFamily:"Georgia,serif",fontSize:23}}>{from}</span></div>}
    </div>
    {message&&<div style={{fontFamily:"Georgia,serif",fontSize:18,fontStyle:"italic",lineHeight:1.25,color:style.muted,marginTop:10,maxWidth:1000,overflow:"hidden",height:73}}>{`„${message}“`}</div>}
   </div>
   <div style={{display:"flex",flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderTop:`1px solid ${style.line}`,paddingTop:16,fontFamily:"Arial,sans-serif",fontSize:15,letterSpacing:1.6,color:style.muted}}>
    <div>RUBYHAIR.DE</div><div>{code}</div>
   </div>
  </div>,{width:1200,height:760});
}
