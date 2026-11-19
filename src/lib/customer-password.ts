import {randomBytes,scrypt as rawScrypt,timingSafeEqual} from "node:crypto";
import {validNewPassword} from "@/lib/customer-profile-validation";
const scrypt=(password:string,salt:string)=>new Promise<Buffer>((resolve,reject)=>rawScrypt(password,salt,keylen,{N:cost,r:8,p:1,maxmem:64*1024*1024},(error,result)=>error?reject(error):resolve(result)));
const cost=16384;
const keylen=64;
/** Passwords are not logged, never stored in plaintext and not returned to clients. */
export async function hashCustomerPassword(password:string){
 if(!validNewPassword(password))throw new Error("WEAK_PASSWORD");
 const salt=randomBytes(16).toString("hex");
 const hash=await scrypt(password,salt);
 return `scrypt$${cost}$${salt}$${hash.toString("hex")}`;
}
export async function verifyCustomerPassword(password:unknown,encoded:string|null|undefined){
 if(typeof password!=="string"||password.length>128||!encoded)return false;
 const parts=encoded.split("$");
 if(parts.length!==4||parts[0]!=="scrypt"||parts[1]!==String(cost)||!/^[a-f0-9]{32}$/.test(parts[2])||!/^[a-f0-9]{128}$/.test(parts[3]))return false;
 const expected=Buffer.from(parts[3],"hex");
 const candidate=await scrypt(password,parts[2]);
 return expected.length===candidate.length&&timingSafeEqual(expected,candidate);
}
