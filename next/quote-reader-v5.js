(()=>{
'use strict';
const UNIT='un|und|unid|unidade|unidades|pc|pcs|pç|pçs|peca|pecas|mt|m|metro|metros|kg|g|gr|lt|l|cx|caixa|jogo|jg|kit|rl|rolo';
const cnpjRe=/\b\d{2}[.]?\d{3}[.]?\d{3}[\/]\d{4}-?\d{2}\b/;
const junk=/^(?:cnpj|cpf|empresa|cotacao|cotação|data|fornecedor|endereco|endereço|cidade|bairro|cep|contato|fone|fax|email|status|codigo|código|descricao|descrição|material|marca|original|seq|sequencia|sequência|loc|grupo|itens?|quantidade|und|unid|qtde|total|observacao|observação|condicoes|condições|frete|desconto|pagina|página|valor|vlr|icms|ipi|prazo|aprovador|comprador)\b/i;
const norm=s=>(s||'').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[“”″]/g,'"').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
const clean=s=>(s||'').replace(/^\s*[•·▪◦*-]+\s*/,'').replace(/^\s*\d{1,3}\s*[-.)]\s*/,'').replace(/\s+-\s*$/,'').replace(/\s+/g,' ').trim();
const canonical=s=>norm(s).replace(new RegExp('\\b(?:'+UNIT+')\\b','g'),' ').replace(/[^a-z0-9/.,"'x-]+/g,' ').replace(/\s+/g,' ').trim();
function metadata(text){
 const cnpj=(text.match(cnpjRe)||[])[0]||'';
 const name=(text.match(/(?:em nome de|orça(?:r|mento)? em nome d[aeo]|cliente\s*[:\-])\s*([^\n]+)/i)||[])[1]?.trim()||'';
 const quote=(text.match(/(?:cotacao|cotação|grupo de cotacao|grupo de cotação|ordem de compra)\s*(?:n[ºo.]*)?\s*[:\-]?\s*(\d{4,})/i)||[])[1]||'';
 return{cnpj,name,quote};
}
function parseQuantity(line){
 let m=line.match(new RegExp('^\\s*(\\d+(?:[.,]\\d+)?)\\s*(?:'+UNIT+')?\\s*(?:x|[-–—:])?\\s+(.+)$','i'));
 if(m)return{qty:Number(m[1].replace(',','.')),unit:(line.match(new RegExp('^\\s*\\d+(?:[.,]\\d+)?\\s*('+UNIT+')\\b','i'))||[])[1]||'',desc:m[2]};
 m=line.match(new RegExp('^\\s*(?:'+UNIT+')\\s*(\\d+(?:[.,]\\d+)?)\\s+(.+)$','i'));
 if(m)return{qty:Number(m[1].replace(',','.')),unit:'',desc:m[2]};
 return{qty:1,unit:'',desc:line};
}
function parseTable(line){
 let m=line.match(/^\s*(?:\d+\s+){1,4}(.+?)\s+(\d+(?:[.,]\d+)?)\s+(UN|PC|PÇ|MT|M|KG|LT|RL)\b/i);
 if(m)return{qty:Number(m[2].replace(',','.')),unit:m[3],desc:m[1]};
 m=line.match(/^\s*(?:\d+\s*[-.)]?\s*)?(.+?)\s+(UN|PC|PÇ|MT|M|KG|LT|RL)\s+(\d+(?:[.,]\d+)?)\s*$/i);
 if(m)return{qty:Number(m[3].replace(',','.')),unit:m[2],desc:m[1]};
 return null;
}
function splitSpecial(line){
 const each=line.match(/^\s*(\d+(?:[.,]\d+)?)\s*(?:m|mt|metros?)?\s*cada\s+(.+?)\s*\(([^)]+)\)\s*$/i);
 if(each){const qty=Number(each[1].replace(',','.'));return each[3].split(/[\/;,]+/).map(v=>({qty,unit:'M',desc:`${each[2].trim()} ${v.trim()}`}));}
 const kit=line.match(/^(?:\d+\s*)?(?:kit de )?martelos?\s*\(([^)]+)\)/i);
 if(kit)return kit[1].split(',').map(x=>({qty:1,unit:'UN',desc:x.trim()}));
 return null;
}
function extract(text){
 const raw=String(text||'').replace(/\r/g,'\n');const meta=metadata(raw);const rows=[];
 raw.split(/\n+/).forEach((source,index)=>{
  let line=source.replace(/[•▪◦]/g,' ').replace(/\t+/g,' ').replace(/\s{2,}/g,' ').trim();
  if(!line||line==='-'||cnpjRe.test(line)||junk.test(line)||/^(?:em nome de|orça(?:r|mento)? em nome)/i.test(line))return;
  const special=splitSpecial(line);if(special){special.forEach(x=>rows.push({...x,source:line,index}));return;}
  const parsed=parseTable(line)||parseQuantity(line);
  let desc=clean(parsed.desc).replace(/\b(?:ativo|aprovado)\b.*$/i,'').replace(/\s+\d{5,}\s*$/,'').trim();
  if(!desc||desc.length<3||junk.test(desc)||/^\d+$/.test(desc))return;
  rows.push({qty:parsed.qty||1,unit:parsed.unit||'',desc,source:line,index});
 });
 const merged=new Map();
 rows.forEach(item=>{
  const matches=typeof window.searchProducts==='function'?window.searchProducts(item.desc,4):[];
  const key=matches[0]?.sku?`sku:${matches[0].sku}`:`txt:${canonical(item.desc)}`;
  const prev=merged.get(key);
  if(prev){prev.qty+=item.qty;prev.sources.push(item.source)}else merged.set(key,{...item,matches,sources:[item.source]});
 });
 return{meta,items:[...merged.values()]};
}
window.TTQuoteReader={extract};
window.parseLines=text=>extract(text).items.map((x,i)=>({id:`qr${Date.now()}-${i}`,original:x.source,line:x.source,qty:x.qty,desc:x.desc,matches:x.matches||[],selected:x.matches?.[0]?.sku||'',checked:true}));
function renderReview(result,host){
 const matched=result.items.filter(x=>x.matches?.[0]);const unmatched=result.items.length-matched.length;const total=result.items.reduce((s,x)=>s+x.qty,0);
 host.innerHTML=`<div class="quote-review"><div class="quote-review-head"><div><h3>Pedido identificado</h3><p>Revise antes de adicionar ao orçamento.</p></div></div>${(result.meta.name||result.meta.cnpj||result.meta.quote)?`<div class="quote-meta-chips">${result.meta.name?`<span>Cliente: ${escapeHtml(result.meta.name)}</span>`:''}${result.meta.cnpj?`<span>CNPJ: ${escapeHtml(result.meta.cnpj)}</span>`:''}${result.meta.quote?`<span>Cotação: ${escapeHtml(result.meta.quote)}</span>`:''}</div>`:''}<div class="quote-summary-bar"><div><b>${result.items.length}</b><small>produtos</small></div><div><b>${total}</b><small>quantidade total</small></div><div><b>${unmatched}</b><small>para confirmar</small></div></div><div class="quote-review-list">${result.items.map(x=>{const p=x.matches?.[0];return `<article class="quote-review-item"><div class="quote-qty">${x.qty}${x.unit?` ${escapeHtml(x.unit)}`:''}</div><div><h4>${escapeHtml(x.desc)}</h4>${p?`<small class="match-ok">Encontrado: ${escapeHtml(p.name)} · Cód. ${escapeHtml(p.sku)}</small>`:`<small class="match-warn">Sem correspondência segura</small>`}</div>${p?`<button data-smart-add="${escapeHtml(p.sku)}" data-smart-qty="${x.qty}">Adicionar</button>`:''}</article>`}).join('')}</div><div class="quote-actions"><button id="addAllSmart" class="btn primary">Adicionar encontrados</button><button id="clearSmartReview" class="btn secondary">Limpar</button></div></div>`;
 host.querySelectorAll('[data-smart-add]').forEach(b=>b.onclick=()=>{addQuote(b.dataset.smartAdd,Number(b.dataset.smartQty));b.disabled=true;b.textContent='Adicionado'});
 host.querySelector('#addAllSmart').onclick=()=>{host.querySelectorAll('[data-smart-add]:not(:disabled)').forEach(b=>b.click());toast('Produtos encontrados adicionados ao orçamento')};
 host.querySelector('#clearSmartReview').onclick=()=>{host.innerHTML=''};
}
function install(){
 const side=document.querySelector('.assistant-side');const upload=document.querySelector('.upload-card');if(!side||!upload||document.querySelector('.assistant-tools'))return;
 side.insertAdjacentHTML('afterbegin','<div class="assistant-intro"><img data-tt-logo alt="TEM TUDO"><div><strong>Como deseja enviar o pedido?</strong><span>Escreva, cole uma lista ou envie um arquivo.</span></div></div>');
 const tools=document.createElement('div');tools.className='assistant-tools';tools.innerHTML=`<section class="assistant-tool paste-order"><h3>Colar ou digitar</h3><p>WhatsApp, lista, cotação ou texto copiado.</p><textarea id="smartQuoteText" placeholder="Ex.: 10 discos flap grão 80&#10;5 discos de corte inox 7&quot;"></textarea><button id="analyzeSmartQuote" class="btn primary full">Analisar pedido</button><div id="smartQuoteResult"></div></section><section class="assistant-tool file-order"><h3>Enviar arquivo</h3><p>PDF, planilha, foto ou arquivo de texto.</p><label for="fileInput" class="btn secondary full">Escolher arquivo</label><div id="cleanFileStatus" class="file-status"></div></section>`;
 side.appendChild(tools);tools.querySelector('.file-order').appendChild(document.querySelector('#fileInput'));
 document.querySelector('#analyzeSmartQuote').onclick=()=>{const text=document.querySelector('#smartQuoteText').value.trim();const host=document.querySelector('#smartQuoteResult');if(!text){host.innerHTML='<p class="quote-warning">Cole ou digite o pedido primeiro.</p>';return}const result=extract(text);if(!result.items.length){host.innerHTML='<p class="quote-warning">Não consegui identificar produtos. Revise o texto ou envie o arquivo.</p>';return}renderReview(result,host)};
 const oldStatus=document.querySelector('#fileStatus');const newStatus=document.querySelector('#cleanFileStatus');if(oldStatus&&newStatus){const observer=new MutationObserver(()=>newStatus.innerHTML=oldStatus.innerHTML);observer.observe(oldStatus,{childList:true,subtree:true,characterData:true})}
 const logo=document.querySelector('.assistant-intro img');if(window.TT_ASSET_0){logo.src=window.TT_ASSET_0}else logo.style.display='none';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,50));else setTimeout(install,50);
})();
