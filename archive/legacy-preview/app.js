(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const body = document.body;
  const mobileMenu = $('#mobile-menu');
  const mobileShade = $('#mobile-shade');
  const menuTrigger = $('.menu-trigger');
  const setMobile = (open) => {
    mobileMenu.classList.toggle('open',open);
    mobileShade.hidden = !open;
    menuTrigger.setAttribute('aria-expanded',String(open));
    menuTrigger.setAttribute('aria-label',open?'Menü schließen':'Menü öffnen');
    body.style.overflow = open ? 'hidden' : '';
  };
  menuTrigger?.addEventListener('click',()=>setMobile(!mobileMenu.classList.contains('open')));
  $('#menu-close')?.addEventListener('click',()=>setMobile(false));
  mobileShade?.addEventListener('click',()=>setMobile(false));
  $$('#mobile-menu a').forEach(a=>a.addEventListener('click',()=>setMobile(false)));
  const megaButton = $('.nav-menu-button');
  megaButton?.addEventListener('click',()=>{
    const item = megaButton.closest('.menu-item');
    item.classList.toggle('active');
    megaButton.setAttribute('aria-expanded',String(item.classList.contains('active')));
  });
  $$('.mega a').forEach(a=>a.addEventListener('click',()=>{
    const item = $('.menu-item');
    item?.classList.remove('active');
    megaButton?.setAttribute('aria-expanded','false');
  }));
  const search = $('#search-overlay');
  const setSearch = (open) => {
    search.classList.toggle('open',open);
    search.setAttribute('aria-hidden',String(!open));
    if(open){setMobile(false);setTimeout(()=>$('#site-search').focus(),20);}
  };
  $$('[data-open-search]').forEach(el=>el.addEventListener('click',()=>setSearch(true)));
  $('.overlay-close')?.addEventListener('click',()=>setSearch(false));
  search?.addEventListener('click',e=>{if(e.target===search)setSearch(false)});
  const searchSubmit=()=>{
    const v=$('#site-search')?.value.trim().toLowerCase()||'';
    if(!v){$('.search-feedback').textContent='Bitte gib einen Suchbegriff ein.';return;}
    window.location.assign('/suche/?q='+encodeURIComponent(v));
  };
  $('#search-submit')?.addEventListener('click',searchSubmit);
  $('#site-search')?.addEventListener('keydown',e=>{if(e.key==='Enter')searchSubmit()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){setSearch(false);setMobile(false);$('.menu-item')?.classList.remove('active')}});
  const base='https://rubyhair.de/wp-content/uploads/2022/09/';
  const shades={
    brown:{src:base+'6-1-scaled.jpg',name:'Brown',num:'01'},
    bronde:{src:base+'bronde-1-scaled.jpg',name:'Bronde',num:'02'},
    blonde:{src:base+'60-3-scaled.jpg',name:'Blonde',num:'03'},
    ash:{src:base+'silber-1-scaled.jpg',name:'Ash',num:'04'}
  };
  $$('[data-shade]').forEach(button=>button.addEventListener('click',()=>{
    $$('[data-shade]').forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-pressed','false')});
    button.classList.add('selected');
    button.setAttribute('aria-pressed','true');
    const shade=shades[button.dataset.shade];
    if(!shade)return;
    $('#shade-image').src=shade.src;
    $('#shade-image').alt=shade.name+' Haarfarbe – Ruby Hair Extensions';
    $('.shade-counter').textContent=shade.num+' / 04';
  }));
  $('#newsletter-form')?.addEventListener('submit',e=>{
    e.preventDefault();
    $('#newsletter-feedback').textContent='Designvorschau: Newsletter-Anmeldung ist noch nicht aktiviert.';
  });
  $('#dismiss-note')?.addEventListener('click',()=>$('.prototype-note').remove());
  // In the concept preview, connect shopping to the current WooCommerce store.
  // The WordPress shop, not this static design, manages product variants, cart and payment.
  document.querySelectorAll('a[data-preview-href]').forEach((link) => {
    const url = link.dataset.previewHref;
    link.setAttribute('href', url);
    if (/^https?:\/\//.test(url)) {
      link.setAttribute('target','_blank');
      link.setAttribute('rel','noopener noreferrer');
    }
  });
})();
