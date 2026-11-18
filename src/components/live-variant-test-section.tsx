"use client";
import {useState} from "react";
import {startLiveVariantTestAction,captureLiveVariantTestAction,cancelLiveVariantTestAction} from "../../app/live-variant-test-actions";

export type LiveVariantTestView={
 ready:boolean;
 priceCents:number|null;
 pending:{id:string;hasReference:boolean}|null;
 completed:{id:string;invoiceNumber:string|null}|null;
 approvedPaypalToken:string|null;
 error:string|null;
 status:string|null;
 paid:string|null;
};

export default function LiveVariantTestSection({state,cartReady}:{state:LiveVariantTestView;cartReady:boolean}){
 const [buyerName,setBuyerName]=useState("");
 const [buyerEmail,setBuyerEmail]=useState("");
 const allowStart=state.ready&&!state.pending&&!state.completed&&cartReady;
 return <section className="rh-checkout-payment-preview" style={{border:"2px solid #8f6677",padding:22,marginTop:20}}>
  <h3>RUBY HAIR / INTERNER LIVE-PRODUKTTEST</h3>
  <p style={{fontSize:13,lineHeight:1.8}}>
   <strong>Originalartikel: Tape-in Extensions · Farbe 4 · 45–50 cm.</strong> Für diese
   einmalige, nur dem Administrator zugängliche Prüfung beträgt der Artikelwert
   <strong> 1,00 € einschließlich 19 % USt.</strong> Versand: 0,00 €. Die Ware
   wird <strong>nicht geliefert</strong>; dies ist eine echte PayPal-Testzahlung,
   keine normale Kundenbestellung.
  </p>
  <p style={{fontSize:12,lineHeight:1.7}}>
   Die übrige Kasse bleibt für öffentliche Verkäufe gesperrt. Diese Testfunktion
   verlangt eine bestätigte Administratoranmeldung und kann pro Artikel nur einmal offen sein.
  </p>
  {state.error&&<p className="rh-admin-warning" role="alert">
   Testvorgang nicht abgeschlossen ({state.error.replaceAll("_"," ").slice(0,100)}).
   Keine zweite Zahlung beginnen, bevor der Providerstatus geprüft ist.
  </p>}
  {state.status==="cancelled"&&<p role="status">Rückkehr vom Anbieter ohne Abschluss. Der noch offene Vorgang muss geprüft werden.</p>}
  {state.paid&&state.completed?.invoiceNumber===state.paid&&<p role="status" style={{color:"#397347"}}>
   Die Zahlung wurde bestätigt. Die Testrechnung ist gespeichert und der normale Artikelpreis wiederhergestellt.
  </p>}
  {state.completed&&<p style={{marginTop:12,lineHeight:1.8}}>
   <strong>Bereits abgeschlossener Test.</strong>
   {state.completed.invoiceNumber&&<> Rechnung: <a href={"/api/admin/qa-invoice?orderId="+state.completed.id} style={{textDecoration:"underline"}}>
    {state.completed.invoiceNumber} als PDF herunterladen
   </a></>}
  </p>}
  {state.approvedPaypalToken&&state.pending&&<form action={captureLiveVariantTestAction}
    style={{display:"grid",gap:12,padding:16,background:"#f7f1f3",color:"#3c2832",marginTop:18}}>
   <strong>PayPal-Freigabe eingegangen – echte Zahlung bestätigen</strong>
   <p style={{fontSize:12,lineHeight:1.6}}>
    Erst dieser Schritt kann 1,00 € einziehen. Der Server kontrolliert den
    PayPal-Betrag, die Order-ID und die Transaktion vor der Rechnungsstellung.
   </p>
   <input type="hidden" name="paypalOrderId" value={state.approvedPaypalToken}/>
   <label style={{display:"flex",gap:9,fontSize:12,alignItems:"flex-start"}}>
    <input required type="checkbox" name="confirmCapture"/>
    Ich stimme dem einmaligen echten PayPal-Einzug über 1,00 € ausdrücklich zu.
   </label>
   <button type="submit" style={{padding:14,background:"#583746",color:"white"}}>
    1,00 € jetzt endgültig einziehen und Rechnung erstellen
   </button>
  </form>}
  {state.pending&&<p style={{marginTop:15,fontSize:13}}>
   <a href="/admin/paypal-durum" style={{textDecoration:"underline",fontWeight:650}}>PayPal-Status sicher prüfen (ohne Abbuchung)</a>
  </p>}
  {state.pending&&!state.approvedPaypalToken&&<div style={{marginTop:16}}>
   <p style={{fontSize:12,color:"#94566b"}}>Eine Testzahlung ist bereits offen. Bitte zuerst beim Anbieter prüfen, bevor du erneut startest.</p>
   {state.pending.hasReference&&<form action={cancelLiveVariantTestAction}>
    <input type="hidden" name="orderId" value={state.pending.id}/>
    <button type="submit" style={{padding:"12px 14px",border:"1px solid #8f6677",background:"transparent",color:"#583746",fontSize:12}}>
     PayPal-Status prüfen und nur unbezahlte Testorder abbrechen
    </button>
   </form>}
  </div>}
  {!state.completed&&!state.pending&&!state.ready&&<p role="status" style={{color:"#94566b"}}>
   Der Originalartikel ist noch nicht für den einmaligen 1-€-Test eingerichtet.
  </p>}
  {!state.completed&&!state.pending&&state.ready&&!cartReady&&<p role="status" style={{color:"#94566b"}}>
   Bitte ausschließlich <strong>Tape-in Extensions, Farbe 4, 45–50 cm, Menge 1</strong> im Warenkorb auswählen.
  </p>}
  {allowStart&&<form action={startLiveVariantTestAction} style={{display:"grid",gap:13,marginTop:20,maxWidth:550}}>
   <input type="hidden" name="variationId" value="886"/>
   <label style={{fontSize:13}}>Name für die Testrechnung
    <input required name="buyerName" minLength={2} maxLength={100} value={buyerName} onChange={e=>setBuyerName(e.target.value)}
     autoComplete="name" style={{display:"block",width:"100%",marginTop:7,padding:12,border:"1px solid #d9cdd1"}}/>
   </label>
   <label style={{fontSize:13}}>E-Mail für die Testrechnung
    <input required name="buyerEmail" type="email" maxLength={254} value={buyerEmail} onChange={e=>setBuyerEmail(e.target.value)}
     autoComplete="email" style={{display:"block",width:"100%",marginTop:7,padding:12,border:"1px solid #d9cdd1"}}/>
   </label>
   <p style={{fontSize:12}}>
    Rechnungssteller: Ruby Hair / Nazmi Bulganlar, Klara Strasse 19, 45130 Essen.
    USt-ID: DE356097157. Betrag: 1,00 € einschließlich 0,16 € USt.
   </p>
   <label style={{display:"flex",gap:10,fontSize:12}}>
    <input type="checkbox" name="confirmSeller" required/> Ich bestätige die genannten Verkäufer- und Steuerdaten.
   </label>
   <label style={{display:"flex",gap:10,fontSize:12}}>
    <input type="checkbox" name="confirmTax" required/> Ich bestätige 19 % Umsatzsteuer für diese Testzahlung.
   </label>
   <label style={{display:"flex",gap:10,fontSize:12}}>
    <input type="checkbox" name="confirmCharge" required/> Ich weiß, dass dies eine echte Live-Zahlung über 1,00 € ohne Warenlieferung ist.
   </label>
   <button type="submit" style={{padding:"16px 18px",background:"#593746",color:"#fff",fontWeight:650}}>
    1,00 € PayPal-Kartentest für diesen Originalartikel starten
   </button>
  </form>}
 </section>;
}
