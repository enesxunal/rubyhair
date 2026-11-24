"use client";
import {useEffect,useState} from "react";
import {ProductSearch} from "@/components/product-search";
import type {Product} from "@/lib/catalog";

export function SearchCatalog({initialQuery=""}:{initialQuery?:string}){
 const [attempt,setAttempt]=useState(0);
 const [result,setResult]=useState<Product[]|null>(null);
 const [failed,setFailed]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();
  let active=true;
  setFailed(false);setResult(null);
  const timeout=setTimeout(()=>controller.abort(),12000);
  void (async()=>{
   try{
    const response=await fetch("/api/catalog",{cache:"no-store",signal:controller.signal});
    if(!response.ok)throw new Error("CATALOG_UNAVAILABLE");
    const data=await response.json() as {source:string;products:Product[]};
    if(data.source!=="postgresql"||!Array.isArray(data.products))throw new Error("CATALOG_UNAVAILABLE");
    if(active)setResult(data.products.filter(p=>p.slug==="tape-in-extensions"));
   }catch{if(active)setFailed(true);}
   finally{clearTimeout(timeout);}
  })();
  return ()=>{active=false;clearTimeout(timeout);controller.abort();};
 },[attempt]);
 if(result)return <ProductSearch key={initialQuery} initialQuery={initialQuery} products={result}/>;
 return <section className="rh-shell rh-shades-section" aria-live="polite" aria-busy={!failed}>
  {failed?<div role="alert"><h2>Produktkatalog gerade nicht verfügbar.</h2><p>Die aktuellen Farben und Bestände konnten nicht geladen werden. Bitte versuche es erneut.</p><button type="button" className="solid-button" onClick={()=>setAttempt(a=>a+1)}>Erneut laden</button></div>:<p role="status">Aktuelle Farben und Verfügbarkeit werden geladen …</p>}
 </section>;
}
