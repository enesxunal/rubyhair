import {createHash,createHmac,createCipheriv,createDecipheriv,randomBytes,timingSafeEqual} from "node:crypto";
import {z} from "zod";

const allowed=z.string().trim().min(2).max(80).refine(v=>!/[<>\r\n\x00-\x1f]/.test(v));
const note=z.string().trim().max(180).refine(v=>!/[<>\x00-\x1f]/.test(v));
export const giftInput=z.object({
 key:z.string().uuid(),amountCents:z.number().int().min(1000).max(50000),
 buyerEmail:z.email().max(254),recipientEmail:z.email().max(254).optional(),
 recipientName:allowed,senderName:allowed.optional(),message:note.optional(),
 theme:z.enum(["classic","soft","black"]),delivery:z.enum(["download","email"]),
 provider:z.literal("paypal")
}).strict().superRefine((v,ctx)=>{
 if(v.delivery==="email"&&!v.recipientEmail)ctx.addIssue({code:"custom",path:["recipientEmail"],message:"Recipient email required"});
});
export type GiftInput=z.infer<typeof giftInput>;
export {euroGift} from "./public";
export const digestGift=(input:GiftInput)=>createHash("sha256").update(JSON.stringify({...input,key:undefined,buyerEmail:input.buyerEmail.trim().toLowerCase(),recipientEmail:input.recipientEmail?.trim().toLowerCase()})).digest("hex");
const secret=()=>{const v=process.env.SESSION_SECRET;if(!v||v.length<32)throw new Error("GIFT_SECRET_NOT_CONFIGURED");return v};
const keyMaterial=()=>createHash("sha256").update("rubyhair-gift-code-v1:"+secret()).digest();
export function generateGiftCode(){
 const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
 const bytes=randomBytes(20);
 const groups=[];
 for(let start=0;start<20;start+=4)groups.push(Array.from(bytes.subarray(start,start+4),v=>alphabet[v%alphabet.length]).join(""));
 return "RH-"+groups.join("-");
}
export const normalizedGiftCode=(raw:string)=>raw.trim().toUpperCase().replace(/[^A-Z0-9]/g,"");
export const giftCodeHash=(code:string)=>createHash("sha256").update("rubyhair-gift-v1:"+normalizedGiftCode(code)).digest("hex");
export function encryptGiftCode(code:string){
 const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",keyMaterial(),iv);
 cipher.setAAD(Buffer.from("rubyhair-gift-card-v1"));
 const encrypted=Buffer.concat([cipher.update(code,"utf8"),cipher.final()]);
 return {codeCiphertext:encrypted.toString("base64url"),codeIv:iv.toString("base64url"),codeTag:cipher.getAuthTag().toString("base64url")};
}
export function decryptGiftCode(data:{codeCiphertext:string;codeIv:string;codeTag:string}){
 const decipher=createDecipheriv("aes-256-gcm",keyMaterial(),Buffer.from(data.codeIv,"base64url"));
 decipher.setAAD(Buffer.from("rubyhair-gift-card-v1"));
 decipher.setAuthTag(Buffer.from(data.codeTag,"base64url"));
 return Buffer.concat([decipher.update(Buffer.from(data.codeCiphertext,"base64url")),decipher.final()]).toString("utf8");
}
const sign=(id:string,scope:string)=>createHmac("sha256",secret()).update("rubyhair-gift:"+scope+":"+id).digest("hex");
export const giftCheckoutSignature=(id:string)=>sign(id,"pay-return");
export const giftViewSignature=(id:string)=>sign(id,"view-v1");
export function verifyGiftSignature(id:string,value:string,scope:"pay-return"|"view-v1"){
 if(!/^[\da-f]{64}$/.test(value))return false;
 return timingSafeEqual(Buffer.from(sign(id,scope),"hex"),Buffer.from(value,"hex"));
}
export const giftViewUrl=(id:string)=>`https://rubyhair.de/geschenkgutschein/karte/${id}?sign=${giftViewSignature(id)}`;
export const giftCodeLooksValid=(x:string)=>/^RH-[A-Z2-9]{4}(?:-[A-Z2-9]{4}){4}$/.test(x.trim().toUpperCase());
export const escapeGiftXml=(x:string)=>x.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&apos;"}[c]!));
