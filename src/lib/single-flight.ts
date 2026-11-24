/** Coalesce concurrent reads within one function instance; never retain completed or failed results. */
export function singleFlight<T>(read:()=>Promise<T>):()=>Promise<T>{
 let pending:Promise<T>|undefined;
 return ()=>{
  if(pending)return pending;
  pending=Promise.resolve().then(read).finally(()=>{pending=undefined;});
  return pending;
 };
}
