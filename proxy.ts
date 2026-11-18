import {NextRequest,NextResponse} from "next/server";
import {jwtVerify} from "jose";

const holdingHosts=new Set(["rubyhair.de","www.rubyhair.de"]);
const allowedAssets=new Set([
 "/media/RubyHair-WebHeader-Logo-Hell-818376d91.png",
 "/assets/hero-brunette.webp",
 "/favicon.ico"
]);
const adminLoginPaths=new Set(["/admin/login","/api/admin/login"]);
const ADMIN_COOKIE="rubyhair_admin";

/** Admin JWT uses the same signed, eight-hour token as src/lib/admin-auth.ts.
 * Only a verified session may bypass the Coming Soon wall on customer domains.
 * There is no query-param, special header or shared-password bypass.
 */
async function hasVerifiedAdminSession(request:NextRequest):Promise<boolean>{
 const token=request.cookies.get(ADMIN_COOKIE)?.value;
 const key=process.env.SESSION_SECRET;
 const email=process.env.ADMIN_EMAIL?.trim().toLowerCase();
 if(!token||!key||key.length<32||!email)return false;
 try{
  const {payload}=await jwtVerify(token,new TextEncoder().encode(key),{
   issuer:"rubyhair-next",audience:"rubyhair-admin",algorithms:["HS256"]
  });
  return payload.sub===email&&payload.role==="admin";
 }catch{return false}
}

function restrictedResponse(){
 return new NextResponse(JSON.stringify({error:"SHOP_TEMPORARILY_CLOSED",message:"Ruby Hair is being prepared."}),{
  status:503,headers:{"Content-Type":"application/json; charset=utf-8","Retry-After":"3600","Cache-Control":"private, no-store"}
 });
}
export async function proxy(request:NextRequest){
 const hostname=(request.headers.get("host")||"").trim().toLowerCase().split(":")[0].replace(/\.$/,"");
 if(!holdingHosts.has(hostname))return NextResponse.next();
 const path=request.nextUrl.pathname;
 if(allowedAssets.has(path)||path==="/coming-soon")return NextResponse.next();
 // The login form and its rate-limited POST must remain accessible before login.
 if(adminLoginPaths.has(path))return NextResponse.next();
 if(await hasVerifiedAdminSession(request)){
  const response=NextResponse.next();
  response.headers.set("Cache-Control","private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag","noindex, nofollow, noarchive");
  return response;
 }
 if(path==="/admin"||path.startsWith("/admin/")){
  return NextResponse.redirect(new URL("/admin/login",request.url),{status:307,headers:{"Cache-Control":"private, no-store"}});
 }
 if(request.method!=="GET"&&request.method!=="HEAD")return restrictedResponse();
 const response=NextResponse.rewrite(new URL("/coming-soon",request.url));
 response.headers.set("Cache-Control","private, no-store, max-age=0");
 response.headers.set("X-Robots-Tag","noindex, nofollow, noarchive");
 return response;
}
export const config={matcher:"/((?!_next/static|_next/image).*)"};
