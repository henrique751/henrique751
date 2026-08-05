import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'build', 'tem-tudo-assistant-core');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'logic'), { recursive: true });

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const normalize = (s='') => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

// 1) Catálogo oficial: executa os oito fragmentos em sandbox, sem DOM/rede.
const context = { window: {} };
vm.createContext(context);
const catalogSources = [];
for (let i = 1; i <= 8; i++) {
  const file = `catalog-${String(i).padStart(2,'0')}.js`;
  if (!exists(file)) throw new Error(`Fragmento obrigatório ausente: ${file}`);
  const source = read(file);
  vm.runInContext(source, context, { filename: file, timeout: 5000 });
  catalogSources.push({ file, bytes: Buffer.byteLength(source), sha256: sha256(source) });
}
const rawRows = String(context.window.TT_ROWS || '').trim();
if (!rawRows) throw new Error('TT_ROWS vazio após carregar os fragmentos do catálogo.');

const brandRules = [
  ['Bosch', /\b(BOSCH|SKIL|FREUD)\b/i], ['Bremen', /\bBREMEN\b/i],
  ['DeWalt', /\b(DEWALT|STANLEY)\b/i], ['Gedore', /\bGEDORE\b/i],
  ['Lotus', /\bLOTUS\b/i], ['Lynus', /\bLYNUS\b/i], ['Vonder', /\bVONDER\b/i]
];
const categoryNames = {
  0:'Baterias e peças',1:'Conexões e acessórios',2:'Ferramentas manuais',3:'Corte e desbaste',
  4:'Fixação',5:'Acessórios',6:'Medição',7:'Perfuração',8:'Jardinagem',9:'Bombas e motores',
  10:'Medição e nível',11:'Solda',12:'Pneumática',13:'Elétrica',14:'Hidráulica',15:'Máquinas e equipamentos'
};
function inferBrand(name) { for (const [brand,re] of brandRules) if (re.test(name)) return brand; return 'Outras marcas'; }
function inferCategory(name, code) {
  const n = String(name).toUpperCase();
  if (/SOQUETE|CHAVE|ALICATE|MARTELO|CATRACA/.test(n)) return 'Ferramentas manuais';
  if (/BROCA|FURADEIRA|MARTELETE|PERFURADOR/.test(n)) return 'Perfuração';
  if (/DISCO|ESMERIL|LIXA|SERRA|FRESA/.test(n)) return 'Corte e desbaste';
  if (/BOMBA|MOTOR/.test(n)) return 'Bombas e motores';
  if (/SOLDA|ELETRODO|MAÇARICO|MACARICO/.test(n)) return 'Solda';
  if (/COMPRESSOR|PNEUM|ENGATE/.test(n)) return 'Pneumática';
  if (/FIO|CABO|DISJUNTOR|TOMADA|LAMPADA|LÂMPADA/.test(n)) return 'Elétrica';
  return categoryNames[Number(code)] || 'Ferramentas e acessórios';
}
function tagsFor(name, reference, category) {
  const tags = [];
  const measures = String(name).toLowerCase().match(/\b\d+(?:[.,]\d+)?\s*(?:mm|cm|m|pol|v|w|cv|hp|kg|l|a)\b/gi) || [];
  tags.push(...measures.slice(0,2)); if (reference) tags.push(reference); tags.push(category);
  return [...new Set(tags)].slice(0,3);
}

const products = [];
const seen = new Set();
const skuCounts = new Map();
rawRows.split(/\r?\n/).forEach((line, index) => {
  const p = line.split('|');
  if (p.length < 2) return;
  const originalSku = String(p[0] || '').trim();
  const name = String(p[1] || '').trim();
  const reference = String(p[2] || '').trim();
  const categoryCode = String(p[4] || p[3] || '').trim();
  if (!originalSku || !name) return;
  const signature = `${originalSku}|${name}|${reference}`.toUpperCase();
  if (seen.has(signature)) return;
  seen.add(signature);
  const count = (skuCounts.get(originalSku) || 0) + 1;
  skuCounts.set(originalSku, count);
  const sku = count > 1 ? `${originalSku}~${count}` : originalSku;
  const brand = inferBrand(name);
  const category = inferCategory(name, categoryCode);
  products.push({
    id:`tt-${index+1}`, sku, original_sku:originalSku, name, reference, brand, category,
    category_code:categoryCode, application:name, tags:tagsFor(name,reference,category),
    searchable_text:normalize([sku,originalSku,name,reference,brand,category].join(' ')),
    price:null, stock_status:'consultar', warranty_status:'consultar_fonte_oficial', source:'catalog-01..08.js'
  });
});
if (products.length < 1000) throw new Error(`Catálogo incompleto: somente ${products.length} produtos.`);

