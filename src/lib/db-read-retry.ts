// Only use for side-effect-free reads, never order creation, payment capture, or stock writes.
const transientCodes=new Set(["P1001","P1002","P1008","P1017","P2024"]);
export function transientReadCode(error:unknown):string|null{
 const e=error as {code?:unknown;errorCode?:unknown};
 const code=typeof e?.code==="string"?e.code:typeof e?.errorCode==="string"?e.errorCode:"";
 return transientCodes.has(code)?code:null;
}
export async function retryReadOnly<T>(read:()=>Promise<T>,options:{now?:()=>number;sleep?:(ms:number)=>Promise<void>;report?:(code:string)=>void}={}):Promise<T>{
 const now=options.now??Date.now,sleep=options.sleep??(ms=>new Promise(resolve=>setTimeout(resolve,ms))),start=now();
 try{return await read()}catch(error){
  const code=transientReadCode(error);
  // Never amplify a long pool/connect timeout with another full wait.
  if(!code||now()-start>=2500)throw error;
  options.report?.(code);
  await sleep(150+Math.floor(Math.random()*150));
  return read();
 }
}
