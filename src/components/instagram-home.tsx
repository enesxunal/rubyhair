import {ArrowUpRight,Instagram,Play,ShieldCheck} from "lucide-react";
import type {InstagramFeedPost} from "@/lib/instagram-feed";

const account="https://www.instagram.com/rubyhair.de/";

export default function InstagramHome({posts}:{posts:InstagramFeedPost[]}){
  const connected=posts.length>0;

  return <section className="rh-instagram-section" id="instagram" aria-labelledby="rh-instagram-title">
    <div className="container">
      <div className="rh-instagram-head">
        <div>
          <span className="rh-instagram-kicker"><Instagram size={16} aria-hidden="true"/> FOLLOW THE RUBY HAIR FEELING</span>
          <h2 id="rh-instagram-title">Ruby Hair <i>on Instagram.</i></h2>
          <p>Hair Inspiration, Studio-Momente und neue Looks – entdecke unsere Welt auf Instagram.</p>
        </div>
        <a className="rh-instagram-follow" href={account} target="_blank" rel="noopener noreferrer">
          @rubyhair.de <ArrowUpRight size={17} aria-hidden="true"/>
        </a>
      </div>

      {connected?
        <div className="rh-instagram-grid">
          {posts.map(post=>
            <a key={post.id} className="rh-instagram-tile" href={post.permalink} target="_blank"
              rel="noopener noreferrer" aria-label={"Ruby Hair Instagram Beitrag ansehen"+(post.isVideo?" (Video)":"")}>
              <img src={"/api/instagram-thumbnail/"+post.id}
                alt={"Instagram-Beitrag von Ruby Hair"} loading="lazy" decoding="async"/>
              {post.isVideo&&<span className="rh-instagram-media-type"><Play size={18} fill="currentColor"/></span>}
              <span className="rh-instagram-tile-open"><Instagram size={19}/></span>
            </a>
          )}
        </div>:
        <div className="rh-instagram-unconnected">
          <div className="rh-instagram-unconnected-symbol"><Instagram size={39} strokeWidth={1.35}/></div>
          <div>
            <strong>Mehr Looks. Mehr Ruby Hair.</strong>
            <p>Entdecke unsere aktuellen Beiträge, Inspirationen und Reels direkt auf Instagram.</p>
          </div>
          <a href={account} target="_blank" rel="noopener noreferrer">
            ZU @RUBYHAIR.DE <ArrowUpRight size={16} aria-hidden="true"/>
          </a>
        </div>
      }
      {connected&&<div className="rh-instagram-bottom">
        <span><ShieldCheck size={15}/> Aktuelle Beiträge von @rubyhair.de</span>
        <a href={account} target="_blank" rel="noopener noreferrer">
          ALLE BEITRÄGE ANSEHEN <ArrowUpRight size={16} aria-hidden="true"/>
        </a>
      </div>}
    </div>
  </section>;
}
