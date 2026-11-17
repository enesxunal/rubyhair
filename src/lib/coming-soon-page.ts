/** Static, self-contained German landing page for the holding domains.
 *  No checkout, JavaScript, tracking pixels or customer forms.
 */
export function renderRubyHairComingSoon():string{
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ruby Hair Extensions — Wir sind bald zurück</title>
<meta name="description" content="Das neue Ruby Hair Erlebnis entsteht. Premium Echthaar-Extensions, bald in einem ganz neuen Onlineshop.">
<meta name="theme-color" content="#241b20">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
<style>
:root{color-scheme:dark;--ink:#21191e;--cream:#f4efea;--soft:#d8bdc8;--rose:#b98798}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;}body{background:var(--ink);color:var(--cream);font-family:'DM Sans',Arial,sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}a:focus-visible{outline:2px solid #fff;outline-offset:5px}
.shell{min-height:100svh;display:grid;grid-template-columns:50% 50%;overflow:hidden}
.copy{position:relative;display:flex;flex-direction:column;justify-content:space-between;min-height:760px;padding:clamp(32px,4vw,67px) clamp(34px,5.4vw,98px) 38px clamp(38px,6.7vw,115px);background:radial-gradient(circle at 8% 78%,#51303b 0%,transparent 51%),linear-gradient(135deg,#302128,#211a20 70%);z-index:1}
.copy:after{content:"";position:absolute;right:0;top:0;bottom:0;width:1px;background:linear-gradient(transparent,#ffffff29,transparent)}
.logo{display:block;width:min(260px,75%);height:auto;object-fit:contain;object-position:left}
.topbar{display:flex;align-items:center;gap:16px}
.rule{width:38px;height:1px;background:var(--rose);flex:0 0 auto}.topnote,.eyebrow,.side-label,.bottom-label{font-size:10px;line-height:1.5;letter-spacing:.22em;font-weight:600;text-transform:uppercase}
.topnote{color:#d8c6ce}.main{margin:75px 0 63px;max-width:680px}
.eyebrow{display:flex;align-items:center;gap:16px;color:#e1b7c5;white-space:nowrap}
h1{font:400 clamp(52px,5.3vw,94px)/1.06 'Playfair Display',Georgia,serif;letter-spacing:-.048em;margin:32px 0 27px}
h1 em{font-weight:400;color:#e7baca;letter-spacing:-.05em}
.lead{max-width:445px;font-size:clamp(14px,1.2vw,17px);line-height:1.95;color:#ddced4;margin:0}
.actions{display:flex;align-items:center;gap:29px;flex-wrap:wrap;margin-top:40px}
.primary{display:inline-flex;align-items:center;justify-content:space-between;min-height:57px;min-width:226px;gap:25px;padding:0 21px;background:var(--cream);color:#32232c;font-size:11px;font-weight:700;letter-spacing:.08em;transition:background .2s,transform .2s}
.primary:hover{background:#ead3db;transform:translateY(-2px)}.arrow{font-size:25px;font-weight:300;line-height:1}
.secondary{display:inline-flex;gap:9px;align-items:center;padding-bottom:7px;border-bottom:1px solid #9b7d89;font-size:11px;font-weight:600;letter-spacing:.04em;transition:border-color .2s}.secondary:hover{border-color:#fff}
.foot{border-top:1px solid #ffffff26;padding-top:22px;display:flex;gap:25px;align-items:center;justify-content:space-between}.foot small{font-size:10px;color:#b3a5aa;line-height:1.65;letter-spacing:.07em}
.visual{position:relative;min-height:650px;background:#3f3039;overflow:hidden}
.visual>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:84% center;filter:saturate(.81) contrast(1.04) brightness(.83)}
.visual:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,#211a2039 0%,transparent 23%),linear-gradient(0deg,#1f171c99,transparent 36%)}
.brand-stamp{position:absolute;z-index:1;right:clamp(25px,5vw,85px);top:clamp(40px,7vw,100px);border:1px solid #fff9;width:122px;height:122px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;font:400 16px/1.17 Georgia,serif;transform:rotate(12deg);color:white;letter-spacing:.03em;text-shadow:0 1px 4px #0004}.brand-stamp em{font-style:italic;color:#f7d5e1;font-size:15px;margin-top:5px}
.side-label{position:absolute;bottom:39px;right:52px;z-index:1;color:#fff;letter-spacing:.26em}
@media(max-width:1020px){.shell{grid-template-columns:54% 46%}.copy{padding:40px 34px;min-height:680px}h1{font-size:clamp(52px,6vw,75px)}.actions{gap:23px}.primary{min-width:200px}}
@media(max-width:700px){.shell{display:flex;flex-direction:column}.copy{min-height:0;order:1;padding:28px 27px 36px;display:flex}.topbar{gap:12px}.logo{width:197px}.main{margin:60px 0 44px}.eyebrow{font-size:9px;letter-spacing:.14em}.eyebrow .rule{width:22px}h1{font-size:clamp(47px,11.4vw,70px);line-height:1.09;margin:25px 0 22px}.lead{font-size:14px;line-height:1.85}.actions{gap:22px;margin-top:32px}.primary{min-width:214px}.foot{padding-top:18px;gap:10px}.foot small{font-size:9px}.visual{order:2;height:42svh;min-height:280px}.visual>img{object-position:center 42%}.brand-stamp{width:92px;height:92px;font-size:13px;top:25px;right:26px}.brand-stamp em{font-size:12px}.side-label{right:25px;bottom:22px;font-size:9px}}
@media(max-width:360px){.copy{padding-left:20px;padding-right:20px}.logo{width:185px}h1{font-size:46px}.actions{gap:18px}.primary{width:100%}}
@media(prefers-reduced-motion:reduce){.primary{transition:none}}
</style></head>
<body><main class="shell">
<section class="copy" aria-labelledby="main-title">
 <header class="topbar"><img class="logo" alt="RUBY HAIR EXTENSIONS" width="520" height="120" src="/media/RubyHair-WebHeader-Logo-Hell-818376d91.png"></header>
 <div class="main">
  <div class="eyebrow"><span class="rule" aria-hidden="true"></span> THE NEW RUBY HAIR EXPERIENCE</div>
  <h1 id="main-title">Schönes Haar.<br><em>Neuer Auftritt.</em></h1>
  <p class="lead">Wir verleihen unserem Onlineshop einen neuen Look. Entdecke bald unsere Premium Echthaar-Extensions, sorgfältig ausgewählte Nuancen und ein ganz neues Einkaufserlebnis.</p>
  <div class="actions"><a class="primary" href="mailto:info@rubyhair.de">KONTAKT AUFNEHMEN <span class="arrow" aria-hidden="true">↗</span></a><a class="secondary" href="https://www.instagram.com/rubyhair.de/" target="_blank" rel="noopener noreferrer">Instagram entdecken <span aria-hidden="true">↗</span></a></div>
 </div>
 <footer class="foot"><small>© 2026 RUBY HAIR EXTENSIONS</small><small>ESSEN · DEUTSCHLAND</small></footer>
</section>
<aside class="visual" aria-label="Ruby Hair Extensions – edler Haarlook"><img src="/assets/hero-brunette.webp" alt="Model mit langen braunen Haaren" width="1672" height="941" loading="eager"><div class="brand-stamp">Your Hair<br>Your Beauty<em>coming soon</em></div><span class="side-label">BEAUTY IN EVERY DETAIL</span></aside>
</main></body></html>`;
}
