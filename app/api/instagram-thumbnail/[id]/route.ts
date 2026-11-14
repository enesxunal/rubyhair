import {NextResponse} from "next/server";
import {getRubyInstagramPosts} from "@/lib/instagram-feed";

const isInstagramImageHost=(hostname:string)=>{
  const host=hostname.toLowerCase();
  return host==="cdninstagram.com"||host.endsWith(".cdninstagram.com")
    ||host==="fbcdn.net"||host.endsWith(".fbcdn.net");
};

/**
 * Proxies only images from verified posts of the connected Ruby Hair account.
 * Visitors never contact Meta's CDN when viewing the gallery and never see
 * a private Graph API access token.
 */
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  if(!/^\d{1,30}$/.test(id))return new NextResponse(null,{status:404});

  const posts=await getRubyInstagramPosts();
  const post=posts.find(p=>p.id===id);
  if(!post)return new NextResponse(null,{status:404});

  let media:URL;
  try{media=new URL(post.previewUrl);}catch{return new NextResponse(null,{status:404});}
  if(media.protocol!=="https:"||!isInstagramImageHost(media.hostname))
    return new NextResponse(null,{status:404});

  try{
    const response=await fetch(media.href,{
      redirect:"error",
      signal:AbortSignal.timeout(6500),
      headers:{Accept:"image/avif,image/webp,image/jpeg,image/png"}
    });
    const type=(response.headers.get("content-type")||"").split(";")[0].trim().toLowerCase();
    const allowed=["image/jpeg","image/png","image/webp","image/avif"];
    const bytesReported=Number(response.headers.get("content-length"));
    if(!response.ok||!allowed.includes(type)||(bytesReported>5_000_000))
      return new NextResponse(null,{status:404});
    const buffer=await response.arrayBuffer();
    if(buffer.byteLength>5_000_000||!buffer.byteLength)return new NextResponse(null,{status:404});
    return new NextResponse(buffer,{
      status:200,
      headers:{
        "Content-Type":type,
        "X-Content-Type-Options":"nosniff",
        "Content-Disposition":"inline",
        "Cache-Control":"public, max-age=300, s-maxage=3600, stale-while-revalidate=3600"
      }
    });
  }catch{return new NextResponse(null,{status:404});}
}