// 2) Conhecimento operacional consolidado até 05/08/2026.
const aliases = {
  'soq':'soquete','soc':'soquete','chav':'chave','ch':'chave','comb':'combinada',
  'chav comb':'chave combinada','chave comb':'chave combinada','chav ph':'chave philips',
  'ch ph':'chave philips','ph':'philips','phillips':'philips','chav fen':'chave fenda',
  'ch fen':'chave fenda','fen':'fenda','chav boca':'chave fixa','chave boca':'chave fixa',
  'boca':'fixa','chav fixa':'chave fixa','ali':'alicate','alic':'alicate','uni':'universal',
  'paraf':'parafusadeira','furad':'furadeira','esmer':'esmerilhadeira','esmerilh':'esmerilhadeira',
  'lixad':'lixadeira','mart':'martelete','marte':'martelete','comp':'compressor','mang':'mangueira',
  'eng':'engate','pist':'pistola','adapt':'adaptador','ext':'extensão','reg':'registro',
  'joel':'joelho','disj':'disjuntor','tom':'tomada','lamp':'lâmpada','elet':'eletrodo',
  'inox':'aço inox','aco':'aço','alum':'alumínio','mad':'madeira','conc':'concreto',
  'alven':'alvenaria','ferro':'metal','p/':'para','c/':'com','s/':'sem','jg':'jogo',
  'jog':'jogo','kit':'jogo','un':'unidade','und':'unidade','unid':'unidade','pc':'peça',
  'pcs':'peças','pç':'peça','qtd':'quantidade','pol':'polegada','mt':'metro','mts':'metros',
  'cm':'centímetro','mm':'milímetro','kg':'quilo','gr':'grama','lt':'litro','l':'litro',
  'cv':'cavalo vapor','hp':'horse power','v':'volt','bat':'bateria','maq':'máquina',
  'maq solda':'máquina solda','sold':'solda','broc':'broca','disc':'disco','serr':'serra',
  'rol':'rolamento','rolam':'rolamento'
};
const typoRules = [
  ['esmerilh?ad[ae]r?a','esmerilhadeira'],['furad[ei]ra','furadeira'],
  ['parafuzadeira','parafusadeira'],['phil?l?ips','philips'],['soquet[ei]','soquete'],
  ['martelet[ei]','martelete'],['brok?a','broca'],['chav[ei]','chave'],['combinad[ao]','combinada']
];
const units = [
  {tokens:['un','und','unid'],canonical:'UN',type:'unidade'}, {tokens:['pc','pcs','pç','pçs'],canonical:'PC',type:'peça'},
  {tokens:['m','mt','mts'],canonical:'M',type:'comprimento'}, {tokens:['mm'],canonical:'MM',type:'comprimento'},
  {tokens:['cm'],canonical:'CM',type:'comprimento'}, {tokens:['kg'],canonical:'KG',type:'massa'},
  {tokens:['g','gr'],canonical:'G',type:'massa'}, {tokens:['l','lt'],canonical:'L',type:'volume'},
  {tokens:['cx'],canonical:'CX',type:'caixa'}, {tokens:['jg','jogo','kit'],canonical:'JG',type:'conjunto'}
];
const policies = [
  {key:'no_hallucination',value:'Nunca inventar preço, estoque, garantia, potência, compatibilidade ou especificação.'},
  {key:'source_first',value:'Consultar primeiro catálogo e documentos internos; usar fonte oficial quando necessário.'},
  {key:'availability',value:'Sem integração de estoque em tempo real, informar “Consultar disponibilidade”.'},
  {key:'warranty',value:'Garantia varia por marca e referência; solicitar modelo/código e consultar fonte oficial.'},
  {key:'ambiguity',value:'Quando houver múltiplas opções ou baixa confiança, perguntar medida, tensão, marca, aplicação ou referência.'},
  {key:'quote_merge',value:'Somar itens repetidos por SKU; sem SKU seguro, consolidar por descrição normalizada.'},
  {key:'customer_language',value:'Entender linguagem formal, informal, erros de digitação, abreviações e listas copiadas do WhatsApp.'},
  {key:'handoff',value:'Encaminhar ao vendedor com resumo do cliente, itens, quantidades, dúvidas e observações.'},
  {key:'privacy',value:'Metadados empresariais do documento não devem ser confundidos com produtos.'},
  {key:'catalog_scale',value:'Estrutura preparada para mais de 10.000 produtos; base atual oficial é carregada de oito fragmentos.'}
];
const sellers = [
  {name:'Henrique',whatsapp:'5573999070479',routing_order:1},
  {name:'Sergio',whatsapp:'5573988307382',routing_order:2},
  {name:'Marcos',whatsapp:'5573991643483',routing_order:3}
];
const quoteExamples = [
  {format:'texto',customer:'',cnpj:'',items:[
    {qty:220,unit:'PC',description:'PARAFUSO CABECA SEXT. A.C 3/8 X 2 UNC / RT'},
    {qty:300,unit:'PC',description:'PORCA SEXT. A/C 3/8 UNC'},
    {qty:95,unit:'PC',description:'PARAFUSO CABECA SEXT. A.C 1/2 X 1.1/2 UNC / RT'}]},
  {format:'texto',customer:'Naturaves',cnpj:'11.727.497/0001-60',items:[
    {qty:10,unit:'UN',description:'disco flap grão 80'}, {qty:5,unit:'UN',description:'disco de corte inox 7 polegadas'},
    {qty:4,unit:'UN',description:'parafuso inox 10mm x 100mm rosca parcial'}, {qty:4,unit:'UN',description:'porca auto travante 10mm'}]},
  {format:'texto',customer:'Juscimar',cnpj:'',items:[
    {qty:1,unit:'UN',description:'chave catraca para soquete 3/8'}, {qty:1,unit:'UN',description:'extensão para soquete 3/8'},
    {qty:2,unit:'UN',description:'chave combinada 17mm'}, {qty:1,unit:'UN',description:'chave grifo 10 polegadas'},
    {qty:1,unit:'UN',description:'régua/sarrafo de alumínio de 2 metros'}]},
  {format:'regra_especial',customer:'',cnpj:'',items:[
    {qty:100,unit:'M',description:'cabo flexível 2,5 mm azul'}, {qty:100,unit:'M',description:'cabo flexível 2,5 mm preto'},
    {qty:100,unit:'M',description:'cabo flexível 2,5 mm verde'}],note:'A expressão “100 M CADA” aplica a quantidade a cada variação entre parênteses.'}
];
const sourceDocuments = [
  {id:'685776',type:'cotacao_pdf',date:'2026-07-23',company:'Santa Cruz Açúcar e Álcool Ltda',cnpj:'00.738.822/0002-55',items:[
    {code:'373',request:'1036222',qty:300,unit:'PC',description:'PARAFUSO CABECA SEXT. A.C 3/8 X 2 UNC / RT'},
    {code:'474',request:'1036220',qty:200,unit:'PC',description:'PORCA SEXT. A/C 1/2 UNC'},
    {code:'16688',request:'1036224',qty:300,unit:'PC',description:'PORCA SEXT. A/C 3/8 UNC'},
    {code:'138868',request:'1036216',qty:200,unit:'UN',description:'PARAFUSO CABECA SEXT. A.C 1/2 X 1.1/2 UNC / RT'}]},
  {id:'686574',type:'cotacao_pdf',date:'2026-07-28',company:'Santa Cruz Açúcar e Álcool Ltda',cnpj:'00.738.822/0002-55',items:[
    {code:'2493',request:'1025340',qty:2,unit:'PC',description:'TRENA C/ 05 MTS STARRETT'}]},
  {id:'684910',type:'cotacao_pdf',date:'2026-07-22',company:'Santa Cruz Açúcar e Álcool Ltda',cnpj:'00.738.822/0002-55',items:[
    {code:'2648',request:'1034726',qty:4,unit:'PC',description:'VASSOURAO DE PIACAVA'},
    {code:'4286',request:'1034728',qty:4,unit:'PC',description:'VASSOURA DE PELO'}]},
  {id:'352918',type:'ordem_compra_pdf',date:'2026-06-16',company:'Santa Cruz Açúcar e Álcool Ltda',supplier:'Macedo Cedro Comercial de Ferragens',items:[
    {code:'4968',qty:15,unit:'UN',description:'CATALISADOR P/ ADESIVO LAMINACAO'},
    {code:'6237',qty:2,unit:'LT',description:'THINNER 2 LT'},
    {code:'39107',qty:15,unit:'UN',description:'ADESIVO P/LAMINACAO DE FIBRA MEKOL 900G'}]}
];
const projectKnowledge = [
  {topic:'missao',content:'Unificar catálogo, atendimento inteligente, leitura de orçamentos, orçamento persistente e encaminhamento para vendedores.'},
  {topic:'catalogo_atual',content:`${products.length} registros únicos carregados dos oito fragmentos oficiais; expansão futura para mais de 10.000 itens.`},
  {topic:'formatos_entrada',content:'TXT, CSV, JSON, XLS/XLSX, PDF com texto, PDF digitalizado, imagem, captura de tela e texto livre.'},
  {topic:'fluxo_orcamento',content:'Extrair metadados e itens; normalizar unidades e abreviações; buscar correspondências; calcular confiança; consolidar repetidos; revisar; adicionar ao orçamento; encaminhar ao vendedor.'},
  {topic:'campos_produto',content:'SKU/código interno, SKU original, descrição, referência do fabricante, marca, categoria, aplicação, tags, texto pesquisável e estados de preço/estoque/garantia.'},
  {topic:'busca',content:'Busca por nome, marca, SKU, referência, categoria, aplicação, medida, voltagem, erro de digitação, abreviação e intenção do serviço.'},
  {topic:'estado_atual',content:'Núcleo funciona localmente no navegador e não depende de IA terceirizada para busca básica, interpretação de intenções e fallback seguro.'}
];

