(function(){
  function syncCatalog(){
    try{
      if(typeof state==='undefined'||!state)return false;
      const official=Array.isArray(window.TT_OFFICIAL_PRODUCTS)?window.TT_OFFICIAL_PRODUCTS:[];
      let stored=[];
      try{stored=JSON.parse(localStorage.getItem('tt_products')||'[]')}catch(_){stored=[]}
      const source=official.length>=1000?official:(stored.length>=1000?stored:[]);
      if(!source.length)return false;
      state.products=source;
      if(typeof renderBrands==='function')renderBrands();
      if(typeof renderCatalog==='function')renderCatalog();
      if(typeof renderQuote==='function')renderQuote();
      return true;
    }catch(error){console.error('[TEM TUDO] Falha ao sincronizar catálogo',error);return false}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(syncCatalog,10));
  else setTimeout(syncCatalog,10);
  window.addEventListener('load',()=>setTimeout(syncCatalog,100));
})();