(()=>{
'use strict';
const unitWords='un|und|unid|unidade|unidades|pc|pcs|pç|pçs|peca|pecas|mt|m|metro|metros|kg|g|gr|lt|l|cx|caixa|jogo|jg|kit';
const junk=/^(?:cnpj|cpf|empresa|cotacao|cotação|data|fornecedor|endereco|endereço|cidade|bairro|cep|contato|fone|fax|email|status|codigo|código|descricao|descrição|material|marca|original|seq|sequencia|sequência|loc|grupo|itens?|quantidade|und|unid|qtde|total|observacao|observação|condicoes|condições|frete|desconto|pagina|página)\b/i;
const cnpjRe=/\b\d{2}[.]?\d{3}[.]?\d{3}[\/]\d{4}-?\d{2}\b/;
const normalize=s=>(s||'').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[“”″]/g,'"').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
const cleanDescription=s=>(s||'').replace(/^\s*[•·▪◦*-]+\s*/,'').replace(/^\s*\d{1,3}\s*[-.)]\s*/,'').replace(/\s+-\s*$/,'').replace(/\s+/g,' ').trim();
const canonical=s=>normalize(s).replace(/\b(?:un|und|unid|unidade|unidades|pc|pcs|pç|pçs|peca|pecas|mt|metro|metros)\b/g,' ').replace(/[^a-z0-9/.,"'x-]+/g,' ').replace(/\s+/g,' ').trim();
function metadata(text){
 const cnpj=(text.match(cnpjRe)||[])[0]||'';
 const name=(text.match(/(?:em nome de|orca(?:r|mento)? em nome d[aeo]|cliente\s*[:\-])\s*([^\n]+)/i)||[])[1]?.trim()||'';
 const quote=(text.match(/(?:cotacao|cotação|grupo de cotacao|grupo de cotação|ordem de compra)\s*(?:n[ºo.]*)?\s*[:\-]?\s*(\d{4,})/i)||[])[1]||'';
 return{cnpj,name,quote};
}
function normalizeLine(line){
 return line.replace(/[•▪◦]/g,' ').replace(/\t+/g,' ').replace(/\s{2,}/g,' ').trim();
}
function parseQty(line){
 let m=line.match(new RegExp('^\\s*(\\d+(?:[.,]\\d+)?)\\s*(?:'+unitWords+')?\\s*(?:x|[-–—:])?\\s+(.+)$','i'));
 if(m)return{qty:Number(m[1].replace(',','.')),desc:m[2].trim()};
 m=line.match(new RegExp('^\\s*(?:'+unitWords+')\\s*(\\d+(?:[.,]\\d+)?)\\s+(.+)$','i'));
 if(m)return{qty:Number(m[1].replace(',','.')),desc:m[2].trim()};
 return{qty:1,desc:line};
}
function parseTableLine(line){
 // ERP/cotação: códigos iniciais + descrição + quantidade/unidade no fim
 let m=line.match(/^\s*(?:\d+\s+){1,3}(.+?)\s+(\d+(?:[.,]\d+)?)\s+(UN|PC|PÇ|MT|M|KG|LT)\b/i);
 if(m)return{qty:Number(m[2].replace(',','.')),desc:m[1].trim()};
 // Linha com descrição seguida de quantidade decimal
 m=line.match(/^\s*(?:\d+\s*[-.)]?\s*)?(.+?)\s+(?:UN|PC|PÇ|MT|M|KG|LT)\s+(\d+(?:[.,]\d+)?)\s*$/i);
 if(m)return{qty:Number(m[2].replace(',','.')),desc:m[1].trim()};
 return null;
}
function splitSpecial(line){
 const each=line.match(/^\s*(\d+(?:[.,]\d+)?)\s*(?:m|mt|metros?)?\s*cada\s+(.+?)\s*\(([^)]+)\)\s*$/i);
 if(each){
  const qty=Number(each[1].replace(',','.'));const base=each[2].trim();
  return each[3].split(/[\/;,]+/).map(v=>({qty,desc:`${base} ${v.trim()}`}));
 }
 const kit=line.match(/^(?:\d+\s*)?(?:kit de )?martelos?\s*\(([^)]+)\)/i);
 if(kit)return kit[1].split(',').map(x=>({qty:1,desc:x.trim()}));
 return null;
}
function extract(text){
 const raw=String(text||'').replace(/\r/g,'\n');
 const meta=metadata(raw);const out=[];
 raw.split(/\n+/).forEach((rawLine,index)=>{
  let line=normalizeLine(rawLine);if(!line||line==='-'||cnpjRe.test(line)||junk.test(line))return;
  if(/^(?:em nome de|orca(?:r|mento)? em nome)/i.test(line))return;
  const special=splitSpecial(line);if(special){special.forEach(x=>out.push({...x,source:line,index}));return}
  const table=parseTableLine(line);let parsed=table||parseQty(line);
  let desc=cleanDescription(parsed.desc)
   .replace(/^\d+\s*[-.)]\s*/,'')
   .replace(/\b(?:ativo|aprovado)\b.*$/i,'')
   .replace(/\s+\d{5,}\s*$/,'')
   .trim();
  if(!desc||desc.length<3||junk.test(desc)||/^\d+$/.test(desc))return;
  out.push({qty:parsed.qty||1,desc,source:line,index});
 });
 const merged=new Map();
 out.forEach(item=>{
  const matches=typeof window.searchProducts==='function'?window.searchProducts(item.desc,3):[];
  const key=matches[0]?.sku?`sku:${matches[0].sku}`:`txt:${canonical(item.desc)}`;
  const prev=merged.get(key);
  if(prev){prev.qty+=item.qty;prev.sources.push(item.source)}
  else merged.set(key,{...item,matches,sources:[item.source]});
 });
 return{meta,items:[...merged.values()]};
}
window.TTQuoteReader={extract};
window.parseLines=function(text){
 return extract(text).items.map((x,i)=>({id:`qr${Date.now()}-${i}`,original:x.source,line:x.source,qty:x.qty,desc:x.desc,matches:x.matches||[],selected:x.matches?.[0]?.sku||'',checked:true}));
};
function installUI(){
 const upload=document.querySelector('.upload-card');if(!upload||document.querySelector('#smartQuoteText'))return;
 const box=document.createElement('div');box.className='smart-quote-box';box.innerHTML=`<h3>Colar pedido</h3><p>Cole uma lista do WhatsApp, texto de PDF ou conteúdo copiado de uma planilha. Itens repetidos serão somados.</p><textarea id="smartQuoteText" rows="7" placeholder="Ex.: 10 discos flap grão 80&#10;5 discos de corte inox 7&quot;"></textarea><button id="analyzeSmartQuote" class="btn primary full">Analisar pedido</button><div id="smartQuoteResult"></div>`;
 upload.appendChild(box);
 document.querySelector('#analyzeSmartQuote').onclick=()=>review(document.querySelector('#smartQuoteText').value);
}
function review(text){
 const result=extract(text),host=document.querySelector('#smartQuoteResult');
 if(!result.items.length){host.innerHTML='<p class="quote-warning">Nenhum item seguro foi identificado. Verifique o texto ou envie o arquivo original.</p>';return}
 host.innerHTML=`${result.meta.name||result.meta.cnpj||result.meta.quote?`<div class="quote-meta">${result.meta.name?`<b>Cliente:</b> ${result.meta.name}<br>`:''}${result.meta.cnpj?`<b>CNPJ:</b> ${result.meta.cnpj}<br>`:''}${result.meta.quote?`<b>Cotação:</b> ${result.meta.quote}`:''}</div>`:''}<div class="smart-items">${result.items.map((x,i)=>{const p=x.matches?.[0];return `<article><div><b>${x.qty}× ${escapeHtml(x.desc)}</b>${p?`<small>Correspondência: ${escapeHtml(p.name)} · Cód. ${escapeHtml(p.sku)}</small>`:'<small class="unmatched">Produto precisa de confirmação</small>'}</div>${p?`<button data-smart-add="${escapeHtml(p.sku)}" data-smart-qty="${x.qty}">Adicionar</button>`:''}</article>`}).join('')}</div><button id="addAllSmart" class="btn secondary full">Adicionar correspondências ao orçamento</button>`;
 host.querySelectorAll('[data-smart-add]').forEach(b=>b.onclick=()=>{addQuote(b.dataset.smartAdd,Number(b.dataset.smartQty));b.disabled=true;b.textContent='Adicionado'});
 host.querySelector('#addAllSmart').onclick=()=>{host.querySelectorAll('[data-smart-add]:not(:disabled)').forEach(b=>b.click());toast('Itens identificados adicionados ao orçamento')};
}
const style=document.createElement('style');style.textContent=`.smart-quote-box{margin-top:18px;padding-top:18px;border-top:1px solid #ddd}.smart-quote-box textarea{width:100%;border:1px solid #d7d7d7;border-radius:14px;padding:13px;font:inherit;resize:vertical;margin:8px 0 10px}.quote-meta{margin:14px 0;padding:12px;border-radius:12px;background:#f4f4f4;line-height:1.55}.smart-items{display:grid;gap:8px;margin:12px 0}.smart-items article{display:flex;gap:10px;align-items:center;justify-content:space-between;border:1px solid #e3e3e3;border-radius:12px;padding:10px;background:#fff}.smart-items small{display:block;color:#666;margin-top:4px}.smart-items .unmatched{color:#a65300}.smart-items button{border:0;border-radius:10px;background:#e07015;color:#fff;font-weight:700;padding:9px 11px}.smart-items button:disabled{background:#aaa}.quote-warning{color:#9a4600;background:#fff3e7;padding:10px;border-radius:10px}`;document.head.appendChild(style);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUI);else installUI();
})();