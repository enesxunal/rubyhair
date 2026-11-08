import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const chromePath='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile=mkdtempSync(join(tmpdir(),'rubyperf-'));
const port=9468;
const chrome=spawn(chromePath,['--headless=new','--disable-gpu','--no-first-run','--disable-extensions',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
const wait=t=>new Promise(r=>setTimeout(r,t));
let ws;
try{
 let tab;
 for(let i=0;i<55;i++){try{tab=(await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(p=>p.type==='page');if(tab)break}catch{}await wait(120)}
 if(!tab)throw Error('Chrome CDP not available');
 ws=new WebSocket(tab.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
 let id=0;const calls=new Map();ws.addEventListener('message',e=>{const result=JSON.parse(e.data);const p=calls.get(result.id);if(p){calls.delete(result.id);result.error?p.reject(Error(result.error.message)):p.resolve(result.result)}});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;calls.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}))});
 await call('Page.enable');await call('Runtime.enable');
 const base=process.env.RUBY_LOCAL_PREVIEW||'http://127.0.0.1:8776';
 const routes=['/','/kollektionen/','/kollektionen/tape-in-extensions/?laenge=45-50-cm','/produkt/tape-in-extensions/?farbe=6&laenge=45-50-cm','/kasse/','/rechtliches/datenschutz/'];
 const widths=[320,390,768,1440];const rows=[];let bad=0;
 for(const width of widths){
  await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<=768});
  for(const path of routes){
   await call('Page.navigate',{url:base+path});await wait(450);
   const r=await call('Runtime.evaluate',{expression:`(()=>{const nav=performance.getEntriesByType('navigation')[0]||{};const paint=performance.getEntriesByType('paint').find(e=>e.name==='first-contentful-paint');const images=[...document.images].filter(x=>{const b=x.getBoundingClientRect();return b.bottom>=0&&b.top<innerHeight&&b.width>0&&b.height>0});return {title:document.title,h1:!!document.querySelector('h1'),scroll:document.documentElement.scrollWidth,viewport:innerWidth,broken:images.filter(i=>i.complete&&i.naturalWidth===0).length,dom:Math.round(nav.domContentLoadedEventEnd||0),fcp:Math.round(paint?.startTime||0),requests:performance.getEntriesByType('resource').length,noindex:document.querySelector('meta[name="robots"]')?.content?.includes('noindex')||false}})()`,returnByValue:true});
   const v=r.result.value;const ok=v.h1&&v.scroll<=v.viewport+2&&v.broken===0&&v.noindex;
   if(!ok)bad++;
   rows.push({width,path,ok,...v});console.log(`${ok?'PASS':'FAIL'} ${width}px ${path} scroll=${v.scroll-v.viewport} FCP=${v.fcp}ms DOM=${v.dom}ms`);
  }
 }
 const out=['# Ruby Hair — Lokal sentetik performans ve responsive QA','',
 'Tarih: 8 Kasım 2026. Lokal Mac Chromium (headless), Next.js production build. Ağ, sunucu ve gerçek ziyaretçi verisi değildir; **Core Web Vitals saha testi değildir**.','',
 '| Genişlik | Sayfa | Görünüm | FCP (ms) | DOMContentLoaded (ms) | Kaynak sayısı |','|---:|---|---|---:|---:|---:|'];
 for(const r of rows)out.push(`| ${r.width} | ${r.path} | ${r.ok?'PASS':'FAIL'} | ${r.fcp||'—'} | ${r.dom||'—'} | ${r.requests} |`);
 out.push('',`**Sonuç:** ${rows.length-bad}/${rows.length} sayfa-ekran kombinasyonu başarılı, ${bad} hata.`,
 '', '## Sonraki gerçek yayın doğrulaması',
 '- Testler yerel ortamda yapıldı; rubhair.de domain transferi ve WebAltyapı barındırması sonrasında gerçek mobil cihaz, Lighthouse/PageSpeed, Search Console ve 28 günlük Core Web Vitals saha verileri ayrıca gereklidir.',
 '- Vercel demo noindex/disallow iken SEO performansını arama sonuçlarından ölçmek doğru değildir.',
 '- Ürün görselleri yeniden çekim/renk onayı bekliyor. Renk swatch görsellerine kalite kaybettirebilecek filtre uygulanmadı.');
 writeFileSync('reports/performance-qa-2026-11-08.md',out.join('\n')+'\n');
 console.log(`TOTAL=${rows.length}, PASSED=${rows.length-bad}, FAIL=${bad}`);
 if(bad)process.exitCode=2;
}catch(e){console.error(e);process.exitCode=1}finally{ws?.close();chrome.kill('SIGTERM');await wait(350);try{rmSync(profile,{recursive:true,force:true})}catch{}}
