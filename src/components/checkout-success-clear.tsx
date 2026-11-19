"use client";
import {useEffect} from "react";
import {useCart,type CartLine} from "@/components/cart-context";
import {trackVerifiedPurchaseOnce} from "@/lib/verified-purchase-event";
/** Only clear the exact purchased lines on a verified paid return, never on PayPal cancellation. */
export default function CheckoutSuccessClear({orderId}:{orderId:string}){
 const {loaded,clearPurchased}=useCart();
 useEffect(()=>{
  if(!loaded)return;
  const key="rubyhair-checkout-purchased:"+orderId;
  try{
   const raw=sessionStorage.getItem(key);
   if(!raw)return;
   const snapshot=JSON.parse(raw) as {lines:CartLine[];giftIds:string[]};
   if(!Array.isArray(snapshot.lines)||!Array.isArray(snapshot.giftIds))return;
   clearPurchased(snapshot.lines,snapshot.giftIds);
   sessionStorage.removeItem(key);
   trackVerifiedPurchaseOnce(orderId);
  }catch{try{sessionStorage.removeItem(key)}catch{}}
 },[loaded,orderId,clearPurchased]);
 return null;
}
