/** Browser-safe voucher display helpers. Never import server cryptography here. */
export const euroGift=(cents:number)=>new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(cents/100);
