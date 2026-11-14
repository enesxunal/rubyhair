import {ArrowUpRight,Instagram,Play} from "lucide-react";
import type {InstagramFeedPost} from "@/lib/instagram-feed";
import {influencerStories} from "@/data/influencer-stories";

const account="https://www.instagram.com/rubyhair.de/";

// Every fallback is a real @rubyhair.de post whose image is stored locally.
// The official account feed takes precedence whenever the Meta token is connected.
const editorialPositions=[0,3,2,5,7];
const editorialPosts=editorialPositions.map(index=>influencerStories[index]).filter(Boolean);

export default function InstagramHome({posts}:{posts:InstagramFeedPost[]}){
  const livePosts=posts.slice(0,5).map(post=>({key:post.id,src:"/api/instagram-thumbnail/"+post.id,href:post.permalink,
    alt:"Ruby Hair Instagram Beitrag",isVideo:post.isVideo}));
  const curatedPosts=editorialPosts.map(post=>({key:post.postUrl,src:post.image,href:post.postUrl,
    alt:post.name+" – Ruby Hair Instagram",isVideo:false}));
  // Fill the fixed five-tile composition even when the official API has fewer posts.
  const gallery=[...livePosts,...curatedPosts.filter(post=>!livePosts.some(live=>live.href===post.href))].slice(0,5);

  return <section className="rh-instagram-section" id="instagram" aria-labelledby="rh-instagram-title">
    <div className="container rh-instagram-inner">
      <div className="rh-instagram-head">
        <div>
          <span className="rh-instagram-kicker"><Instagram size={15} aria-hidden="true"/> AUS UNSEREM INSTAGRAM</span>
          <h2 id="rh-instagram-title">Hair moments. <i>Ruby Hair.</i></h2>
          <p>Echte Looks, besondere Nuancen und Inspiration aus unserem Studio.</p>
        </div>
        <a className="rh-instagram-follow" href={account} target="_blank" rel="noopener noreferrer">
          @rubyhair.de <ArrowUpRight size={17} aria-hidden="true"/>
        </a>
      </div>
      <div className="rh-instagram-editorial" aria-label="Ruby Hair Instagram Fotogalerie">
        {gallery.map((item,index)=><a key={item.key}
          className={"rh-instagram-photo"+(index===0?" rh-instagram-photo-featured":"")}
          href={item.href} target="_blank" rel="noopener noreferrer"
          aria-label={item.alt+" auf Instagram öffnen"}>
          <img src={item.src} alt={item.alt} loading="lazy" decoding="async"/>
          {item.isVideo&&<span className="rh-instagram-video"><Play size={17} fill="currentColor"/></span>}
          <span className="rh-instagram-photo-overlay"><Instagram size={18}/><span>BEITRAG ANSEHEN</span><ArrowUpRight size={17}/></span>
        </a>)}
      </div>
      <div className="rh-instagram-foot">
        <span>RUBY HAIR · ESSEN <span className="rh-instagram-foot-divider">/</span> INSTAGRAM EDITORIAL</span>
        <a href={account} target="_blank" rel="noopener noreferrer">MEHR AUF INSTAGRAM <ArrowUpRight size={16}/></a>
      </div>
    </div>
  </section>;
}