const logicFiles = [
  'next/app.js','next/customer-v2.js','next/catalog-loader.js','next/catalog-runtime-fix.js',
  'next/quote-reader-v4.js','next/assistant-clean-v5.js','next/brand-v3.js'
].filter(exists);
const logicManifest = [];
for (const file of logicFiles) {
  const source = read(file);
  const dest = path.join(OUT, 'logic', path.basename(file));
  fs.writeFileSync(dest, source);
  logicManifest.push({file,exported_as:`logic/${path.basename(file)}`,bytes:Buffer.byteLength(source),sha256:sha256(source)});
}

const core = {
  manifest:{
    package_name:'TEM TUDO — Núcleo do Assistente e Base de Conhecimento',
    version:'2026-08-05', generated_at:new Date().toISOString(), visual_layout_included:false,
    repository:'henrique751/henrique751', product_count:products.length,
    contents:['catálogo oficial','regras do assistente','abreviações','correções de digitação','unidades','políticas','exemplos de orçamento','fontes documentais','vendedores','código lógico sem layout']
  },
  business:{name:'TEM TUDO',city:'Eunápolis',state:'BA',instagram:'@temtudomaquinas',catalog_target:10000},
  schema:{product_fields:Object.keys(products[0]||{}),quote_item_fields:['qty','unit','description','matched_sku','confidence','source'],document_metadata_fields:['customer','company','cnpj','quote_number','date','source_file']},
  products, aliases, typo_rules:typoRules, units, policies, sellers, quote_examples:quoteExamples,
  source_documents:sourceDocuments, project_knowledge:projectKnowledge,
  source_manifests:{catalog:catalogSources,logic:logicManifest}
};

