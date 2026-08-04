(()=>{
  'use strict';
  function applyBrand(){
    const logo=window.TT_ASSET_0;
    const mascot=window.TT_ASSET_1;
    if(logo){document.querySelectorAll('[data-tt-logo]').forEach(img=>{img.src=logo;img.removeAttribute('hidden')})}
    if(mascot){document.querySelectorAll('[data-tt-mascot]').forEach(img=>{img.src=mascot;img.removeAttribute('hidden')})}
  }
  function loadQuoteReader(){
    if(document.querySelector('script[data-quote-reader]'))return;
    const s=document.createElement('script');
    s.src='./quote-reader-v4.js?v=20260804-1';
    s.dataset.quoteReader='1';
    document.body.appendChild(s);
  }
  function boot(){applyBrand();loadQuoteReader()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();