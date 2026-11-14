/**
 * Ruby Hair's own Instagram feed, via the official Meta media API.
 *
 * Do not scrape Instagram public profile HTML. Its profile page does not
 * promise post data. Never put the access token into a browser bundle.
 *
 * Requires one of:
 * Instagram Login: RUBY_INSTAGRAM_ACCESS_TOKEN (graph.instagram.com/me/media)
 * Facebook Login: the same token plus RUBY_INSTAGRAM_USER_ID and
 *                 RUBY_INSTAGRAM_GRAPH_MODE=facebook.
 * The account must be Professional and grant the relevant read permission.
 */
export type InstagramFeedPost = {
  id:string;
  permalink:string;
  previewUrl:string;
  isVideo:boolean;
  timestamp:string;
};

type GraphItem={
  id?:unknown;
  permalink?:unknown;
  media_url?:unknown;
  thumbnail_url?:unknown;
  media_type?:unknown;
  timestamp?:unknown;
};

const instagramPostUrl=(raw:unknown):string|null=>{
  if(typeof raw!=="string")return null;
  try{
    const url=new URL(raw);
    if(url.protocol!=="https:"||!["www.instagram.com","instagram.com"].includes(url.hostname))return null;
    if(!/^\/(p|reel|tv)\/[A-Za-z0-9_-]+\/?$/.test(url.pathname))return null;
    return "https://www.instagram.com"+url.pathname.replace(/\/?$/,"/");
  }catch{return null;}
};

const instagramImageUrl=(raw:unknown):string|null=>{
  if(typeof raw!=="string")return null;
  try{
    const url=new URL(raw);
    if(url.protocol!=="https:")return null;
    const host=url.hostname.toLowerCase();
    if(!(host==="cdninstagram.com"||host.endsWith(".cdninstagram.com")
      ||host==="fbcdn.net"||host.endsWith(".fbcdn.net")))return null;
    return url.href;
  }catch{return null;}
};

export function normalizeRubyInstagramPosts(data:unknown):InstagramFeedPost[]{
  if(!Array.isArray(data))return [];
  const entries:InstagramFeedPost[]=[];
  for(const raw of data.slice(0,16)){
    if(!raw||typeof raw!=="object")continue;
    const p=raw as GraphItem;
    const permalink=instagramPostUrl(p.permalink);
    const isVideo=p.media_type==="VIDEO";
    const previewUrl=instagramImageUrl(isVideo?p.thumbnail_url:p.media_url);
    if(!permalink||!previewUrl||typeof p.id!=="string")continue;
    entries.push({
      id:p.id,
      permalink,
      previewUrl,
      isVideo,
      timestamp:typeof p.timestamp==="string"?p.timestamp:""
    });
    if(entries.length===4)break;
  }
  return entries;
}

export async function getRubyInstagramPosts():Promise<InstagramFeedPost[]>{
  const token=process.env.RUBY_INSTAGRAM_ACCESS_TOKEN?.trim();
  if(!token)return [];
  const facebookMode=process.env.RUBY_INSTAGRAM_GRAPH_MODE==="facebook";
  const userId=facebookMode?process.env.RUBY_INSTAGRAM_USER_ID?.trim():("me");
  if(!userId||!/^(\d+|me)$/.test(userId))return [];

  const url=new URL("https://"+(facebookMode?"graph.facebook.com":"graph.instagram.com")+"/v27.0/"+userId+"/media");
  url.searchParams.set("fields","id,media_type,media_url,thumbnail_url,permalink,timestamp");
  url.searchParams.set("limit","12");

  try{
    const response=await fetch(url,{
      headers:{Authorization:"Bearer "+token},
      next:{revalidate:3600},
      signal:AbortSignal.timeout(7000)
    });
    if(!response.ok)return [];
    const result=await response.json() as {data?:unknown};
    return normalizeRubyInstagramPosts(result.data);
  }catch{return [];}
}
