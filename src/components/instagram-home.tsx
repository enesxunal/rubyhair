"use client";

import {useEffect,useState} from "react";
import {ArrowUpRight,Instagram,Play,ShieldCheck} from "lucide-react";
import type {InstagramFeedPost} from "@/lib/instagram-feed";

const account="https://www.instagram.com/rubyhair.de/";
const profileEmbed="https://www.instagram.com/rubyhair.de/embed/";
const consentKey="ruby_instagram_embed_consent_v1";

export default function InstagramHome({posts}:{posts:InstagramFeedPost[]}){
  const connected=posts.length>0;
  const [showProfileEmbed,setShowProfileEmbed]=useState(false);

  useEffect(()=>{
    try{setShowProfileEmbed(window.localStorage.getItem(consentKey)==="allow");}
    catch{/* Storage disabled: request consent again on each visit. */}
  },[]);

  const authorizeEmbed=()=>{
    try{window.localStorage.setItem(consentKey,"allow");}catch{/* Session-only consent. */}
    setShowProfileEmbed(true);
  };
  const hideExternalEmbed=()=>{
    try{window.localStorage.removeItem(consentKey);}catch{/* Session-only consent. */}
    setShowProfileEmbed(false);
  };

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
                alt="Instagram-Beitrag aus dem Ruby Hair Profil" loading="lazy" decoding="async"/>
              {post.isVideo&&<span className="rh-instagram-media-type"><Play size={18} fill="currentColor"/></span>}
              <span className="rh-instagram-tile-open"><Instagram size={19}/></span>
            </a>
          )}
        </div>:
        showProfileEmbed?
          <div className="rh-instagram-native">
            <iframe src={profileEmbed}
              title="Aktuelle öffentliche Instagram-Beiträge von @rubyhair.de"
              loading="lazy"
              referrerPolicy="no-referrer"
              allow="fullscreen"
            />
          </div>:
          <div className="rh-instagram-unconnected">
            <div className="rh-instagram-unconnected-symbol"><Instagram size={39} strokeWidth={1.35}/></div>
            <div>
              <strong>Echte Beiträge direkt von Instagram.</strong>
              <p>Wir zeigen das öffentliche Ruby Hair Profil mit den neuesten Beiträgen. Beim Anzeigen lädt Instagram (Meta) externe Inhalte und kann Cookies setzen sowie deine IP-Adresse erhalten.</p>
            </div>
            <button type="button" onClick={authorizeEmbed}>
              BEITRÄGE ANZEIGEN <ArrowUpRight size={16} aria-hidden="true"/>
            </button>
          </div>
      }
      <div className="rh-instagram-bottom">
        <span>{connected?
          <><ShieldCheck size={15}/> Aktuelle Beiträge von @rubyhair.de</>:
          <><ShieldCheck size={15}/> Originales Instagram-Profil · automatisch von Instagram aktualisiert</>}
        </span>
        <div className="rh-instagram-bottom-actions">
          {!connected&&showProfileEmbed&&
            <button type="button" onClick={hideExternalEmbed}>Externe Inhalte ausblenden</button>}
          <a href={account} target="_blank" rel="noopener noreferrer">
            INSTAGRAM BESUCHEN <ArrowUpRight size={16} aria-hidden="true"/>
          </a>
        </div>
      </div>
    </div>
  </section>;
}
