import {ArrowUpRight,Grid3X3,Instagram,Play} from "lucide-react";
import type {InstagramFeedPost} from "@/lib/instagram-feed";
import {influencerStories} from "@/data/influencer-stories";

const account="https://www.instagram.com/rubyhair.de/";
const editorialPosts=influencerStories.slice(0,9);

/** Native profile-style Instagram web grid, using validated media. */
export default function InstagramHome({posts}:{posts:InstagramFeedPost[]}){
  const livePosts=posts.slice(0,9).map(post=>({key:post.id,src:"/api/instagram-thumbnail/"+post.id,href:post.permalink,
    alt:"Ruby Hair Instagram Beitrag",isVideo:post.isVideo}));
  const curatedPosts=editorialPosts.map(post=>({key:post.postUrl,src:post.image,href:post.postUrl,
    alt:post.name+" – Ruby Hair Instagram",isVideo:false}));
  const feed=[...livePosts,...curatedPosts.filter(post=>!livePosts.some(live=>live.href===post.href))].slice(0,9);

  return <section className="rh-instagram-section" id="instagram" aria-labelledby="rh-instagram-title">
    <div className="container rh-instagram-profile">
      <div className="rh-instagram-profile-head">
        <a href={account} target="_blank" rel="noopener noreferrer" className="rh-instagram-avatar-link" aria-label="Ruby Hair Instagram Profil öffnen">
          <img src="/assets/instagram-avatars/rubyhair-profile.webp" alt="Ruby Hair Instagram Profilbild" width={104} height={104}/>
        </a>
        <div className="rh-instagram-profile-data">
          <div className="rh-instagram-profile-line">
            <h2 id="rh-instagram-title">rubyhair.de</h2>
            <a className="rh-instagram-follow" href={account} target="_blank" rel="noopener noreferrer">Auf Instagram ansehen <ArrowUpRight size={16} aria-hidden="true"/></a>
          </div>
          <strong>Ruby Hair · Extensions</strong>
          <p>Premium Echthaar-Extensions · Essen<br/>Entdecke unsere Looks und aktuelle Haar-Inspirationen.</p>
        </div>
      </div>
      <div className="rh-instagram-profile-tabs"><span><Grid3X3 size={15} aria-hidden="true"/> BEITRÄGE</span></div>
      <div className="rh-instagram-feed-grid" aria-label="Ruby Hair Instagram Beiträge">
        {feed.map(item=><a key={item.key} href={item.href} target="_blank" rel="noopener noreferrer"
          className="rh-instagram-post" aria-label={item.alt+" auf Instagram öffnen"}>
          <img src={item.src} alt={item.alt} loading="lazy" decoding="async"/>
          {item.isVideo&&<span className="rh-instagram-video"><Play size={18} fill="currentColor"/></span>}
          <span className="rh-instagram-post-hover"><Instagram size={25} aria-hidden="true"/></span>
        </a>)}
      </div>
      <div className="rh-instagram-bottom">
        <a href={account} target="_blank" rel="noopener noreferrer">ALLE BEITRÄGE AUF INSTAGRAM <ArrowUpRight size={16}/></a>
      </div>
    </div>
  </section>;
}
