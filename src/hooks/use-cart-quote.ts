"use client";
import {useEffect,useState} from "react";
import type {CartLine} from "@/components/cart-context";
import type {CartQuote} from "@/lib/cart-quote";

export function useCartQuote(lines:CartLine[]){
  const key=JSON.stringify(lines);
  const [result,setResult]=useState<{key:string;quote:CartQuote}|null>(null);
  const [errorKey,setErrorKey]=useState<string|null>(null);
  useEffect(()=>{
    if(!lines.length)return;
    const controller=new AbortController();
    fetch("/api/cart/quote",{
      method:"POST",cache:"no-store",signal:controller.signal,
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({lines})
    }).then(response=>{
      if(!response.ok)throw new Error("Serverseitige Preisprüfung nicht verfügbar");
      return response.json() as Promise<CartQuote>;
    }).then(data=>{
      if(!controller.signal.aborted)setResult({key,quote:data});
    }).catch(()=>{
      if(!controller.signal.aborted)setErrorKey(key);
    });
    return ()=>controller.abort();
  },[key]);
  const quote=result?.key===key?result.quote:null;
  const error=errorKey===key;
  return {quote,error,loading:lines.length>0&&!quote&&!error};
}
