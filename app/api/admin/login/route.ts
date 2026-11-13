import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {
  adminConfigured,loginAllowed,recordLoginAttempt,
  checkAdminCredentials,issueAdminSession
} from "@/lib/admin-auth";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const schema=z.object({email:z.email().max(254),password:z.string().min(1).max(256)});
const NO_STORE={"Cache-Control":"no-store, private"};
function location(request:NextRequest,path:string){
  return NextResponse.redirect(new URL(path,request.url),{status:303,headers:NO_STORE});
}

export async function POST(request:NextRequest){
  // Login is an ordinary HTML POST with a full-page redirect: it works
  // even when client JS/hydration fails. Never include credentials in a URL.
  const origin=request.headers.get("origin");
  if(!origin){
    return NextResponse.json({error:"origin_required"},{status:403,headers:NO_STORE});
  }
  try{
    if(new URL(origin).origin!==new URL(request.url).origin){
      return NextResponse.json({error:"origin_mismatch"},{status:403,headers:NO_STORE});
    }
  }catch{
    return NextResponse.json({error:"invalid_origin"},{status:403,headers:NO_STORE});
  }
  if(!adminConfigured())return location(request,"/admin/login?error=unavailable");
  try{
    const form=await request.formData();
    const result=schema.safeParse({email:form.get("email"),password:form.get("password")});
    if(!result.success)return location(request,"/admin/login?error=invalid");
    const {key,allowed,reset}=await loginAllowed();
    if(!allowed)return location(request,"/admin/login?error=locked");
    const {email,password}=result.data;
    if(!await checkAdminCredentials(email,password)){
      await recordLoginAttempt(key,reset);
      return location(request,"/admin/login?error=invalid");
    }
    await issueAdminSession();
    return location(request,"/admin");
  }catch(error){
    // Do not log credentials, IP addresses, hashes, request data or error detail.
    console.error("RUBY_ADMIN_LOGIN_UNAVAILABLE",{
      category:error instanceof Error?"server_error":"unexpected"
    });
    return location(request,"/admin/login?error=unavailable");
  }
}
