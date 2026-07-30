(async()=>{
  try{
    const bytes=Uint8Array.from(atob(window.TT_BUNDLE||''),c=>c.charCodeAt(0));
    if(!('DecompressionStream' in window)) throw new Error('Navegador incompatível com o catálogo.');
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const source=await new Response(stream).text();
    const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
    const script=document.createElement('script');
    script.src=url;script.onload=()=>URL.revokeObjectURL(url);script.onerror=()=>{throw new Error('Falha ao iniciar o site.');};
    document.body.appendChild(script);
  }catch(error){
    console.error(error);
    document.getElementById('app').innerHTML='<section class="section"><div class="wrap empty"><h1>Atualize o navegador</h1><p>Não foi possível carregar o catálogo neste navegador.</p></div></section>';
  }
})();
