/** Small-value German 1-EUR internal paid-test invoice builder.
 * Seller identity was obtained from the legacy Ruby Hair Impressum; seller and
 * 19% tax rate MUST be confirmed via the merchant form before payment.
 * Live customer invoices require a separate legally approved invoice workflow.
 */
export const RUBY_TEST_SELLER={
 name:"Ruby Hair / Herr Nazmi Bulganlar",
 street:"Klara Strasse 19",
 postalCode:"45130",
 city:"Essen",
 country:"Deutschland",
 vatId:"DE356097157",
 email:"info@rubyhair.de"
} as const;
export const QA_INVOICE_TAX_RATE=19;
export const QA_INVOICE_GROSS_CENTS=100;
export const QA_INVOICE_TAX_CENTS=16; // 100 - round(100/1.19) = 16
export function qaInvoiceNumber(orderNumber:bigint,issuedAt:Date):string{
 const year=issuedAt.getUTCFullYear();
 if(year<2026||year>2100||orderNumber<=BigInt(0))throw new Error("INVALID_QA_INVOICE_NUMBER");
 return `RH-QA-${year}-${orderNumber.toString().padStart(7,"0")}`;
}
export type QaInvoiceData={invoiceNumber:string;issuedAt:Date;orderNumber:bigint;buyerName:string;buyerEmail:string;captureId:string;provider?:"paypal"|"klarna"};
const euro=(cents:number)=>`${(cents/100).toFixed(2).replace(".",",")} EUR`;

// Helvetica with standard WinAnsiEncoding. The database JSON retains original
// Unicode values; PDF encodes Latin-1/CP1252 text without HTML or PDF injection.
function hexText(text:string):string{
 const special:Record<string,number>={"€":0x80,"‘":0x91,"’":0x92,"“":0x93,"”":0x94,"–":0x96,"—":0x97,"…":0x85,"œ":0x9C,"Œ":0x8C,"Š":0x8A,"š":0x9A,"Ž":0x8E,"ž":0x9E,"Ÿ":0x9F,"™":0x99};
 let result="";
 for(const letter of text){
  const cp=letter.codePointAt(0)!;
  let value=special[letter];
  if(value===undefined)value=cp>=32&&cp<=255?cp:0x3f;
  if(value===0x7f)value=0x20;
  result+=value.toString(16).padStart(2,"0");
 }
 return `<${result.toUpperCase()}>`;
}

export function buildOneEuroInvoicePdf(data:QaInvoiceData):Buffer{
 if(!/^RH-QA-20\d{2}-\d{7,}$/.test(data.invoiceNumber)||!Number.isFinite(data.issuedAt.getTime())||
  !data.buyerName.trim()||data.buyerName.length>120||!/^\S+@\S+\.\S+$/.test(data.buyerEmail)||data.buyerEmail.length>254||
  !/^[A-Za-z0-9_-]{8,70}$/.test(data.captureId))throw new Error("INVALID_QA_INVOICE_DATA");
 const providerLabel=data.provider==="klarna"?"Klarna":"PayPal";
 const stamp=new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"Europe/Berlin"}).format(data.issuedAt);
 const draws:string[]=[];
 const write=(x:number,y:number,value:string,size=10,font="F1",r=0.16,g=0.13,b=0.16)=>{
  draws.push(`${r} ${g} ${b} rg BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm ${hexText(value)} Tj ET`);
 };
 draws.push("0.13 0.095 0.12 rg 0 752 595 90 re f");
 write(48,802,"RUBY HAIR",26,"F2",1,1,1);
 write(50,778,"EXTENSIONS   /   RECHNUNG",10,"F1",0.92,0.75,0.82);
 write(50,704,"RECHNUNG (INTERNE 1-EUR-TESTBESTELLUNG)",15,"F2");
 write(50,676,`Rechnungsnummer: ${data.invoiceNumber}`,10,"F2");
 write(50,655,`Rechnungsdatum: ${stamp}`);
 write(50,634,`Bestellnummer: ${data.orderNumber.toString()}`);
 write(50,604,"Rechnungsaussteller",11,"F2");
 write(50,586,RUBY_TEST_SELLER.name);
 write(50,570,RUBY_TEST_SELLER.street);
 write(50,554,`${RUBY_TEST_SELLER.postalCode} ${RUBY_TEST_SELLER.city}, ${RUBY_TEST_SELLER.country}`);
 write(50,538,`USt-IdNr.: ${RUBY_TEST_SELLER.vatId}`);
 write(50,509,"Kaeufer / Rechnungsempfaenger",11,"F2");
 write(50,491,data.buyerName.trim());
 write(50,475,data.buyerEmail.trim());
 draws.push("0.77 0.67 0.73 RG 0.7 w 50 435 m 545 435 l S");
 write(50,448,"Position",9,"F2");write(390,448,"Menge",9,"F2");write(477,448,"Betrag",9,"F2");
 write(50,407,"Interner "+providerLabel+"-Testkauf (keine Warenlieferung)",9);
 write(399,407,"1",9);write(468,407,euro(100),9,"F2");
 draws.push("0.77 0.67 0.73 RG 0.7 w 50 389 m 545 389 l S");
 write(352,369,"Netto (19% USt.):",10);write(470,369,euro(84),10);
 write(352,351,"Umsatzsteuer 19%:",10);write(470,351,euro(16),10);
 write(352,326,"Gesamtbetrag:",12,"F2");write(464,326,euro(100),12,"F2");
 write(50,273,"Zahlungsart: "+providerLabel+" (Live-Test)",10);
 write(50,256,"Zahlungseingang: durch "+providerLabel+" bestaetigt",10);
 write(50,239,providerLabel+"-Transaktion: "+data.captureId,9);
 draws.push("0.91 0.85 0.88 RG 0.6 w 50 188 m 545 188 l S");
 write(50,167,"Diese Rechnung dokumentiert eine echte Testzahlung von 1,00 EUR.",9);
 write(50,152,"Keine Warenlieferung. Einmaliger interner Funktionstest.",9);
 write(50,65,"Ruby Hair Extensions  |  info@rubyhair.de",9,"F1",0.44,0.35,0.41);
 const stream=Buffer.from(draws.join("\n")+"\n","ascii");
 const objects=[
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
 ];
 const chunks:Buffer[]=[Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n","latin1")];
 const offsets:number[]=[0];let bytes=chunks[0].length;
 const push=(chunk:Buffer)=>{chunks.push(chunk);bytes+=chunk.length};
 for(let i=1;i<=6;i++){
  offsets.push(bytes);
  const content=i===6?Buffer.concat([
   Buffer.from(`6 0 obj\n<< /Length ${stream.length} >>\nstream\n`),stream,Buffer.from("endstream\nendobj\n")
  ]):Buffer.from(`${i} 0 obj\n${objects[i-1]}\nendobj\n`);
  push(content);
 }
 const xrefOffset=bytes;
 push(Buffer.from(`xref\n0 7\n0000000000 65535 f \n${offsets.slice(1).map(o=>o.toString().padStart(10,"0")+" 00000 n ").join("\n")}\n`));
 push(Buffer.from(`trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`));
 return Buffer.concat(chunks);
}
