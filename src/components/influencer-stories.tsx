"use client";

import {useCallback,useEffect,useRef,useState} from "react";
import {ArrowLeft,ArrowRight,ArrowUpRight,Instagram,X} from "lucide-react";
import {influencerStories} from "@/data/influencer-stories";

const STORY_DURATION=7000;

export default function InfluencerStories(){
  const [active,setActive]=useState<number|null>(null);
  const [paused,setPaused]=useState(false);
  const lastTrigger=useRef<HTMLButtonElement|null>(null);
  const closeRef=useRef<HTMLButtonElement|null>(null);
  const touchStart=useRef<{x:number;y:number}|null>(null);
  const total=influencerStories.length;

  const close=useCallback(()=>{
    setActive(null);
    setPaused(false);
    window.requestAnimationFrame(()=>lastTrigger.current?.focus());
  },[]);
  const next=useCallback(()=>{
    setActive(index=>index===null?null:(index+1)%total);
    setPaused(false);
  },[total]);
  const prev=useCallback(()=>{
    setActive(index=>index===null?null:index===0?total-1:index-1);
    setPaused(false);
  },[total]);

  useEffect(()=>{
    if(active===null)return;
    const originalOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    closeRef.current?.focus();
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){event.preventDefault();close();}
      if(event.key==="ArrowRight"){event.preventDefault();next();}
      if(event.key==="ArrowLeft"){event.preventDefault();prev();}
      if(event.key===" " && !["A","BUTTON"].includes((event.target as HTMLElement).tagName)){
        event.preventDefault();setPaused(v=>!v);
      }
    };
    document.addEventListener("keydown",onKeyDown);
    return ()=>{document.body.style.overflow=originalOverflow;document.removeEventListener("keydown",onKeyDown);};
  },[active,close,next,prev]);

  useEffect(()=>{
    if(active===null||paused)return;
    const timeout=window.setTimeout(next,STORY_DURATION);
    return ()=>window.clearTimeout(timeout);
  },[active,paused,next]);

  if(!total)return null;
  const story=active===null?null:influencerStories[active];
  return <>
    <section className="rh-influencer-section" aria-label="Ruby Hair Community">
      <div className="container">
        <div className="rh-influencer-heading">RUBY HAIR <span>COMMUNITY</span></div>
        <div className="rh-influencer-strip">
          {influencerStories.map((item,index)=>
            <button className="rh-influencer-profile" key={item.image} type="button"
              onClick={event=>{lastTrigger.current=event.currentTarget;setPaused(false);setActive(index);}}
              aria-label={item.name+" ansehen"}>
              <span className="rh-influencer-ring"><img src={item.image} alt="" loading="lazy"/></span>
              <span>{item.name}</span>
            </button>
          )}
        </div>
      </div>
    </section>
    {story&&active!==null&&<div className="rh-story-overlay" role="presentation"
      onMouseDown={event=>{if(event.target===event.currentTarget)close();}}>
      <div className="rh-story-stage">
        <button type="button" className="rh-story-side-control rh-story-side-prev" onClick={prev}
          aria-label="Vorheriges Foto"><ArrowLeft size={22}/></button>
        <div className="rh-story-viewer" role="dialog" aria-modal="true"
          aria-label={"Ruby Hair Galerie: "+story.name}
          onPointerDown={()=>setPaused(true)} onPointerUp={()=>setPaused(false)} onPointerCancel={()=>setPaused(false)}
          onTouchStart={event=>{touchStart.current={x:event.touches[0].clientX,y:event.touches[0].clientY};}}
          onTouchEnd={event=>{
            if(!touchStart.current)return;
            const dx=event.changedTouches[0].clientX-touchStart.current.x;
            const dy=event.changedTouches[0].clientY-touchStart.current.y;
            touchStart.current=null;
            if(Math.abs(dx)>55 && Math.abs(dx)>Math.abs(dy)*1.3){if(dx<0)next();else prev();}
          }}>
          <div className="rh-story-backdrop" style={{backgroundImage:`url("${story.image}")`}} aria-hidden="true"/>
          <img className="rh-story-image" key={story.image} src={story.image}
            alt={story.name+" – Ruby Hair Instagram Beitrag"} />
          <div className="rh-story-progress" aria-label={"Foto "+(active+1)+" von "+total}>
            {influencerStories.map((item,index)=><span key={item.image} className="rh-story-progress-track">
              <span key={index===active?story.image:"not-active"} className={
                "rh-story-progress-fill"+(index<active?" is-complete":index===active?" is-active":"")
              } style={index===active?{animationDuration:STORY_DURATION+"ms",animationPlayState:paused?"paused":"running"}:undefined}/>
            </span>)}
          </div>
          <div className="rh-story-top">
            <a href={story.instagramUrl} target="_blank" rel="noopener noreferrer"
              aria-label="Ruby Hair Instagram Profil in neuem Tab öffnen">
              <span className="rh-story-account-avatar">RH</span>
              <span className="rh-story-account-name">@{story.username}<small>RUBY HAIR COMMUNITY</small></span>
              <ArrowUpRight size={16}/>
            </a>
            <button ref={closeRef} className="rh-story-close" onClick={close} type="button"
              aria-label="Galerie schließen"><X size={23}/></button>
          </div>
          <button type="button" className="rh-story-tap rh-story-tap-prev" onClick={prev}
            aria-label="Vorheriges Foto"/>
          <button type="button" className="rh-story-tap rh-story-tap-next" onClick={next}
            aria-label="Nächstes Foto"/>
          <div className="rh-story-bottom">
            <span className="rh-story-counter">{String(active+1).padStart(2,"0")} / {String(total).padStart(2,"0")}</span>
            <a href={story.postUrl} target="_blank" rel="noopener noreferrer">
              <Instagram size={17}/> Beitrag auf Instagram ansehen <ArrowUpRight size={15}/>
            </a>
          </div>
        </div>
        <button type="button" className="rh-story-side-control rh-story-side-next" onClick={next}
          aria-label="Nächstes Foto"><ArrowRight size={22}/></button>
      </div>
    </div>}
  </>;
}
