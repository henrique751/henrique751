(function(){
  'use strict';
  const raw=(window.TT_ROWS||'').trim();
  if(!raw){console.error('[TEM TUDO] Catálogo oficial não foi carregado.');return;}

  const brandRules=[
    ['Bosch',/\b(BOSCH|SKIL|FREUD)\b/i],
    ['Bremen',/\bBREMEN\b/i],
    ['DeWalt',/\b(DEWALT|DEWALT|STANLEY)\b/i],
    ['Gedore',/\bGEDORE\b/i],
    ['Lotus',/\bLOTUS\b/i],
    ['Lynus',/\bLYNUS\b/i],
    ['Vonder',/\bVONDER\b/i]
  ];
  const categoryNames={
    0:'Baterias e peças',1:'Conexões e acessórios',2:'Ferramentas manuais',3:'Corte e desbaste',4:'Fixação',5:'Acessórios',6:'Medição',7:'Perfuração',8:'Jardinagem',9:'Bombas e motores',10:'Medição e nível',11:'Solda',12:'Pneumática',13:'Elétrica',14:'Hidráulica',15:'Máquinas e equipamentos'
  };
  function inferBrand(name){
    for(const [brand,re] of brandRules) if(re.test(name)) return brand;
    return 'Outras marcas';
  }
  function inferCategory(name,code){
    const n=name.toUpperCase();
    if(/SOQUETE|CHAVE|ALICATE|MARTELO|CATRACA/.test(n)) return 'Ferramentas manuais';
    if(/BROCA|FURADEIRA|MARTELETE|PERFURADOR/.test(n)) return 'Perfuração';
    if(/DISCO|ESMERIL|LIXA|SERRA|FRESA/.test(n)) return 'Corte e desbaste';
    if(/BOMBA|MOTOR/.test(n)) return 'Bombas e motores';
    if(/SOLDA|ELETRODO|MAÇARICO|MACARICO/.test(n)) return 'Solda';
    if(/COMPRESSOR|PNEUM|ENGATE/.test(n)) return 'Pneumática';
    if(/FIO|CABO|DISJUNTOR|TOMADA|LAMPADA|LÂMPADA/.test(n)) return 'Elétrica';
    return categoryNames[Number(code)]||'Ferramentas e acessórios';
  }
  function tagsFor(name,ref,category){
    const tags=[]; const n=name.toLowerCase();
    const measure=n.match(/\b\d+(?:[.,]\d+)?\s*(?:mm|cm|m|pol|v|w|cv|hp|kg|l|a)\b/gi)||[];
    tags.push(...measure.slice(0,2));
    if(ref) tags.push(ref);
    tags.push(category);
    return [...new Set(tags)].slice(0,3);
  }
  const seen=new Set();
  const products=[];
  raw.split(/\r?\n/).forEach(line=>{
    const p=line.split('|');
    if(p.length<2)return;
    const sku=String(p[0]||'').trim();
    const name=String(p[1]||'').trim();
    const reference=String(p[2]||'').trim();
    const categoryCode=String(p[4]||p[3]||'').trim();
    if(!sku||!name||seen.has(sku))return;
    seen.add(sku);
    const brand=inferBrand(name);
    const category=inferCategory(name,categoryCode);
    products.push({sku,name,brand,category,application:name,reference,tags:tagsFor(name,reference,category)});
  });
  if(products.length<1800){
    console.error('[TEM TUDO] Catálogo incompleto:',products.length);
    return;
  }
  localStorage.setItem('tt_products',JSON.stringify(products));
  localStorage.setItem('tt_catalog_version','official-1888-v3');
  window.TT_OFFICIAL_PRODUCTS=products;
  console.info('[TEM TUDO] Catálogo oficial carregado:',products.length);
})();