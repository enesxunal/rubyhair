import "server-only";
import {NextRequest,NextResponse} from "next/server";
import {isAdmin} from "@/lib/admin-auth";
import {CardQaError} from "@/lib/qa-card-one-euro";
export const qaHeaders={"Cache-Control":"no-store, private",Pragma:"no-cache","X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex, nofollow"};
export function qaError(error:unknown){
 const code=error instanceof CardQaError?error.code:503;
 const reason=error instanceof CardQaError?error.reason:"QA_TEMPORARILY_UNAVAILABLE";
 return NextResponse.json({error:reason},{status:code,headers:qaHeaders});
}
export async function qaAuthorized(req:NextRequest,post=false){
 if(!await isAdmin())return NextResponse.json({error:"ADMIN_REQUIRED"},{status:401,headers:qaHeaders});
 if(post){
  const origin=req.headers.get("origin");
  if(!origin||!["https://rubyhair.de","https://www.rubyhair.de"].includes(origin)||req.headers.get("sec-fetch-site")==="cross-site")
   return NextResponse.json({error:"ORIGIN_NOT_ALLOWED"},{status:403,headers:qaHeaders});
  if(Number(req.headers.get("content-length")||0)>2048)
   return NextResponse.json({error:"REQUEST_TOO_LARGE"},{status:413,headers:qaHeaders});
 }
 return null;
}
export async function qaRequestJson(req:NextRequest){
 const body=await req.text();
 if(body.length>2048)throw new CardQaError("REQUEST_TOO_LARGE",413);
 let data:unknown;
 try{data=JSON.parse(body)}catch{throw new CardQaError("INVALID_JSON",400)}
 if(!data||typeof data!=="object"||Array.isArray(data))throw new CardQaError("INVALID_REQUEST",400);
 return data as Record<string,unknown>;
}
