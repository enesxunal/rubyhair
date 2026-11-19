export type CustomerAddressInput={label:string;firstName:string;lastName:string;street:string;postalCode:string;city:string;country:"DE"};
export const normalizeHumanName=(value:unknown):string=>typeof value==="string"?value.normalize("NFC").trim().replace(/\s+/g," "):"";
export const validHumanName=(name:string)=>name.length>=2&&name.length<=80&&!/[<>\x00-\x1f\x7f]/.test(name);
export const validNewPassword=(value:unknown):value is string=>typeof value==="string"&&value.length>=10&&value.length<=128&&/[A-Za-z\p{L}]/u.test(value)&&/[0-9]/.test(value)&&!/\x00|\r|\n/.test(value);
export function parseCustomerNames(value:unknown){
 if(!value||typeof value!=="object")return null;
 const obj=value as Record<string,unknown>;
 const firstName=normalizeHumanName(obj.firstName),lastName=normalizeHumanName(obj.lastName);
 return validHumanName(firstName)&&validHumanName(lastName)?{firstName,lastName}:null;
}
export function parseCustomerAddress(value:unknown):CustomerAddressInput|null{
 if(!value||typeof value!=="object")return null;
 const obj=value as Record<string,unknown>;
 const names=parseCustomerNames(obj);
 const street=normalizeHumanName(obj.street),city=normalizeHumanName(obj.city);
 const label=normalizeHumanName(obj.label)||"Zuhause";
 const postalCode=typeof obj.postalCode==="string"?obj.postalCode.trim():"";
 if(!names||label.length>40||/[<>\x00-\x1f\x7f]/.test(label)||street.length<4||street.length>160||/[<>\x00-\x1f\x7f]/.test(street)||city.length<2||city.length>100||/[<>\x00-\x1f\x7f]/.test(city)||!/^[0-9]{5}$/.test(postalCode)||obj.country!=="DE")return null;
 return {label,...names,street,postalCode,city,country:"DE"};
}
