"use client";
import {useEffect,useState} from "react";
import {blackFridayActive} from "@/lib/black-friday";
export default function BlackFridayBadge({hint=false,hero=false}:{hint?:boolean;hero?:boolean}){
 const [active,setActive]=useState(false);
 useEffect(()=>{
  const tick=()=>setActive(blackFridayActive());
  tick();
  const id=setInterval(tick,30000);
  return ()=>clearInterval(id);
 },[]);
 return active?<span className={hint?"rh-bf-coupon-hint":"rh-bf-card-badge"+(hero?" rh-bf-hero-label":"")}>{hint?"Black Friday Aktionspreis · 15 % automatisch":"BLACK FRIDAY · –15 %"}</span>:null;
}
