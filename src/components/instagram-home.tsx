"use client";

import {useState} from "react";
import {ArrowUpRight,Instagram,Play,ShieldCheck} from "lucide-react";
import type {InstagramFeedPost} from "@/lib/instagram-feed";

const account="https://www.instagram.com/rubyhair.de/";

// Local editorial photography, deliberately NOT labelled as Instagram posts.
// Switched to authentic media as soon as the authorized Meta feed is connected.
const inspiration=[
  {image:"/assets/hero-brunette.webp",alt:"Ruby Hair Editorial mit langen braunen Haaren"},
  {image:"/assets/ruby-hair-platinum-atelier.webp",alt:"Platinblonde Tape-in Extensions auf weißen Säulen"},
  {image:"/assets/story-blonde.webp",alt:"Ruby Hair Editorial mit champagnerblondem Haar"},
  {image:"/assets/ruby-hair-platinum-detail.webp",alt:"Platinblonde Tape-in Strähnen, Produktdetail"}
];

export default function InstagramHome({posts}:{posts:InstagramFeedPost[]}){
  const [showExternalMedia,setShowExternalMedia]=useState(false);
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

      {connected&&!showExternalMedia?
        <div className="rh-instagram-optin">
          <span className="rh-instagram-optin-mark"><Instagram size={34} strokeWidth={1.35}/></span>
          <div>
            <strong>Die neuesten Ruby Hair Beiträge ansehen</strong>
            <p>Zum Anzeigen der Bilder werden Inhalte vom Instagram-CDN (Meta) geladen. Dabei kann deine IP-Adresse an Meta übermittelt werden.</p>
          </div>
          <button type="button" onClick={()=>setShowExternalMedia(true)}>Beiträge anzeigen <ArrowUpRight size={16}/></button>
        </div>:
        <div className="rh-instagram-grid">
          {connected?posts.map(post=>
            <a key={post.id} className="rh-instagram-tile" href={post.permalink} target="_blank"
              rel="noopener noreferrer" aria-label={"Ruby Hair Instagram Beitrag ansehen"+(post.isVideo?" (Video)":"")}>
              <img src={post.previewUrl} alt={"Ruby Hair Instagram Beitrag"} loading="lazy"
                referrerPolicy="no-referrer"/>
              {post.isVideo&&<span className="rh-instagram-media-type"><Play size={18} fill="currentColor"/></span>}
              <span className="rh-instagram-tile-open"><Instagram size={19}/></span>
            </a>
          ):inspiration.map(item=>
            <a key={item.image} className="rh-instagram-tile" href={account} target="_blank"
              rel="noopener noreferrer" aria-label="Ruby Hair Instagram Profil ansehen">
              <img src={item.image} alt={item.alt} loading="lazy" decoding="async"/>
              <span className="rh-instagram-tile-open"><Instagram size={19}/></span>
            </a>
          )}
        </div>
      }
      <div className="rh-instagram-bottom">
        <span>{connected?
          <><ShieldCheck size={15}/> Original-Posts von @rubyhair.de</>:
          "Ruby Hair Editorial · weitere Looks auf Instagram entdecken"}
        </span>
        <a href={account} target="_blank" rel="noopener noreferrer">
          INSTAGRAM BESUCHEN <ArrowUpRight size={16} aria-hidden="true"/>
        </a>
      </div>
    </div>
  </section>;
}
