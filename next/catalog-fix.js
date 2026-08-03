(async function(){
  const VERSION='20260803-0420';
  const files=['catalog-01.js','catalog-02.js','catalog-03.js','catalog-04.js','catalog-05.js','catalog-06.js','catalog-07.js','catalog-08.js'];
  const loadScript=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='../'+src+'?v='+VERSION;s.onload=resolve;s.onerror=()=>reject(new Error('Falha ao carregar '+src));document.head.appendChild(s)});
  try{
    window.TT_ROWS='';
    for(const file of files) await loadScript(file);
    const brandNames=['Bosch','Bremen','DeWalt','Gedore','Lotus','Lynus','Vonder'];
    const categoryNames={0:'Acessórios e peças',1:'Conexões e hidráulica',2:'Ferramentas manuais',3:'Corte e desbaste',4:'Máquinas e equipamentos',5:'Acessórios',6:'Jardinagem',7:'Perfuração',8:'Compressores e pneumática',9:'Motores e bombas',10:'Medição',11:'Solda'};
    const rows=(window.TT_ROWS||'').split(/\n/).filter(Boolean);
    const official=[]; const seen=new Set();
    for(const row of rows){
      const c=row.split('|');
      const sku=(c[0]||'').trim(); const name=(c[1]||'').trim(); const reference=(c[2]||'').trim();
      const brand=brandNames[Number(c[3])]||inferBrand(name)||'TEM TUDO';
      const category=categoryNames[Number(c[4])]||'Outros';
      if(!sku||!name||seen.has(sku)) continue;
      seen.add(sku);
      official.push({sku,name,reference,brand,category,application:inferApplication(name,category),tags:[reference,category].filter(Boolean)});
    }
    if(official.length<1800) throw new Error('Catálogo incompleto: '+official.length+' itens');
    localStorage.setItem('tt_products',JSON.stringify(official));
    if(typeof state!=='undefined'){
      state.products=official;
      state.brand='Todas'; state.search='';
      if(typeof renderBrands==='function') renderBrands();
      if(typeof renderCatalog==='function') renderCatalog();
      if(typeof renderQuote==='function') renderQuote();
      if(typeof updateMetrics==='function') updateMetrics();
    }
    const stats=document.querySelector('#catalogStats');
    if(stats&&!location.hash.includes('catalogo')) stats.textContent=`${official.length} produtos oficiais carregados`;
    console.info('[TEM TUDO] Catálogo oficial carregado:',official.length);
  }catch(error){
    console.error('[TEM TUDO] Falha ao carregar catálogo oficial',error);
    const stats=document.querySelector('#catalogStats'); if(stats) stats.textContent='Falha ao carregar o catálogo oficial. Atualize a página.';
  }
  function inferBrand(name){const n=(name||'').toUpperCase();return brandNames.find(b=>n.includes(b.toUpperCase()))||''}
  function inferApplication(name,category){const n=(name||'').toUpperCase();const terms=[];
    if(/FURADEIRA|MARTELETE|BROCA/.test(n))terms.push('furar concreto madeira metal alvenaria');
    if(/ESMERIL|DISCO|LIXA|POLITRIZ/.test(n))terms.push('corte desbaste lixamento acabamento');
    if(/BOMBA/.test(n))terms.push('transferência bombeamento água óleo');
    if(/SOLDA|INVERSORA|ELETRODO/.test(n))terms.push('soldagem serralheria manutenção');
    if(/COMPRESSOR|PNEUM/.test(n))terms.push('ar comprimido oficina pintura');
    if(/MOTOR/.test(n))terms.push('acionamento máquinas equipamentos');
    if(/CHAVE|SOQUETE|ALICATE/.test(n))terms.push('aperto manutenção montagem');
    return (terms.join(' ')||category).toLowerCase();
  }
})();