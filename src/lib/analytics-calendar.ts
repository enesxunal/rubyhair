/** Date-only calendar key for Germany's Europe/Berlin timezone, DST safe. */
const formatter=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit"});
export function berlinISODate(now:Date=new Date()):string{
 const parts=formatter.formatToParts(now);
 const p=(k:string)=>parts.find(x=>x.type===k)?.value||"";
 return p("year")+"-"+p("month")+"-"+p("day");
}
export function berlinDateKey(now:Date=new Date()):Date{
 return new Date(berlinISODate(now)+"T00:00:00.000Z");
}
