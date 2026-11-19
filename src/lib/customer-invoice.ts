import {RUBY_TEST_SELLER} from "./qa-invoice";

export type CustomerInvoiceLine={description:string;quantity:number;unitCents:number;totalCents:number};
export type CustomerInvoiceInfo={invoiceNumber:string;orderNumber:string;issuedAt:Date;customerName:string;customerEmail:string;billingStreet:string;billingPostalCode:string;billingCity:string;paymentMethod:"paypal"|"klarna"|"gutschein";paymentReference:string;giftAppliedCents?:number;giftSoldCents?:number;lines:CustomerInvoiceLine[];subtotalCents:number;shippingCents:number;taxCents:number;totalCents:number};
const money=(value:number)=>`${(value/100).toFixed(2).replace(".",",")} EUR`;
// WinAnsi-safe, using only standard PDF built-in fonts. The actual original name/address
// always remains UTF-8 in the database even if a glyph cannot be printed by Helvetica.
function hexText(text:string){
 const special:Record<string,number>={"€":128,"‘":145,"’":146,"“":147,"”":148,"–":150,"—":151,"…":133};
 return "<"+Array.from(text).map(c=>{
  const p=c.codePointAt(0)!;
  const n=special[c]??(p>=32&&p<=255?p:63);
  return n.toString(16).padStart(2,"0");
 }).join("").toUpperCase()+">";
}
function safe(t:string,max=150){return t.replace(/[\r\n\x00-\x1f\x7f]/g," ").trim().slice(0,max)}
export function createCustomerInvoicePdf(data:CustomerInvoiceInfo):Buffer{
 if(!/^RH-20\d{2}-\d{7,}$/.test(data.invoiceNumber)||!Number.isFinite(data.issuedAt.getTime())||
  data.lines.length<1||data.lines.length>30||!data.customerName.trim()||!data.customerEmail.includes("@"))throw new Error("INVALID_CUSTOMER_INVOICE_DATA");
 if(![data.subtotalCents,data.shippingCents,data.taxCents,data.totalCents].every(v=>Number.isInteger(v)&&v>=0)||
  data.subtotalCents+data.shippingCents!==data.totalCents||
  Math.round(data.totalCents*19/119)!==data.taxCents||
  data.lines.reduce((s,l)=>s+l.totalCents,0)!==data.subtotalCents||
  data.lines.some(l=>l.quantity<1||!Number.isInteger(l.quantity)||l.totalCents!==l.quantity*l.unitCents))throw new Error("INVALID_CUSTOMER_INVOICE_TOTAL");
 const date=new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"Europe/Berlin"}).format(data.issuedAt);
 const pages:string[][]=[];let page:string[]=[];
 const draw=(x:number,y:number,s:string,size=10,bold=false)=>page.push(`BT /F${bold?2:1} ${size} Tf 1 0 0 1 ${x} ${y} Tm ${hexText(safe(s,120))} Tj ET`);
 const begin=(index:number)=>{
  page=[];pages.push(page);
  page.push("0.13 0.095 0.12 rg 0 751 595 91 re f");
  page.push("1 1 1 rg");draw(45,793,"RUBY HAIR EXTENSIONS",21,true);draw(45,771,"RECHNUNG",11);
  page.push("0.18 0.13 0.18 rg");
  draw(45,716,`Rechnungsnummer: ${data.invoiceNumber}`,12,true);
  draw(45,696,`Rechnungsdatum: ${date}    Bestellung: ${safe(data.orderNumber,24)}`);
  if(index===0){
   draw(45,659,"Rechnungsaussteller",11,true);
   draw(45,640,RUBY_TEST_SELLER.name);
   draw(45,624,RUBY_TEST_SELLER.street);
   draw(45,608,`${RUBY_TEST_SELLER.postalCode} ${RUBY_TEST_SELLER.city} / Deutschland`);
   draw(45,592,`USt-IdNr.: ${RUBY_TEST_SELLER.vatId}`);
   draw(330,659,"Rechnungsempfaenger",11,true);
   draw(330,640,data.customerName,10);
   draw(330,624,data.billingStreet,10);
   draw(330,608,`${data.billingPostalCode} ${data.billingCity}`,10);
   draw(330,592,data.customerEmail,9);
  }
  draw(45,564,"Artikel",10,true);draw(350,564,"Menge",10,true);draw(475,564,"Betrag",10,true);
  page.push("0.70 0.59 0.65 RG 0.6 w 45 551 m 550 551 l S");
 };
 let y=532;begin(0);
 for(const line of data.lines){
  if(y<170){begin(pages.length);y=532;}
  draw(45,y,line.description,9);draw(362,y,String(line.quantity),9);draw(475,y,money(line.totalCents),9);
  y-=24;
 }
 if(y<190){begin(pages.length);y=532;}
 page.push(`0.70 0.59 0.65 RG 0.6 w 45 ${y} m 550 ${y} l S`);
 y-=23;
 draw(332,y,"Artikelwert:",10);draw(475,y,money(data.subtotalCents),10);y-=19;
 draw(332,y,"Versand DHL:",10);draw(475,y,money(data.shippingCents),10);y-=19;
 draw(332,y,"Enthaltene 19% USt.:",10);draw(475,y,money(data.taxCents),10);y-=25;
 draw(332,y,"Gesamtbetrag:",12,true);draw(469,y,money(data.totalCents),12,true);
 y-=35;
 draw(45,y,`Bezahlt mit ${data.paymentMethod==="paypal"?"PayPal":data.paymentMethod==="klarna"?"Klarna":"Geschenkgutschein"} - Zahlung bestaetigt`,10);
 if(data.giftAppliedCents){y-=17;draw(45,y,`Per Gutschein bezahlt: ${money(data.giftAppliedCents)} / Restzahlung: ${money(data.totalCents-data.giftAppliedCents)}`,9)}
 y-=18;draw(45,y,`Zahlungsreferenz: ${safe(data.paymentReference,63)}`,9);
 for(const [i,items] of pages.entries()){
  const previous=page;page=items;
  draw(45,42,`Ruby Hair Extensions | ${RUBY_TEST_SELLER.email}`,8);
  draw(481,42,`Seite ${i+1}/${pages.length}`,8);
  page=previous;
 }
 const objects:string[]=[];
 objects.push("<< /Type /Catalog /Pages 2 0 R >>");
 objects.push(`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_,i)=>`${5+i*2} 0 R`).join(" ")}] >>`);
 objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
 objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
 for(const [i,items] of pages.entries()){
  const pageNum=5+i*2,streamNum=pageNum+1;
  const content=Buffer.from(items.join("\n")+"\n","ascii");
  objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamNum} 0 R >>`);
  objects.push(`<< /Length ${content.length} >>\nstream\n${content.toString("ascii")}endstream`);
 }
 let output="%PDF-1.4\n";const offsets=[0];
 for(const [i,o] of objects.entries()){offsets.push(Buffer.byteLength(output,"latin1"));output+=`${i+1} 0 obj\n${o}\nendobj\n`;}
 const xref=Buffer.byteLength(output,"latin1");
 output+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(v=>`${String(v).padStart(10,"0")} 00000 n \n`).join("");
 output+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
 return Buffer.from(output,"latin1");
}
