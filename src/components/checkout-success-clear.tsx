"use client";
import {useEffect} from "react";
import {useCart,type CartLine} from "@/components/cart-context";
import type {MetaPurchaseData} from "@/lib/meta-pixel";
import {trackVerifiedPurchaseOnce} from "@/lib/verified-purchase-event";
/** Only clear the exact purchased lines on a verified paid return, never on PayPal cancellation. */
export default function CheckoutSuccessClear({orderId,purchase}:{orderId:string;purchase?:MetaPurchaseData}){
 const {loaded,clearPurchased}=useCart();
 useEffect(()=>{
  if(!loaded)return;
  const key="rubyhair-checkout-purchased:"+orderId;
  // A fresh server-confirmed capture may be tracked even after the browser cart snapshot was lost.
  // Keep historic returns on the previous snapshot-only behavior.
  if(purchase)try{trackVerifiedPurchaseOnce(orderId,purchase)}catch{/* Analytics must not interrupt cart cleanup. */}
  try{
   const raw=sessionStorage.getItem(key);
   if(!raw)return;
   const snapshot=JSON.parse(raw) as {lines:CartLine[];giftIds:string[]};
   if(!Array.isArray(snapshot.lines)||!Array.isArray(snapshot.giftIds))return;
   clearPurchased(snapshot.lines,snapshot.giftIds);
   sessionStorage.removeItem(key);
   if(!purchase)trackVerifiedPurchaseOnce(orderId);
  }catch{try{sessionStorage.removeItem(key)}catch{}}
 },[loaded,orderId,clearPurchased,purchase]);
 return null;
}
