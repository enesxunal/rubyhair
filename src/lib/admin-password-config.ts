/** Interpret copied bcrypt hash output without exposing or logging the value. */
export function normalizedAdminPasswordHash(raw:string|undefined):string|null{
 let value=(raw||"").trim();
 const exportPrefix="ADMIN_PASSWORD_HASH=";
 if(value.startsWith(exportPrefix))value=value.slice(exportPrefix.length).trim();
 if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))
  value=value.slice(1,-1).trim();
 // Enforce a complete bcrypt hash; never accept plaintext as a valid credential hash.
 return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value)?value:null;
}
