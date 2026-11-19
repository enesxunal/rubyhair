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
// An explicit production merchant approval is required in addition to the deploy.
// Branch previews and local builds never become a public storefront by accident.
const storefrontPublic=()=>process.env.VERCEL_ENV==="production" &&
  process.env.RUBY_SHOP_PUBLIC==="APPROVED_PRODUCTION" &&
  process.env.RUBY_CANONICAL_SITE_URL==="https://rubyhair.de";
// Only known public endpoints may be accessed without an administrator session.
const publicGetApis=new Set(["/api/catalog","/api/tryon/generate"]);
const publicPostApis=new Set(["/api/cart/quote","/api/analytics/event","/api/tryon/generate","/api/checkout","/api/widerruf","/api/konto/login","/api/konto/verify","/api/konto/password","/api/konto/profile","/api/konto/adressen","/api/konto/logout","/api/gutschein/kaufen","/api/gutschein/guthaben"]);

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
 // Only these two automated endpoints may cross the public API gate.
 // Their own handlers enforce CRON_SECRET or PayPal signature verification.
 if((path==="/api/internal/customer-jobs"||path==="/api/internal/customer-account-cleanup"||path==="/api/internal/gift-card-jobs")&&(request.method==="GET"||request.method==="HEAD")){
  const r=NextResponse.next();r.headers.set("Cache-Control","private, no-store");return r;
 }
 if(path==="/api/payments/paypal/webhook"&&request.method==="POST"){
  const r=NextResponse.next();r.headers.set("Cache-Control","private, no-store");return r;
 }
 // Public read-only PayPal return landing: GET carries no authority and
 // never captures money. User clicks through to the protected admin UI.
 if(path==="/qa/klarna/return"&&(request.method==="GET"||request.method==="HEAD")){
  const response=NextResponse.next();
  response.headers.set("Cache-Control","private, no-store");
  response.headers.set("X-Robots-Tag","noindex, nofollow");
  return response;
 }
 if(path==="/qa/paypal/return"&&(request.method==="GET"||request.method==="HEAD")){
  const response=NextResponse.next();
  response.headers.set("Cache-Control","private, no-store");
  response.headers.set("X-Robots-Tag","noindex, nofollow");
  return response;
 }
 if(await hasVerifiedAdminSession(request)){
  const response=NextResponse.next();
  response.headers.set("Cache-Control","private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag","noindex, nofollow, noarchive");
  return response;
 }
 if(path==="/admin"||path.startsWith("/admin/")){
  return NextResponse.redirect(new URL("/admin/login",request.url),{status:307,headers:{"Cache-Control":"private, no-store"}});
 }
 if(path.startsWith("/api/admin/")||path.startsWith("/qa/"))return restrictedResponse();
 if(storefrontPublic()){
  if(path.startsWith("/api/")){
   const isGet=request.method==="GET"||request.method==="HEAD";
   const permitted=isGet?((publicGetApis.has(path)||path==="/api/konto/adressen"||/^\/api\/gutschein\/bild\/[0-9a-f-]{36}$/i.test(path))||/^\/api\/konto\/rechnung\/[a-f0-9-]{36}$/i.test(path)||path.startsWith("/api/instagram-thumbnail/")):
    (request.method==="POST"&&publicPostApis.has(path))||
    (request.method==="PUT"&&path==="/api/konto/profile")||
    ((request.method==="PATCH"||request.method==="DELETE")&&path==="/api/konto/adressen");
   if(!permitted)return restrictedResponse();
   return NextResponse.next();
  }
  if(request.method!=="GET"&&request.method!=="HEAD")return restrictedResponse();
  // Public customer pages and checkout are guarded by the explicit payment mode.
  return NextResponse.next();
 }
 if(request.method!=="GET"&&request.method!=="HEAD")return restrictedResponse();
 const response=NextResponse.rewrite(new URL("/coming-soon",request.url));
 response.headers.set("Cache-Control","private, no-store, max-age=0");
 response.headers.set("X-Robots-Tag","noindex, nofollow, noarchive");
 return response;
}
export const config={matcher:"/((?!_next/static|_next/image).*)"};