const json = JSON.stringify(core, null, 2);
fs.writeFileSync(path.join(OUT, 'TEM_TUDO_ASSISTENTE_CORE.json'), json);
fs.writeFileSync(path.join(OUT, 'catalogo.csv'), [
  'sku;sku_original;nome;referencia;marca;categoria;codigo_categoria;preco;estoque;garantia',
  ...products.map(p => [p.sku,p.original_sku,p.name,p.reference,p.brand,p.category,p.category_code,'','consultar','consultar fonte oficial']
    .map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(';'))
].join('\n'));

const readme = `# TEM TUDO — Núcleo do Assistente\n\nBackup técnico gerado em 05/08/2026. Não inclui HTML, CSS, logo, mascote nem outros elementos visuais.\n\n## Conteúdo\n- TEM_TUDO_ASSISTENTE_CORE.sqlite: banco relacional portátil.\n- TEM_TUDO_ASSISTENTE_CORE.json: exportação integral legível por sistemas.\n- catalogo.csv: catálogo tabular.\n- logic/: código de busca, assistente, catálogo e leitor de orçamentos, sem layout.\n- manifest.json: hashes e contagens para verificação.\n\n## Regras essenciais\n- Não inventar preço, estoque, garantia ou especificação.\n- Somar produtos repetidos.\n- Pedir esclarecimento quando a correspondência for ambígua.\n- Diferenciar metadados empresariais dos itens do orçamento.\n- Usar código/referência como sinais de alta confiança.\n\nProdutos exportados: ${products.length}.\n`;
fs.writeFileSync(path.join(OUT,'README.md'),readme);
fs.writeFileSync(path.join(OUT,'manifest.json'),JSON.stringify({
  generated_at:core.manifest.generated_at, products:products.length, catalog_sources:catalogSources,
  logic_sources:logicManifest, core_json_sha256:sha256(json)
},null,2));
console.log(JSON.stringify({out:OUT,products:products.length,logic_files:logicFiles.length},null,2));
