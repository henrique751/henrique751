(function(){
'use strict';
if(!window.TTChatCore || typeof P==='undefined' || typeof CM==='undefined' || typeof CI==='undefined') return;

const Core=window.TTChatCore;
const STORE_KEY='tt_assistant_v2_state';
const HISTORY_LIMIT=80;
const VERSION='20260731-1511';
const SYNONYMS={
  trem:['ferramenta','maquina','equipamento'],
  cortar:['corte','esmerilhadeira','serra','policorte','disco'],
  ferro:['metal','aco'],
  parede:['furadeira','martelete','perfuracao'],
  concreto:['impacto','martelete','broca concreto'],
  parafusar:['parafusadeira','chave impacto'],
  soldar:['solda','inversora','mig','eletrodo'],
  roça:['campo','jardinagem'],
  rocadeira:['roçadeira'],
  maquinha:['maquina'],
  furadera:['furadeira'],
  parafuzadeira:['parafusadeira'],
  esmerilhadera:['esmerilhadeira'],
  comprensor:['compressor']
};

const defaultState=()=>({
  version:VERSION,
  sessionId:'TT-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,7).toUpperCase(),
  startedAt:new Date().toISOString(),
  history:[],
  profile:{name:'',city:'',technicalLevel:'unknown',service:'',material:'',frequency:'',voltage:'',brandPreference:'',budget:'',preferences:''},
  flow:null,
  pendingProduct:null,
  pendingList:null,
  lastProducts:[],
  lastAddedSku:'',
  assignedSeller:null,
  retryMessage:'',
  knowledgeGaps:[]
});

function loadState(){
  try{
    const data=JSON.parse(localStorage.getItem(STORE_KEY)||'null');
    if(data && data.version===VERSION) return {...defaultState(),...data,profile:{...defaultState().profile,...(data.profile||{})}};
  }catch(_){}
  return defaultState();
}
let state=loadState();
let sending=false;
let controller=null;

function persist(){
  state.history=state.history.slice(-HISTORY_LIMIT);
  localStorage.setItem(STORE_KEY,JSON.stringify(state));
}
function storeMessage(role,text,meta={}){
  state.history.push({role,text:String(text||''),at:new Date().toISOString(),...meta});
  persist();
}
function escHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function storeHour(){
  try{
    return Number(new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',hour12:false,timeZone:'America/Bahia'}).format(new Date()));
  }catch(_){return new Date().getHours();}
}
function greeting(){return Core.greetingForHour(storeHour());}
function assignedSeller(){
  if(state.assignedSeller) return state.assignedSeller;
  const index=Number(localStorage.getItem('tt_seller')||0)%S.length;
  const row=S[index];
  localStorage.setItem('tt_seller',String(index+1));
  state.assignedSeller={name:row[0],phone:row[1]};
  persist();
  return state.assignedSeller;
}
function currentItems(){
  return cart.map(item=>{
    const p=findSku(item.s);
    return p?{name:p.name,sku:p.sku,ref:p.ref,quantity:item.q,brand:p.brand}:null;
  }).filter(Boolean);
}
function handoffText(){
  const s=assignedSeller();
  return Core.buildWhatsAppMessage({
    sellerName:s.name,
    customerName:state.profile.name,
    city:state.profile.city,
    service:state.profile.service,
    items:currentItems(),
    preferences:[
      state.profile.voltage&&`Tensão: ${state.profile.voltage}`,
      state.profile.brandPreference&&`Marca: ${state.profile.brandPreference}`,
      state.profile.budget&&`Faixa de orçamento: ${state.profile.budget}`,
      state.profile.preferences
    ].filter(Boolean).join(' | '),
    pending:'Confirmar preço, disponibilidade atual, prazo e condição comercial.',
    id:state.sessionId
  });
}
function handoffCard(){
  const s=assignedSeller();
  const href=`https://wa.me/${s.phone}?text=${encodeURIComponent(handoffText())}`;
  return `<div class="v2-handoff"><strong>Atendimento organizado para ${escHtml(s.name)}</strong><p>Revise a mensagem antes de enviar. O vendedor confirmará preço, disponibilidade e condições.</p><a href="${href}" target="_blank" rel="noopener">Continuar no WhatsApp</a></div>`;
}
function renderHistory(){
  CM.innerHTML='';
  state.history.slice(-30).forEach(m=>{
    if(m.role==='user') appendMessage('user',m.text,false,false);
    else appendMessage('bot',m.text,Boolean(m.html),false);
  });
}
function appendMessage(kind,text,html=false,save=true){
  const node=document.createElement('div');
  node.className=`message ${kind}`;
  if(html) node.innerHTML=text; else node.textContent=text;
  CM.appendChild(node);
  CM.scrollTop=CM.scrollHeight;
  if(save) storeMessage(kind==='user'?'user':'assistant',text,{html});
  return node;
}
function appendBot(text,html=''){
  if(html) return appendMessage('bot',`${escHtml(text)}${html}`,true,true);
  return appendMessage('bot',text,false,true);
}
function appendUser(text){return appendMessage('user',text,false,true);}
function typing(show=true){
  let node=CM.querySelector('.v2-typing');
  if(show && !node){
    node=document.createElement('div');
    node.className='message bot v2-typing';
    node.innerHTML='<span></span><span></span><span></span>';
    CM.appendChild(node); CM.scrollTop=CM.scrollHeight;
  }else if(!show && node) node.remove();
}
function setStatus(text){
  const hint=document.querySelector('.chat-hint');
  if(hint) hint.textContent=text||'Enter envia · Shift + Enter cria nova linha';
}
function greetOnce(){
  if(state.history.length) return;
  appendBot(`${greeting()}! Sou o Assistente TEM TUDO. Posso ajudar a encontrar um produto, escolher a ferramenta certa, comparar modelos, tirar dúvidas ou montar um orçamento. O que você precisa fazer?`);
}
function openChatV2(){
  CP.classList.add('open'); CO.classList.add('open'); document.body.classList.add('lock');
  renderHistory(); greetOnce();
  setTimeout(()=>CI.focus(),100);
}
function closeChatV2(){
  CP.classList.remove('open'); CO.classList.remove('open'); document.body.classList.remove('lock');
}
function resetConversation(){
  if(controller) controller.abort();
  state=defaultState();
  localStorage.removeItem(STORE_KEY);
  CM.innerHTML='';
  greetOnce();
  CI.focus();
}
function smartSearch(query,limit=6){
  const raw=String(query||'').trim();
  if(!raw) return [];
  return P.map(p=>[p,Core.scoreProduct(p,raw,SYNONYMS)])
    .filter(x=>x[1]>0)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,limit)
    .map(x=>x[0]);
}
function productCards(products,mode='select'){
  return `<div class="v2-products">${products.map((p,i)=>`<article class="v2-product">
    <div><strong>${escHtml(p.name)}</strong><span>${escHtml(p.brand)} · SKU ${escHtml(p.sku)}${p.ref?` · Ref. ${escHtml(p.ref)}`:''}</span><small>Consultar disponibilidade</small></div>
    <div class="v2-product-actions">
      <button type="button" data-v2-view="${escHtml(p.sku)}">Ver produto</button>
      <button type="button" data-v2-${mode}="${escHtml(p.sku)}">${mode==='add'?'Adicionar':'Selecionar'}</button>
    </div>
  </article>`).join('')}</div>`;
}
function updateQuickActions(){
  const chips=document.getElementById('chatChips');
  if(!chips) return;
  chips.innerHTML=[
    'Encontrar produto para um serviço',
    'Buscar por SKU ou referência',
    'Comparar produtos',
    'Como usar um produto',
    'Limpeza e manutenção',
    'Garantia e assistência',
    'Montar orçamento',
    'Falar com vendedor'
  ].map(x=>`<button type="button">${x}</button>`).join('');
  [...chips.querySelectorAll('button')].forEach(b=>b.onclick=()=>sendV2(b.textContent));
}
function exactProductFromText(text){
  const compact=Core.compact(text);
  const sku=P.find(p=>Core.compact(p.sku)===compact);
  if(sku) return sku;
  return P.find(p=>p.ref && Core.compact(p.ref)===compact)||null;
}
function extractSearchTerm(text){
  return String(text||'')
    .replace(/\b(tem|quero|preciso|procuro|buscar|busca|me mostra|gostaria de|voces tem|vocês têm|sku|ref\.?|referencia)\b/gi,' ')
    .replace(/\s+/g,' ').trim();
}
function isYes(q){return /^(sim|isso|correto|confirmo|pode|ok|certo|quero|adiciona|inclui|esse|essa)\b/.test(Core.normalize(q));}
function isNo(q){return /^(nao|n|errado|outro|outra|troca|cancela)\b/.test(Core.normalize(q));}
function setFlow(type,data={}){state.flow={type,...data};persist();}
function clearFlow(){state.flow=null;persist();}
function addConfirmedProduct(p,quantity=1){
  add(p,quantity);
  state.lastAddedSku=p.sku;
  state.pendingProduct=null;
  state.lastProducts=[p.sku];
  persist();
}
function parseList(text){
  const normalized=String(text||'').replace(/\r/g,'');
  let lines=normalized.split(/\n|;|,\s*(?=\d+\s|\w+\s)/).map(x=>x.trim()).filter(Boolean);
  if(lines.length<2 && /\be\b/i.test(normalized)) lines=normalized.split(/\s+e\s+/i).map(x=>x.trim()).filter(Boolean);
  const found=[],missing=[],ambiguous=[];
  for(const line of lines){
    let quantity=Core.parseQuantity(line,1);
    let term=line.replace(/^\s*\d+\s*(?:x|un|und|unidades?)?\s*/i,'').trim();
    const results=smartSearch(term,3);
    if(!results.length){missing.push({text:line});continue;}
    const top=results[0], topScore=Core.scoreProduct(top,term,SYNONYMS);
    const second=results[1]&&Core.scoreProduct(results[1],term,SYNONYMS);
    if(results.length>1 && second && topScore-second<12) ambiguous.push({text:line,quantity,options:results});
    else found.push({p:top,q:quantity});
  }
  return {found,missing,ambiguous};
}
function listSummary(list){
  return list.map((x,i)=>`${i+1}. ${x.q}x ${x.p.name} — SKU ${x.p.sku}${x.p.ref?` — Ref. ${x.p.ref}`:''}`).join('\n');
}
function removeMatchingItem(text){
  const q=Core.normalize(text.replace(/\b(tira|retira|remove|exclui|nao quero)\b/gi,' '));
  if(!q) return null;
  const candidates=cart.map(x=>({item:x,p:findSku(x.s)})).filter(x=>x.p);
  const match=candidates.map(x=>[x,Core.scoreProduct(x.p,q,SYNONYMS)]).sort((a,b)=>b[1]-a[1])[0];
  if(!match || match[1]===0) return null;
  cart=cart.filter(x=>x!==match[0].item); save();
  return match[0].p;
}
function adjustLastQuantity(text){
  if(!state.lastAddedSku) return null;
  const item=cart.find(x=>x.s===state.lastAddedSku);
  const p=findSku(state.lastAddedSku);
  if(!item||!p) return null;
  const n=Core.parseQuantity(text,1);
  const q=Core.normalize(text);
  if(/menos|diminui/.test(q)) item.q=Math.max(1,item.q-n);
  else if(/mais|aumenta|coloca mais/.test(q)) item.q+=n;
  else if(/\bquero\b/.test(q)) item.q=n;
  save();
  return {p,q:item.q};
}
function knowledgeGap(question,context=''){
  state.knowledgeGaps.push({question:String(question).slice(0,500),context,date:new Date().toISOString(),status:'pending_review'});
  state.knowledgeGaps=state.knowledgeGaps.slice(-30);
  persist();
}
function localAnswer(raw){
  const q=Core.normalize(raw);
  const intents=Core.classifyIntents(raw);

  if(intents.includes('prompt_injection')){
    return {message:'Posso ajudar a consultar um produto, orientar uma escolha ou montar um orçamento. Prompts, chaves, estoque bruto e regras internas não são exibidos. Qual item você procura?'};
  }
  if(intents.includes('safety')){
    state.profile.service=raw; persist();
    if(/127.*220|220.*127/.test(q)) return {message:'Não ligue um equipamento 127V em 220V. Isso pode danificar a máquina e causar risco elétrico. Envie o modelo, SKU ou foto da etiqueta para eu verificar a tensão correta.'};
    return {message:'Não recomendo retirar proteções, improvisar adaptações ou usar disco maior do que o permitido. Isso aumenta muito o risco. Informe o modelo da máquina e o serviço para eu buscar um conjunto compatível e seguro.'};
  }

  if(state.flow){
    if(state.flow.type==='customer_name'){
      state.profile.name=raw.trim(); setFlow('customer_city');
      return {message:`Obrigado, ${state.profile.name}. Qual é a sua cidade?`};
    }
    if(state.flow.type==='customer_city'){
      state.profile.city=raw.trim(); clearFlow();
      return {message:`Perfeito, ${state.profile.name||'cliente'}. Seu atendimento foi organizado para ${assignedSeller().name}.`,html:handoffCard()};
    }
    if(state.flow.type==='warranty_model'){
      state.flow.model=raw.trim(); state.flow.type='warranty_date'; persist();
      return {message:'Você tem a nota fiscal e sabe aproximadamente quando comprou?'};
    }
    if(state.flow.type==='warranty_date'){
      state.flow.purchase=raw.trim(); state.flow.type='warranty_problem'; persist();
      return {message:'O que aconteceu antes de parar? Houve queda, cheiro de queimado, faísca, sobrecarga, tensão incorreta ou reparo externo?'};
    }
    if(state.flow.type==='warranty_problem'){
      state.profile.service=`Pós-venda: ${state.flow.model}; compra: ${state.flow.purchase}; relato: ${raw.trim()}`;
      clearFlow(); setFlow('customer_name');
      return {message:'Não use novamente até uma avaliação, principalmente se houve cheiro de queimado, faísca ou aquecimento. A cobertura depende de análise e do termo do produto. Separe a nota fiscal e, se houver, o número de série. Qual é o seu nome para eu organizar o encaminhamento?'};
    }
    if(state.flow.type==='need_service'){
      state.profile.service=raw.trim(); clearFlow();
      return {message:'Em qual material será usado e com que frequência: ocasionalmente ou todos os dias?'};
    }
  }

  if(state.pendingList){
    if(isYes(raw)){
      state.pendingList.forEach(x=>addConfirmedProduct(x.p,x.q));
      const count=state.pendingList.length; state.pendingList=null; persist();
      return {message:`Salvei ${count} item(ns) no orçamento. Precisa acrescentar mais alguma coisa?`};
    }
    if(isNo(raw)){state.pendingList=null;persist();return {message:'Tudo bem. Envie a lista corrigida ou diga qual item precisa alterar.'};}
  }
  if(state.pendingProduct){
    if(isYes(raw)){
      const p=findSku(state.pendingProduct.sku),qty=state.pendingProduct.quantity||1;
      if(p) addConfirmedProduct(p,qty);
      return {message:`${p?`${qty}x ${p.name} foi adicionado ao orçamento.`:'O produto foi atualizado.'} Precisa de algo mais?`};
    }
    if(isNo(raw)){state.pendingProduct=null;persist();return {message:'Certo. Diga a marca, modelo, tensão, potência ou aplicação que você prefere.'};}
  }

  if(intents.includes('remove_item')){
    const p=removeMatchingItem(raw);
    return {message:p?`${p.name} foi removido do orçamento.`:'Não consegui identificar qual item deve ser removido. Diga o nome ou SKU do produto.'};
  }
  if(intents.includes('change_quantity')){
    const result=adjustLastQuantity(raw);
    if(result) return {message:`Quantidade atualizada: ${result.q}x ${result.p.name}.`};
  }

  if(intents.includes('warranty')){
    setFlow('warranty_model');
    return {message:'Vou ajudar a organizar o pós-venda. Qual é a marca e o modelo, SKU ou referência do produto?'};
  }
  if(intents.includes('seller')){
    if(!state.profile.name){setFlow('customer_name');return {message:'Claro. Antes de encaminhar, qual é o seu nome?'};}
    return {message:`Seu atendimento está com ${assignedSeller().name}.`,html:handoffCard()};
  }
  if(intents.includes('price')||intents.includes('stock')||intents.includes('delivery')){
    const related=state.lastProducts.map(findSku).filter(Boolean);
    if(related.length){
      const p=related[0];
      state.profile.service=`Confirmar preço, disponibilidade ou entrega de ${p.name} (SKU ${p.sku})`;
      return {message:`Encontrei ${p.name}, SKU ${p.sku}. O site não possui preço nem estoque em tempo real. A base é histórica, de 13/07/2026, e o vendedor precisa confirmar disponibilidade, valor, prazo e entrega. Quer adicionar ao orçamento?`};
    }
    return {message:'De qual produto você está falando? Envie o nome, SKU ou referência. O vendedor confirmará preço, disponibilidade, prazo e entrega.'};
  }
  if(intents.includes('photo')){
    knowledgeGap(raw,'photo_upload_requested');
    return {message:'Você pode enviar uma foto da etiqueta, marca, modelo, referência, medida, encaixe ou tensão. Pela aparência eu consigo levantar possibilidades, mas só confirmo o produto quando houver identificação suficiente.'};
  }
  if(intents.includes('cleaning')||intents.includes('storage')||intents.includes('maintenance')||intents.includes('usage')||intents.includes('compatibility')){
    const related=state.lastProducts.map(findSku).filter(Boolean);
    if(!related.length) return {message:'Para orientar com segurança, envie o modelo, SKU ou referência exata. Instruções específicas precisam vir do manual ou ficha oficial do produto.'};
    const p=related[0];
    if(intents.includes('compatibility')) return {message:`A marca ou a tensão sozinhas não confirmam compatibilidade. Para ${p.name}, preciso também da referência do acessório, bateria, disco, broca ou carregador que você pretende usar.`};
    return {message:`Para ${p.name}, a orientação específica precisa ser confirmada no manual do modelo. Como regra geral: desligue e desconecte antes de ajustes, use EPI, não remova proteções, mantenha ventilação livre, evite umidade e procure assistência em defeitos elétricos ou mecânicos.`};
  }
  if(intents.includes('quote')){
    if(cart.length){
      setFlow('customer_name');
      return {message:`Seu orçamento tem ${cart.reduce((a,x)=>a+x.q,0)} unidade(s). Antes de encaminhar ao vendedor, qual é o seu nome?`};
    }
    return {message:'Envie o primeiro produto ou cole uma lista, de preferência uma linha por item e com as quantidades. Vou localizar cada produto e confirmar ambiguidades antes de salvar.'};
  }
  if(intents.includes('compare')){
    const related=state.lastProducts.map(findSku).filter(Boolean);
    if(related.length>=2) return {message:'Posso comparar as opções encontradas por aplicação, tensão, medida e uso confirmado. Selecione até três produtos ou envie os SKUs que deseja comparar.',html:productCards(related.slice(0,3),'select')};
    return {message:'Envie os nomes, SKUs ou referências dos produtos que deseja comparar. Não comparo potência, compatibilidade ou desempenho sem dados confirmados do modelo exato.'};
  }
  if(/encontrar produto para um servico|nao sei o nome|um trem|uma maquina pra/.test(q)){
    setFlow('need_service');
    return {message:'O que você precisa fazer? Descreva o serviço do seu jeito — por exemplo, furar concreto, cortar ferro, montar móveis ou pintar.'};
  }

  const list=parseList(raw);
  if(list.found.length>=2 && list.ambiguous.length===0){
    state.pendingList=list.found; persist();
    const missing=list.missing.length?`\n\nNão localizei: ${list.missing.map(x=>x.text).join('; ')}.`:'';
    return {message:`Encontrei estes itens:\n\n${listSummary(list.found)}${missing}\n\nConfirma para salvar no orçamento?`};
  }
  if(list.ambiguous.length){
    const a=list.ambiguous[0];
    state.lastProducts=a.options.map(p=>p.sku); persist();
    return {message:`Encontrei mais de uma possibilidade para “${a.text}”. Escolha a opção correta:`,html:productCards(a.options,'select')};
  }

  const exact=exactProductFromText(extractSearchTerm(raw))||exactProductFromText(raw);
  const results=exact?[exact]:smartSearch(extractSearchTerm(raw)||raw,3);
  const relevant=results.filter(p=>Core.scoreProduct(p,raw,SYNONYMS)>=8);
  if(relevant.length){
    state.lastProducts=relevant.map(p=>p.sku); persist();
    if(relevant.length===1){
      const p=relevant[0],qty=Core.parseQuantity(raw,1);
      state.pendingProduct={sku:p.sku,quantity:qty};persist();
      return {message:`Encontrei ${p.name}, da ${p.brand}, SKU ${p.sku}${p.ref?`, referência ${p.ref}`:''}. É esse produto que você quer adicionar ao orçamento?`,html:productCards([p],'add')};
    }
    return {message:'Encontrei estas opções. Selecione a correta ou diga a aplicação, tensão, medida ou frequência de uso para eu filtrar melhor:',html:productCards(relevant,'select')};
  }

  if(intents.includes('greeting')) return {message:`${greeting()}! Você procura um produto, quer orientação técnica ou deseja montar um orçamento?`};

  knowledgeGap(raw,'no_local_match');
  return {message:'Não encontrei uma correspondência segura na base. Para não indicar algo errado, diga o serviço, material, tensão, medida, marca, SKU ou referência. Também posso registrar a dúvida para o vendedor verificar.'};
}

function validateAiPayload(data){
  if(!data || typeof data!=='object') return null;
  const message=typeof data.message==='string'?data.message.trim():'';
  if(!message) return null;
  return {
    message,
    intent:Array.isArray(data.intent)?data.intent.slice(0,8):[],
    product_ids:Array.isArray(data.product_ids)?data.product_ids.filter(x=>typeof x==='string').slice(0,3):[],
    quote_actions:Array.isArray(data.quote_actions)?data.quote_actions.slice(0,10):[],
    handoff:data.seller_handoff&&typeof data.seller_handoff==='object'?data.seller_handoff:null,
    knowledge_gap:data.knowledge_gap||null
  };
}
async function callAI(raw){
  const endpoint=window.TT_CONFIG&&String(window.TT_CONFIG.aiEndpoint||'').trim();
  if(!endpoint) return null;
  const products=smartSearch(raw,6);
  const body={
    message:raw,
    sessionId:state.sessionId,
    customer:state.profile.name,
    facts:state.profile,
    products,
    quote:currentItems(),
    history:state.history.slice(-12).map(x=>({role:x.role==='assistant'?'assistant':'user',content:x.text})),
    allowWebSearch:Boolean(exactProductFromText(raw) && /(manual|garantia|assistencia|compatib|especificacao|atual|hoje)/i.test(raw))
  };
  let lastError;
  for(let attempt=0;attempt<2;attempt++){
    controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),18000);
    try{
      const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
      const data=await response.json().catch(()=>({}));
      if(response.ok){
        const valid=validateAiPayload(data);
        if(valid) return valid;
        lastError=new Error('Resposta inválida');
      }else{
        lastError=new Error(data.error||`Erro ${response.status}`);
        if(response.status!==429 && response.status<500) break;
      }
    }catch(error){lastError=error;}
    finally{clearTimeout(timer);}
    await new Promise(r=>setTimeout(r,600*(attempt+1)));
  }
  console.warn('Assistente IA indisponível:',lastError);
  return null;
}
function applyAiActions(ai,raw){
  if(ai.knowledge_gap) knowledgeGap(raw,String(ai.knowledge_gap).slice(0,300));
  if(ai.product_ids.length){
    const products=ai.product_ids.map(findSku).filter(Boolean);
    if(products.length){state.lastProducts=products.map(p=>p.sku);persist();}
  }
  if(ai.handoff&&ai.handoff.required) return handoffCard();
  return ai.product_ids.length?productCards(ai.product_ids.map(findSku).filter(Boolean),'select'):'';
}
async function answerV2(raw){
  const local=localAnswer(raw);
  const endpoint=window.TT_CONFIG&&String(window.TT_CONFIG.aiEndpoint||'').trim();
  const localMustWin=Core.isPromptInjection(raw)||Core.isDangerous(raw)||state.flow||state.pendingProduct||state.pendingList||
    /vendedor|whats|garantia|orcamento|cotacao|remove|tira|coloca mais|quanto custa|estoque/i.test(raw);
  if(endpoint && !localMustWin){
    const ai=await callAI(raw);
    if(ai){
      const html=applyAiActions(ai,raw);
      return {message:ai.message,html};
    }
  }
  return local;
}
async function sendV2(text){
  const raw=String(text||'').trim();
  if(!raw || sending) return;
  sending=true;
  state.retryMessage=raw; persist();
  appendUser(raw);
  CI.value='';
  setStatus('Consultando catálogo...');
  typing(true);
  try{
    const reply=await answerV2(raw);
    typing(false);
    appendBot(reply.message,reply.html||'');
    state.retryMessage='';persist();
  }catch(error){
    typing(false);
    console.error(error);
    appendBot('Não consegui concluir a consulta agora, mas sua mensagem foi preservada. Você pode tentar novamente, pesquisar o catálogo ou falar com o vendedor já atribuído.',
      '<div class="v2-error-actions"><button type="button" data-v2-retry>Tentar novamente</button><button type="button" data-v2-handoff>Falar com vendedor</button></div>');
  }finally{
    sending=false; setStatus();
  }
}

