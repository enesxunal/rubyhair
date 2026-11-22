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

/** UTC instant for midnight of the requested Berlin calendar date, with DST transitions. */
export function berlinMidnightUTC(dayISO:string):Date{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(dayISO)||!Number.isFinite(Date.parse(dayISO+"T00:00:00Z")))
  throw new RangeError("Invalid Berlin calendar date");
 const nominal=Date.parse(dayISO+"T00:00:00.000Z");
 if(new Date(nominal).toISOString().slice(0,10)!==dayISO)throw new RangeError("Invalid calendar date");
 // Offset before the local 02:00-03:00 DST change must be used for midnight.
 const probe=new Date(nominal-6*3600000);
 const offsetName=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Berlin",timeZoneName:"shortOffset"})
   .formatToParts(probe).find(p=>p.type==="timeZoneName")?.value||"GMT+1";
 const match=/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(offsetName);
 if(!match)throw new RangeError("Unknown timezone offset");
 const minutes=(match[1]==="+"?1:-1)*(Number(match[2])*60+Number(match[3]||0));
 return new Date(nominal-minutes*60000);
}
