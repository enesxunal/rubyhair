import {ImageResponse} from "next/og";
import {euroGift} from "./public";
const themes={
 classic:{bg:"#47303d",gold:"#e5cbd5",text:"#fffbfa",caption:"#eed5dc",line:"#c49aab"},
 soft:{bg:"#eadbd7",gold:"#765365",text:"#563645",caption:"#795867",line:"#bc899c"},
 black:{bg:"#1c1b1c",gold:"#dabd8c",text:"#fff6e6",caption:"#ddcbaa",line:"#957752"}
};
type PreviewGift={recipientName:string;senderName:string|null;message:string|null;amountCents:number;theme:string};
export function renderGiftCardImage(p:PreviewGift,code:string){
 const theme=themes[p.theme as keyof typeof themes]||themes.classic;
 const name=p.recipientName.slice(0,50),from=p.senderName?.slice(0,50),note=p.message?.slice(0,180);
 const image=new ImageResponse(
  <div style={{display:"flex",flexDirection:"column",background:theme.bg,color:theme.text,width:"100%",height:"100%",padding:"62px 78px",fontFamily:"Georgia,serif",position:"relative"}}>
   <div style={{position:"absolute",top:19,left:19,right:19,bottom:19,border:`1px solid ${theme.line}`,display:"flex",borderRadius:6}}/>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"Arial,sans-serif",fontSize:21,letterSpacing:8,color:theme.gold}}><span>RUBY HAIR</span><span style={{fontSize:13,letterSpacing:3}}>EXTENSIONS</span></div>
   <div style={{display:"flex",flexDirection:"column",alignItems:"center",flex:1,justifyContent:"center",gap:17,marginTop:14}}>
    <div style={{fontFamily:"Arial,sans-serif",fontSize:17,letterSpacing:6,color:theme.caption}}>A LITTLE SOMETHING FOR YOU</div>
    <div style={{fontSize:75,letterSpacing:-2,fontWeight:400}}>Gift of Beauty</div>
    <div style={{height:2,width:110,background:theme.line,display:"flex"}}/>
    <div style={{fontSize:88,marginTop:5}}>{euroGift(p.amountCents)}</div>
   </div>
   <div style={{display:"flex",flexDirection:"column",gap:10,minHeight:130,fontFamily:"Arial,sans-serif",fontSize:22}}>
    <div style={{display:"flex",alignItems:"center"}}>FÜR <span style={{fontFamily:"Georgia,serif",fontSize:28,paddingLeft:18}}>{name}</span></div>
    {note&&<div style={{fontSize:20,color:theme.caption,marginTop:4}}>{note}</div>}
    {from&&<div style={{display:"flex",fontSize:17,color:theme.caption}}>VON {from}</div>}
   </div>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"Arial,sans-serif",fontSize:17,letterSpacing:1,color:theme.caption,borderTop:`1px solid ${theme.line}`,paddingTop:24}}>
    <span>RUBYHAIR.DE</span><span>{code}</span>
   </div>
  </div>,{width:1200,height:760});
 return image;
}
