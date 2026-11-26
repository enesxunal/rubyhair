"use client";
import {useEffect,useState} from "react";
import type {CartLine} from "@/components/cart-context";
import type {CartQuote} from "@/lib/cart-quote";

export function useCartQuote(lines:CartLine[],couponCode=""){
  const key=JSON.stringify({lines,couponCode});
  const [result,setResult]=useState<{key:string;quote:CartQuote}|null>(null);
  const [errorKey,setErrorKey]=useState<string|null>(null);
  useEffect(()=>{
    if(!lines.length)return;
    const controller=new AbortController();
    setErrorKey(null);
    async function load(){
      for(let attempt=0;attempt<2;attempt++){
        try{
          const response=await fetch("/api/cart/quote",{
            method:"POST",cache:"no-store",signal:controller.signal,
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({lines,...(couponCode?{couponCode}:{})})
          });
          if(!response.ok){if(response.status<500){if(!controller.signal.aborted)setErrorKey(key);return;}throw new Error("QUOTE_UNAVAILABLE");}
          const data=await response.json() as CartQuote;
          if(!controller.signal.aborted){setErrorKey(null);setResult({key,quote:data})}return;
        }catch{
          if(controller.signal.aborted)return;
          if(attempt===0){await new Promise(resolve=>setTimeout(resolve,800));if(controller.signal.aborted)return;}
          else setErrorKey(key);
        }
      }
    }
    void load();
    return ()=>controller.abort();
  },[key]);
  const quote=result?.key===key?result.quote:null;
  const error=errorKey===key;
  return {quote,error,loading:lines.length>0&&!quote&&!error};
}
