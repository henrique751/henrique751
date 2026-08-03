(function(){
'use strict';
const SUPPORTED=['text/plain','text/csv','application/csv','application/json','application/pdf','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/png','image/jpeg','image/webp'];
const MAX_FILE=20*1024*1024;
const MAX_FILES=8;
const libs={};

function el(tag,attrs={},html=''){
  const n=document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{
    if(k==='class') n.className=v;
    else if(k==='text') n.textContent=v;
    else if(k.startsWith('data-')) n.setAttribute(k,v);
    else n[k]=v;
  });
  if(html) n.innerHTML=html;
  return n;
}
function humanSize(bytes){
  if(bytes<1024) return `${bytes} B`;
  if(bytes<1024*1024) return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/1024/1024).toFixed(1)} MB`;
}
function normalizeText(text){
  return String(text||'')
    .replace(/\u00a0/g,' ')
    .replace(/[\t ]+/g,' ')
    .replace(/\r/g,'')
    .replace(/\n{3,}/g,'\n\n')
    .trim();
}
function loadScript(url,key){
  if(libs[key]) return libs[key];
  libs[key]=new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src=url; s.async=true; s.onload=resolve; s.onerror=()=>reject(new Error(`Falha ao carregar ${key}`));
    document.head.appendChild(s);
  });
  return libs[key];
}
async function readText(file){
  return normalizeText(await file.text());
}
async function readJson(file){
  const data=JSON.parse(await file.text());
  const rows=Array.isArray(data)?data:[data];
  return normalizeText(rows.map((row,i)=>{
    if(row&&typeof row==='object') return `${i+1}. `+Object.entries(row).map(([k,v])=>`${k}: ${v}`).join(' | ');
    return `${i+1}. ${row}`;
  }).join('\n'));
}
function csvToText(raw){
  const lines=String(raw||'').replace(/\r/g,'').split('\n').filter(x=>x.trim());
  if(!lines.length) return '';
  const delimiter=(lines[0].match(/;/g)||[]).length>(lines[0].match(/,/g)||[]).length?';':',';
  const parse=line=>{
    const out=[]; let cur=''; let quoted=false;
    for(let i=0;i<line.length;i++){
      const c=line[i];
      if(c==='"'&&line[i+1]==='"'&&quoted){cur+='"';i++;continue;}
      if(c==='"'){quoted=!quoted;continue;}
      if(c===delimiter&&!quoted){out.push(cur.trim());cur='';continue;}
      cur+=c;
    }
    out.push(cur.trim()); return out;
  };
  const head=parse(lines[0]);
  return normalizeText(lines.slice(1).map((line,i)=>{
    const cells=parse(line);
    return `${i+1}. `+cells.map((v,j)=>`${head[j]||`campo ${j+1}`}: ${v}`).filter(x=>!x.endsWith(': ')).join(' | ');
  }).join('\n'));
}
async function readCsv(file){return csvToText(await file.text());}
async function readXlsx(file){
  await loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js','xlsx');
  if(!window.XLSX) throw new Error('Leitor de planilhas indisponível');
  const buf=await file.arrayBuffer();
  const wb=window.XLSX.read(buf,{type:'array',cellDates:true});
  const parts=[];
  wb.SheetNames.forEach(name=>{
    const rows=window.XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:''});
    if(!rows.length) return;
    parts.push(`PLANILHA: ${name}`);
    const head=rows[0].map((x,i)=>String(x||`campo ${i+1}`).trim());
    rows.slice(1).forEach((row,i)=>{
      const text=row.map((v,j)=>`${head[j]}: ${String(v).trim()}`).filter(x=>!x.endsWith(': ')).join(' | ');
      if(text) parts.push(`${i+1}. ${text}`);
    });
  });
  return normalizeText(parts.join('\n'));
}
async function readPdf(file,onProgress){
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs','pdfjs');
  if(!window.pdfjsLib){
    const mod=await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs');
    window.pdfjsLib=mod;
  }
  const pdfjs=window.pdfjsLib;
  if(pdfjs.GlobalWorkerOptions) pdfjs.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
  const pdf=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;
  const pages=[];
  for(let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i);
    const content=await page.getTextContent();
    pages.push(`PÁGINA ${i}\n${content.items.map(x=>x.str).join(' ')}`);
    onProgress&&onProgress(Math.round(i/pdf.numPages*100));
  }
  const text=normalizeText(pages.join('\n\n'));
  if(text.replace(/\s/g,'').length<20) throw new Error('PDF sem texto detectável. Envie uma imagem mais nítida ou aguarde OCR por imagem.');
  return text;
}
async function readImage(file,onProgress){
  await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js','tesseract');
  if(!window.Tesseract) throw new Error('OCR local indisponível');
  const result=await window.Tesseract.recognize(file,'por',{
    logger:m=>{if(m.status==='recognizing text'&&onProgress) onProgress(Math.round((m.progress||0)*100));}
  });
  const text=normalizeText(result&&result.data&&result.data.text);
  if(!text) throw new Error('Não foi possível identificar texto nesta imagem.');
  return text;
}
async function extract(file,onProgress){
  const name=file.name.toLowerCase();
  if(file.size>MAX_FILE) throw new Error('Arquivo maior que 20 MB');
  if(file.type==='application/json'||name.endsWith('.json')) return readJson(file);
  if(file.type==='text/csv'||file.type==='application/csv'||name.endsWith('.csv')) return readCsv(file);
  if(file.type.includes('spreadsheet')||file.type==='application/vnd.ms-excel'||/\.(xlsx|xls)$/.test(name)) return readXlsx(file);
  if(file.type==='application/pdf'||name.endsWith('.pdf')) return readPdf(file,onProgress);
  if(file.type.startsWith('image/')||/\.(png|jpe?g|webp)$/.test(name)) return readImage(file,onProgress);
  if(file.type.startsWith('text/')||/\.(txt|md|log)$/.test(name)) return readText(file);
  throw new Error('Formato ainda não suportado');
}
function guessLines(text){
  const raw=normalizeText(text);
  const lines=raw.split('\n').map(x=>x.trim()).filter(Boolean);
  const itemish=lines.filter(line=>/\b\d{1,4}\s*(x|un|und|unidade|unidades|pc|pcs|kg|m|mt|cx|caixa)?\b/i.test(line)||/\b(sku|ref\.?|refer[eê]ncia|descri[cç][aã]o|produto|quantidade|qtd)\b/i.test(line));
  return itemish.length?itemish.join('\n'):raw;
}
function init(){
  const form=document.getElementById('chatForm');
  const input=document.getElementById('chatInput');
  const panel=document.getElementById('chatPanel');
  if(!form||!input||!panel||form.dataset.importV3==='1') return;
  form.dataset.importV3='1';
  form.classList.add('tt-import-ready');
  const button=el('button',{type:'button',class:'tt-import-button',title:'Anexar orçamento','aria-label':'Anexar orçamento'},'📎');
  const fileInput=el('input',{type:'file',class:'tt-import-input',multiple:true,accept:'.txt,.csv,.json,.pdf,.xls,.xlsx,.png,.jpg,.jpeg,.webp'});
  form.insertBefore(button,form.firstChild);
  form.appendChild(fileInput);
  let modal=null;
  const state={files:[],texts:[]};

  function close(){if(modal){modal.remove();modal=null;}}
  function render(){
    close();
    modal=el('section',{class:'tt-import-panel','aria-label':'Importar orçamento'});
    const head=el('div',{class:'tt-import-head'});
    const title=el('div',{},'<h3>Importar orçamento</h3><p>TXT, CSV, Excel, PDF e imagens. O processamento ocorre no navegador.</p>');
    const x=el('button',{type:'button',class:'tt-import-close','aria-label':'Fechar'},'✕');
    x.onclick=close; head.append(title,x);
    const drop=el('div',{class:'tt-import-drop'},'<strong>Arraste arquivos ou toque para selecionar</strong><span>Até 8 arquivos de 20 MB cada.</span>');
    drop.onclick=()=>fileInput.click();
    ['dragenter','dragover'].forEach(e=>drop.addEventListener(e,ev=>{ev.preventDefault();drop.classList.add('is-drag');}));
    ['dragleave','drop'].forEach(e=>drop.addEventListener(e,ev=>{ev.preventDefault();drop.classList.remove('is-drag');}));
    drop.addEventListener('drop',e=>acceptFiles([...e.dataTransfer.files]));
    const list=el('div',{class:'tt-import-files'});
    state.files.forEach((row,i)=>{
      const item=el('div',{class:'tt-import-file'});
      const left=el('div',{},`<strong>${row.file.name.replace(/[<>]/g,'')}</strong><small>${humanSize(row.file.size)}${row.progress?` · ${row.progress}%`:''}</small>`);
      const status=el('span',{class:`tt-import-status ${row.status==='ok'?'ok':row.status==='error'?'error':'warn'}`,text:row.message||row.status});
      item.append(left,status); list.appendChild(item);
    });
    const preview=el('div',{class:'tt-import-preview'});
    const text=state.texts.map((x,i)=>`ARQUIVO ${i+1}: ${x.name}\n${x.text}`).join('\n\n');
    const area=el('textarea',{value:text,placeholder:'O texto reconhecido aparecerá aqui...'});
    const actions=el('div',{class:'tt-import-actions'});
    const use=el('button',{type:'button',class:'tt-import-primary',text:'Enviar ao assistente'});
    const copy=el('button',{type:'button',class:'tt-import-secondary',text:'Copiar texto'});
    const clear=el('button',{type:'button',class:'tt-import-light',text:'Limpar'});
    use.disabled=!text;
    use.onclick=()=>{
      const prepared=guessLines(area.value);
      input.value=`Analise este orçamento e identifique produtos, quantidades, referências e itens ambíguos. Não invente correspondências.\n\n${prepared}`;
      close(); input.focus();
      form.requestSubmit();
    };
    copy.onclick=async()=>{try{await navigator.clipboard.writeText(area.value);copy.textContent='Copiado';}catch(_){area.select();document.execCommand('copy');}};
    clear.onclick=()=>{state.files=[];state.texts=[];render();};
    actions.append(use,copy,clear);
    preview.append(area,actions,el('p',{class:'tt-import-note',text:'PDFs e imagens podem demorar mais. Antes de enviar, revise o texto reconhecido. Preço e estoque sempre serão confirmados por um vendedor.'}));
    modal.append(head,drop,list,preview);
    panel.appendChild(modal);
  }
  async function acceptFiles(files){
    const incoming=files.slice(0,Math.max(0,MAX_FILES-state.files.length));
    incoming.forEach(file=>state.files.push({file,status:'aguardando',message:'Aguardando',progress:0}));
    render();
    for(const row of state.files.filter(x=>x.status==='aguardando')){
      row.status='processando'; row.message='Processando'; render();
      try{
        const text=await extract(row.file,p=>{row.progress=p; if(p%10===0) render();});
        row.status='ok'; row.message='Concluído'; row.progress=100;
        state.texts.push({name:row.file.name,text});
      }catch(err){row.status='error';row.message=err.message||'Falha';}
      render();
    }
  }
  fileInput.addEventListener('change',e=>{acceptFiles([...e.target.files]);e.target.value='';});
  button.onclick=render;
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();