"use client";
import {useEffect} from "react";
import {trackVerifiedPurchaseOnce} from "@/lib/verified-purchase-event";
/** Rendered only after server reconciliation confirms CAPTURED and issued voucher. */
export default function VerifiedGiftPurchase({purchaseId}:{purchaseId:string}){
 useEffect(()=>{trackVerifiedPurchaseOnce(purchaseId)},[purchaseId]);
 return null;
}
