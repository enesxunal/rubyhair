/** Public SDK tokens are restricted to canonical shop pages. Older browsers
 * without Fetch Metadata may prove same origin through Origin or Referer. */
export function tokenRequestAllowed(headers:Headers,host:string){
 if(!["rubyhair.de","www.rubyhair.de"].includes(host))return false;
 const expected="https://"+host;
 const origin=headers.get("origin"),site=headers.get("sec-fetch-site"),referer=headers.get("referer");
 if(origin&&origin!==expected)return false;
 if(referer){try{if(new URL(referer).origin!==expected)return false}catch{return false}}
 if(site!==null)return site==="same-origin";
 return Boolean(origin===expected||referer);
}
