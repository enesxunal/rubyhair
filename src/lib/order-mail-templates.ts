// Pure presentation functions: safe to test without SMTP or a production database.
export const orderMailStages=["received","awaiting_payment","paid","processing","shipped","delivered","cancelled","failed"] as const;
export type OrderMailStage=(typeof orderMailStages)[number];
export type OrderMailData={orderNumber:string;customerName?:string;totalCents?:number;trackingNumber?:string;carrier?:string};
const stages:Record<OrderMailStage,{label:string;subject:string;heading:string;lead:string;action:string}>={
  received:{label:"Bestellung eingegangen",subject:"Deine Bestellung ist bei uns eingegangen",heading:"Danke für deine Bestellung.",lead:"Wir haben deine Bestellung erhalten und kümmern uns um die nächsten Schritte.",action:"Wir halten dich per E-Mail auf dem Laufenden."},
  awaiting_payment:{label:"Zahlung ausstehend",subject:"Wir warten noch auf deine Zahlung",heading:"Deine Bestellung ist reserviert.",lead:"Deine Bestellung wurde erfasst. Die Zahlung ist noch nicht bestätigt.",action:"Bitte prüfe die gewählte Zahlungsart. Bei Fragen sind wir für dich da."},
  paid:{label:"Zahlung bestätigt",subject:"Deine Zahlung ist eingegangen",heading:"Zahlung bestätigt.",lead:"Vielen Dank – wir haben deine Zahlung erhalten.",action:"Deine Ruby Hair Bestellung wird jetzt vorbereitet."},
  processing:{label:"Bestellung in Bearbeitung",subject:"Wir bereiten deine Bestellung vor",heading:"Mit Liebe vorbereitet.",lead:"Deine Bestellung wird sorgfältig für den Versand zusammengestellt.",action:"Sobald dein Paket verschickt wurde, erhältst du eine weitere Nachricht."},
  shipped:{label:"Bestellung versendet",subject:"Dein Ruby Hair Paket ist unterwegs",heading:"Dein Paket ist unterwegs.",lead:"Deine Bestellung wurde an unseren Versandpartner übergeben.",action:"Mit der Sendungsnummer kannst du die Zustellung verfolgen."},
  delivered:{label:"Bestellung zugestellt",subject:"Deine Ruby Hair Bestellung ist angekommen",heading:"Viel Freude mit deinem Ruby Hair.",lead:"Deine Bestellung wurde als zugestellt markiert.",action:"Wenn du Fragen zur Anwendung oder Pflege hast, helfen wir dir gerne."},
  cancelled:{label:"Bestellung storniert",subject:"Information zu deiner Stornierung",heading:"Deine Bestellung wurde storniert.",lead:"Wir haben die Stornierung deiner Bestellung vermerkt.",action:"Falls bereits eine Zahlung erfolgt ist, erhältst du Informationen zur Erstattung separat."},
  failed:{label:"Zahlung fehlgeschlagen",subject:"Deine Zahlung konnte nicht abgeschlossen werden",heading:"Die Zahlung hat nicht funktioniert.",lead:"Die Zahlung zu deiner Bestellung wurde nicht bestätigt.",action:"Kontaktiere uns gerne, bevor du eine neue Bestellung aufgibst."}
};
const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[ch]!);
const safeText=(s:string,max=150)=>s.replace(/[\r\n\x00-\x1f\x7f]/g," ").trim().slice(0,max);
const euro=(cents:number)=>new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(cents/100);
export function renderOrderMail(stage:OrderMailStage,data:OrderMailData){
  if(!orderMailStages.includes(stage))throw new Error("INVALID_MAIL_STAGE");
  const card=stages[stage];
  const number=safeText(data.orderNumber,70);
  if(!number)throw new Error("ORDER_NUMBER_REQUIRED");
  const person=safeText(data.customerName||"",80);
  const tracking=safeText(data.trackingNumber||"",100);
  const carrier=safeText(data.carrier||"DHL",60);
  const amount=Number.isSafeInteger(data.totalCents)&&data.totalCents!>=0?euro(data.totalCents!):null;
  const subject="Ruby Hair | "+card.subject+" #"+number;
  const plain=[person?"Hallo "+person+"!":"Hallo!",card.heading,card.lead,"Bestellnummer: "+number,
    amount?"Gesamtbetrag: "+amount:null,stage==="shipped"&&tracking?"Versand: "+carrier+" / "+tracking:null,
    card.action,"Kontakt: info@rubyhair.de","Ruby Hair Extensions"].filter(Boolean).join("\n\n");
  const row=(left:string,right:string)=>`<tr><td style="padding:10px 0;color:#80727a;font-size:13px">${escapeHtml(left)}</td><td style="padding:10px 0;text-align:right;color:#29222a;font-size:14px;font-weight:600;overflow-wrap:anywhere;word-break:break-word">${escapeHtml(right)}</td></tr>`;
  const extra=stage==="shipped"&&tracking?row("Versanddienst",carrier)+row("Sendungsnummer",tracking):"";
  const html=`<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(card.heading)}</title></head><body style="margin:0;padding:0;background:#f7f4f5;font-family:Arial,Helvetica,sans-serif;color:#29222a"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(card.lead)}</div><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f7f4f5"><tr><td align="center" style="padding:35px 15px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;table-layout:fixed;background:#fff;border:1px solid #e9dfe3"><tr><td style="padding:29px 36px;background:#282028;color:#fff"><img src="https://rubyhair.vercel.app/media/RubyHair-WebHeader-Logo-Hell-818376d91.png" alt="RUBY HAIR EXTENSIONS" width="220" style="display:block;width:220px;max-width:100%;height:auto;border:0;color:#fff;font-family:Arial,sans-serif;font-size:16px"/></td></tr><tr><td style="padding:42px 36px 34px"><div style="font-size:10px;letter-spacing:2px;font-weight:700;color:#a66f81;text-transform:uppercase">${escapeHtml(card.label)}</div><h1 style="font-family:Georgia,serif;font-weight:400;font-size:32px;line-height:1.2;margin:18px 0 17px;color:#30232c">${escapeHtml(card.heading)}</h1><p style="font-size:15px;line-height:1.8;color:#60545d;margin:0 0 20px">${person?"Hallo "+escapeHtml(person)+", ":"Hallo, "}${escapeHtml(card.lead)}</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="table-layout:fixed;width:100%;border-top:1px solid #eae2e6;border-bottom:1px solid #eae2e6;margin:28px 0">${row("Bestellnummer",number)}${amount?row("Gesamtbetrag",amount):""}${extra}</table><p style="font-size:14px;line-height:1.75;color:#60545d;margin:24px 0 0">${escapeHtml(card.action)}</p></td></tr><tr><td style="background:#f8f3f5;padding:25px 36px;text-align:center"><p style="color:#74646e;font-size:12px;line-height:1.8;margin:0">Fragen zur Bestellung? <a href="mailto:info@rubyhair.de" style="color:#7c465c">info@rubyhair.de</a></p><p style="font-size:10px;letter-spacing:2px;color:#9f8c95;margin:13px 0 0">RUBY HAIR · BEAUTY IN EVERY DETAIL</p></td></tr></table></td></tr></table></body></html>`;
  return {stage,label:card.label,subject,html,text:plain};
}
