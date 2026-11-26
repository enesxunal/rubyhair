import {purchaseSourceLabels,type Touch} from "@/lib/purchase-attribution-policy";
export default function AdminPurchaseSource({value,unavailable=false}:{value?:{first:Touch;last:Touch};unavailable?:boolean}){
 if(unavailable)return <span>Zuordnung derzeit nicht verfügbar</span>;
 if(!value)return <span>Unbekannt / keine Einwilligung oder ältere Bestellung</span>;
 const {first,last}=value;
 const labels=(t:Touch)=>purchaseSourceLabels[t.source];
 return <span><strong>{labels(last)}</strong><small style={{display:"block"}}>Erste erkennbare Quelle: {labels(first)} · Gerät: {last.device==="mobile"?"Mobil":last.device==="desktop"?"Desktop":"Unbekannt"}</small>
 {(last.campaignId||last.adSetId||last.adId)&&<small style={{display:"block"}}>{[last.campaignId&&"Kampagne "+last.campaignId,last.adSetId&&"Anzeigengruppe "+last.adSetId,last.adId&&"Anzeige "+last.adId].filter(Boolean).join(" · ")}</small>}</span>
}
