"use client";
import {useEffect,useState} from "react";
import {blackFridayActive} from "@/lib/black-friday";
export default function BlackFridayBadge(){
 const [active,setActive]=useState(false);
 useEffect(()=>{
  const tick=()=>setActive(blackFridayActive());
  tick();
  const id=setInterval(tick,30000);
  return ()=>clearInterval(id);
 },[]);
 return active?<span className="rh-bf-card-badge">BLACK FRIDAY −15 %</span>:null;
}
