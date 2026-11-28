import {purchaseSourceLabels,type Touch} from "@/lib/purchase-attribution-policy";
export default function AdminPurchaseSource({value,unavailable=false,compact=false}:{value?:{first:Touch;last:Touch};unavailable?:boolean;compact?:boolean}){
 if(unavailable)return <span>{compact?"Nicht verfügbar":"Zuordnung derzeit nicht verfügbar"}</span>;
 if(!value)return <span>{compact?"Unbekannt":"Unbekannt / keine Einwilligung oder ältere Bestellung"}</span>;
 const {first,last}=value;
 const labels=(t:Touch)=>purchaseSourceLabels[t.source].replace("nicht eindeutig bezahlt","Werbezuordnung unklar");
 if(compact)return <strong>{labels(last).replace(" · Werbezuordnung unklar","")}</strong>;
 return <span><strong>{labels(last)}</strong><small style={{display:"block"}}>Erste erkennbare Quelle: {labels(first)} · Gerät: {last.device==="mobile"?"Mobil":last.device==="desktop"?"Desktop":"Unbekannt"}</small>
 {(last.campaignId||last.adSetId||last.adId)&&<small style={{display:"block"}}>{[last.campaignId&&"Kampagne "+last.campaignId,last.adSetId&&"Anzeigengruppe "+last.adSetId,last.adId&&"Anzeige "+last.adId].filter(Boolean).join(" · ")}</small>}</span>
}
