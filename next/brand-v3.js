(()=>{
  'use strict';
  function applyBrand(){
    const logo=window.TT_ASSET_0;
    const mascot=window.TT_ASSET_1;
    if(logo){document.querySelectorAll('[data-tt-logo]').forEach(img=>{img.src=logo;img.removeAttribute('hidden')})}
    if(mascot){document.querySelectorAll('[data-tt-mascot]').forEach(img=>{img.src=mascot;img.removeAttribute('hidden')})}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyBrand);else applyBrand();
})();