document.addEventListener('click',event=>{
  const view=event.target.closest('[data-v2-view]');
  if(view){location.hash='#/produto/'+view.dataset.v2View;closeChatV2();return;}
  const select=event.target.closest('[data-v2-select]');
  if(select){
    const p=findSku(select.dataset.v2Select);
    if(p){state.pendingProduct={sku:p.sku,quantity:1};state.lastProducts=[p.sku];persist();appendBot(`Você selecionou ${p.name}, SKU ${p.sku}. Deseja adicionar uma unidade ao orçamento?`);}
    return;
  }
  const addButton=event.target.closest('[data-v2-add]');
  if(addButton){
    const p=findSku(addButton.dataset.v2Add);
    if(p){addConfirmedProduct(p,1);appendBot(`${p.name} foi adicionado ao orçamento. Precisa de outro item?`);}
    return;
  }
  if(event.target.closest('[data-v2-retry]')){sendV2(state.retryMessage);return;}
  if(event.target.closest('[data-v2-handoff]')){appendBot(`Seu atendimento está com ${assignedSeller().name}.`,handoffCard());return;}
});

try{
  openChat=openChatV2;
  closeChat=closeChatV2;
  send=sendV2;
  answer=answerV2;
}catch(_){
  window.openChat=openChatV2;
  window.closeChat=closeChatV2;
  window.send=sendV2;
  window.answer=answerV2;
}

document.querySelectorAll('[data-open-chat],[data-chat],[data-chat-product]').forEach(b=>b.onclick=()=>{openChatV2();if(b.dataset.chatProduct)sendV2('Quero informações sobre o SKU '+b.dataset.chatProduct);});
const form=document.getElementById('chatForm');
if(form) form.onsubmit=e=>{e.preventDefault();sendV2(CI.value);};
CI.onkeydown=e=>{
  if(e.key==='Enter'&&!e.shiftKey){
    e.preventDefault();sendV2(CI.value);
  }
};
const newChat=document.getElementById('newChat');
if(newChat) newChat.onclick=resetConversation;
if(CO) CO.onclick=closeChatV2;
const close=document.getElementById('closeChat');
if(close) close.onclick=closeChatV2;
updateQuickActions();

window.TT_ASSISTANT_V2={version:VERSION,getState:()=>JSON.parse(JSON.stringify(state)),send:sendV2,search:smartSearch,reset:resetConversation};
})();
