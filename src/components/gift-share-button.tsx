"use client";
import {useState} from "react";
export default function ShareGiftButton({imageUrl}:{imageUrl:string}){
 const [error,setError]=useState(false);
 return <button className="rh-gift-outline" type="button" onClick={async()=>{
  setError(false);
  try{
   const r=await fetch(imageUrl,{cache:"no-store"});if(!r.ok)throw Error("IMAGE_NOT_READY");
   const file=new File([await r.blob()],"ruby-hair-geschenk.png",{type:"image/png"});
   if(navigator.share&&navigator.canShare?.({files:[file]}))await navigator.share({title:"Ruby Hair Geschenk",files:[file]});
   else{
    const a=document.createElement("a");a.href=imageUrl+"&download=1";a.download="ruby-hair-geschenkgutschein.png";a.click();
   }
  }catch{setError(true)}
 }}>Bild teilen{error&&<span className="rh-gift-error-text"> · Bitte stattdessen herunterladen</span>}</button>;
}
