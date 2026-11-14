"use client";
import {useEffect,useState} from "react";
import {Instagram,X,ArrowUpRight} from "lucide-react";
import {influencerStories} from "@/data/influencer-stories";

export default function InfluencerStories(){
  const [active,setActive]=useState<number|null>(null);
  useEffect(()=>{
    if(active===null)return;
    const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setActive(null);};
    document.addEventListener("keydown",close);
    return ()=>document.removeEventListener("keydown",close);
  },[active]);
  // Use only real Ruby Hair Instagram highlights with verified creator profiles.
  if(!influencerStories.length)return null;
  const story=active===null?null:influencerStories[active];
  return <section className="rh-influencer-section" aria-label="Ruby Hair Community">
    <div className="container"><div className="rh-influencer-heading">RUBY HAIR <span>COMMUNITY</span></div>
      <div className="rh-influencer-strip">{influencerStories.map((item,i)=><button key={item.username} type="button" className="rh-influencer-profile" onClick={()=>setActive(i)} aria-label={item.name+" Story ansehen"}>
        <span className="rh-influencer-ring"><img src={item.image} alt={item.name}/></span><span>{item.name}</span>
      </button>)}</div>
    </div>
    {story&&<div className="rh-story-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setActive(null)}}>
      <div className="rh-story-viewer" role="dialog" aria-modal="true" aria-label={story.name+" Story"}>
        <div className="rh-story-top"><a href={story.instagramUrl} target="_blank" rel="noopener noreferrer"><span>@{story.username}</span><ArrowUpRight size={17}/></a><button onClick={()=>setActive(null)} type="button" aria-label="Story schließen"><X size={20}/></button></div>
        <img src={story.image} alt={story.name}/>
        <a className="rh-story-instagram" href={story.instagramUrl} target="_blank" rel="noopener noreferrer"><Instagram size={16}/> Instagram ansehen</a>
      </div>
    </div>}
  </section>;
}
