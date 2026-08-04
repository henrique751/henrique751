/* TEM TUDO — sincronização resiliente do catálogo oficial */
(function(){
  'use strict';

  function inferBrand(name){
    const n=String(name||'').toUpperCase();
    if(/BOSCH|SKIL|FREUD/.test(n))return'Bosch';
    if(/BREMEN/.test(n))return'Bremen';
    if(/DEWALT|STANLEY/.test(n))return'DeWalt';
    if(/GEDORE/.test(n))return'Gedore';
    if(/LOTUS/.test(n))return'Lotus';
    if(/LYNUS/.test(n))return'Lynus';
    if(/VONDER/.test(n))return'Vonder';
    return'Outras marcas';
  }
  function inferCategory(name){
    const n=String(name||'').toUpperCase();
    if(/SOQUETE|CHAVE|ALICATE|MARTELO|CATRACA/.test(n))return'Ferramentas manuais';
    if(/BROCA|FURADEIRA|MARTELETE|PERFURADOR/.test(n))return'Perfuração';
    if(/DISCO|ESMERIL|LIXA|SERRA|FRESA/.test(n))return'Corte e desbaste';
    if(/BOMBA|MOTOR/.test(n))return'Bombas e motores';
    if(/SOLDA|ELETRODO|MACARICO|MAÇARICO/.test(n))return'Solda';
    if(/COMPRESSOR|PNEUM|ENGATE/.test(n))return'Pneumática';
    if(/FIO|CABO|DISJUNTOR|TOMADA|LAMPADA|LÂMPADA/.test(n))return'Elétrica';
    return'Ferramentas e acessórios';
  }
  function parseRaw(){
    const raw=String(window.TT_ROWS||'').trim();
    if(!raw)return[];
    const seen=new Set(),out=[];
    raw.split(/\r?\n/).forEach((line,index)=>{
      const p=line.split('|');
      const originalSku=String(p[0]||'').trim();
      const name=String(p[1]||'').trim();
      const reference=String(p[2]||'').trim();
      if(!originalSku||!name)return;
      const signature=[originalSku,name,reference].join('|').toUpperCase();
      if(seen.has(signature))return;
      seen.add(signature);
      const sku=out.some(x=>x.originalSku===originalSku)?`${originalSku}~${out.filter(x=>x.originalSku===originalSku).length+1}`:originalSku;
      const category=inferCategory(name);
      out.push({id:`tt-${index+1}`,sku,originalSku,name,brand:inferBrand(name),category,application:name,reference,tags:[reference,category].filter(Boolean)});
    });
    return out;
  }
  function official(){
    if(Array.isArray(window.TT_OFFICIAL_PRODUCTS)&&window.TT_OFFICIAL_PRODUCTS.length>1000)return window.TT_OFFICIAL_PRODUCTS;
    const parsed=parseRaw();
    if(parsed.length>1000){window.TT_OFFICIAL_PRODUCTS=parsed;return parsed;}
    return[];
  }
  function sync(){
    const products=official();
    if(products.length<1000)return false;
    try{
      if(typeof state!=='undefined'){
        state.products=products;
        state.brand='Todas';
        if(typeof renderBrands==='function')renderBrands();
        if(typeof renderCatalog==='function')renderCatalog();
        if(typeof renderQuote==='function')renderQuote();
        if(typeof updateMetrics==='function')updateMetrics();
      }
    }catch(error){console.warn('[TEM TUDO] Nova tentativa de sincronização será feita.',error);return false;}
    try{localStorage.setItem('tt_catalog_version','official-runtime-v7')}catch(_e){}
    document.documentElement.dataset.catalogCount=String(products.length);
    console.info('[TEM TUDO] Catálogo sincronizado na interface:',products.length);
    return true;
  }
  let tries=0;
  function retry(){
    tries++;
    if(sync()||tries>=20)return;
    setTimeout(retry,150);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',retry,{once:true});else retry();
})();
