"use client";
import {useState} from "react";
import type {DailyCounts} from "@/lib/admin-analytics-report";

type Key="views"|"added"|"checkouts"|"storyViews";
const options:Array<{key:Key;label:string}>=[
 {key:"views",label:"Seitenaufrufe"},{key:"added",label:"Warenkorb"},
 {key:"checkouts",label:"Kasse"},{key:"storyViews",label:"Storys"}
];
const money=(n:number)=>new Intl.NumberFormat("de-DE").format(n);
export default function AdminAnalyticsTrend({daily,previousDaily}:{daily:DailyCounts[];previousDaily:DailyCounts[]}){
 const [metric,setMetric]=useState<Key>("views");
 const [selected,setSelected]=useState<number|null>(null);
 const width=780,height=220,top=18,bottom=186,left=38,right=762;
 const values=daily.map(d=>d[metric]);const old=previousDaily.map(d=>d[metric]);
 const max=Math.max(1,...values,...old);
 const x=(i:number)=>(left+(right-left)*(daily.length<=1?.5:i/(daily.length-1)));
 const y=(v:number)=>(bottom-(v/max)*(bottom-top));
 const coords=(vals:number[])=>vals.map((v,i)=>`${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(" ");
 const points=values.map((v,i)=>({x:x(i),y:y(v),value:v,label:daily[i]?.label}));
 const chosen=selected!==null?daily[selected]:null;
 const latest=values.reduce((a,b)=>a+b,0);
 const previous=old.reduce((a,b)=>a+b,0);
 return <div className="rh-analytics-trend">
  <div className="rh-analytics-trend-toolbar" role="group" aria-label="Diagrammkennzahl">
   {options.map(option=><button key={option.key} type="button" onClick={()=>{setMetric(option.key);setSelected(null)}}
    aria-pressed={metric===option.key} className={metric===option.key?"is-active":undefined}>{option.label}</button>)}
  </div>
  <div className="rh-analytics-trend-meta"><span><b>{money(latest)}</b> im aktuellen Zeitraum</span><span><b>{money(previous)}</b> im Vergleichszeitraum</span></div>
  <div className="rh-analytics-trend-chart" role="group" aria-label="Zeitlicher Verlauf, ausgewählter Messwert">
   <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${options.find(x=>x.key===metric)?.label}: aktuelle ${latest}, vorherige ${previous}.` } preserveAspectRatio="xMidYMid meet">
    <defs><linearGradient id="rh-analytics-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8c526d" stopOpacity=".19"/><stop offset="100%" stopColor="#8c526d" stopOpacity=".01"/></linearGradient></defs>
    {[0,.25,.5,.75,1].map(t=><g key={t}>
     <line x1={left} x2={right} y1={bottom-(bottom-top)*t} y2={bottom-(bottom-top)*t} stroke="#ebe3e4" strokeWidth="1"/>
     <text x={left-8} y={bottom-(bottom-top)*t+3} fill="#998892" fontSize="10" textAnchor="end">{money(Math.round(max*t))}</text>
    </g>)}
    <polyline fill="none" stroke="#d3b6c0" strokeWidth="2.3" strokeDasharray="5 6" strokeLinecap="round" strokeLinejoin="round" points={coords(old)}/>
    {points.length>1&&<polygon points={`${left},${bottom} ${coords(values)} ${right},${bottom}`} fill="url(#rh-analytics-fill)"/>}
    <polyline fill="none" stroke="#75405a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={coords(values)}/>
    {points.map((point,i)=><g key={daily[i].day}>
      <circle cx={point.x} cy={point.y} r={selected===i?6:4} fill="#75405a" stroke="#fff" strokeWidth="2.5" tabIndex={0}
       onFocus={()=>setSelected(i)} onMouseEnter={()=>setSelected(i)} onClick={()=>setSelected(i)} aria-label={`${point.label}: ${point.value}`}>
       <title>{`${point.label}: ${point.value} · Vergleichstag: ${old[i]||0}`}</title>
      </circle>
    </g>)}
    {[0,Math.round((daily.length-1)/2),daily.length-1].filter((n,i,a)=>a.indexOf(n)===i).map(i=><text key={i} x={x(i)} y={height-10} textAnchor="middle" fill="#9f8a96" fontSize="11">{daily[i]?.label}</text>)}
   </svg>
  </div>
  <div className="rh-analytics-trend-legend"><span><i className="current"/> Aktueller Zeitraum</span><span><i className="previous"/> Vergleichszeitraum</span>
   <strong aria-live="polite">{chosen?`${chosen.label}: ${money(chosen[metric])}`:"Tagespunkte im Diagramm auswählen"}</strong>
  </div>
  <p className="rh-ops-muted">Tageswerte zählen freigegebene Ereignisse, keine eindeutigen Besucher. Bei „Heute“ ist der aktuelle Tag noch nicht abgeschlossen.</p>
 </div>;
}
