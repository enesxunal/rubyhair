import {NextRequest,NextResponse} from "next/server";

const holdingHosts=new Set(["rubyhair.de","www.rubyhair.de"]);
const allowedAssets=new Set([
 "/media/RubyHair-WebHeader-Logo-Hell-818376d91.png",
 "/assets/hero-brunette.webp",
 "/favicon.ico"
]);

/** Host-locked maintenance gate for the public domain. The separate Vercel
 * preview remains available for authorized tests, but payments remain off.
 * Never allow query-string or cookie bypass on the public domain.
 */
export function proxy(request:NextRequest){
 const hostname=(request.headers.get("host")||"").trim().toLowerCase().split(":")[0].replace(/\.$/,"");
 if(!holdingHosts.has(hostname))return NextResponse.next();
 const path=request.nextUrl.pathname;
 if(allowedAssets.has(path)||path==="/coming-soon")return NextResponse.next();
 if(request.method!=="GET"&&request.method!=="HEAD"){
  return new NextResponse(JSON.stringify({error:"SHOP_TEMPORARILY_CLOSED",message:"Ruby Hair is being prepared."}),{
   status:503,headers:{"Content-Type":"application/json; charset=utf-8","Retry-After":"3600","Cache-Control":"no-store"}
  });
 }
 return NextResponse.rewrite(new URL("/coming-soon",request.url),{headers:{"Cache-Control":"no-store"}});
}
export const config={matcher:"/((?!_next/static|_next/image).*)"};
