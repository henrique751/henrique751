(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.TTChatCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const normalize = value => String(value ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[“”"'`´]/g,'')
    .replace(/[^a-z0-9]+/g,' ').trim();

  const compact = value => normalize(value).replace(/\s+/g,'');

  function greetingForHour(hour){
    const h=Number(hour);
    if(h>=5 && h<12) return 'Bom dia';
    if(h>=12 && h<18) return 'Boa tarde';
    return 'Boa noite';
  }

  function classifyIntents(text){
    const q=normalize(text);
    const out=new Set();
    const add=(name,re)=>{ if(re.test(q)) out.add(name); };
    add('prompt_injection',/(ignore|ignora|esqueca|esquece).*(regra|instrucao|prompt)|mostra.*(prompt|chave|estoque bruto|todos os vendedores)|revela.*(segredo|regra interna)/);
    add('greeting',/^(oi|ola|opa|e ai|bom dia|boa tarde|boa noite)\b/);
    add('seller',/(vendedor|atendente|humano|pessoa|whats|zap|contato)/);
    add('quote',/(orcamento|cotacao|cotar|lista de material|fecha|fechar pedido)/);
    add('price',/(quanto custa|preco|valor|desconto|a vista|condicao)/);
    add('stock',/(tem no estoque|tem disponivel|pronta entrega|disponibilidade|chegou)/);
    add('delivery',/(entrega|retirada|manda pra|frete|prazo)/);
    add('warranty',/(garantia|assistencia|nota fiscal|defeito|queimou|parou|perdeu forca|troca)/);
    add('compatibility',/(serve|compativel|encaixa|qual bateria|qual disco|qual broca|qual carregador)/);
    add('compare',/(compar|diferenca|mais forte|mais barata|melhor|economica|robusta)/);
    add('usage',/(como usar|como liga|como montar|como regular|para que serve)/);
    add('cleaning',/(como limpar|posso lavar|limpeza|oleo)/);
    add('storage',/(como guardar|armazen|deixar bateria|umidade)/);
    add('maintenance',/(manutencao|lubrifica|trocar disco|trocar lamina|aquec|perde forca)/);
    add('safety',/(tirar.*protec|sem protec|disco maior|127.*220|220.*127|adapt|improvis|desmontar)/);
    add('photo',/(foto|imagem|etiqueta|anexo)/);
    add('remove_item',/(tira|retira|remove|exclui|nao quero)/);
    add('change_quantity',/(mais \d+|menos \d+|coloca mais|aumenta|diminui|troca a quantidade|quero \d+)/);
    add('confirmation',/^(sim|isso|correto|confirmo|pode|ok|certo|quero|adiciona|inclui)\b/);
    add('negation',/^(nao|n|errado|troca|outro|outra)\b/);
    if(/\bsku\b|\b\d{6}\b/.test(q)) out.add('sku_search');
    if(/\bref\b|\breferencia\b/.test(q)) out.add('reference_search');
    return [...out];
  }

  function parseQuantity(text, fallback=1){
    const q=normalize(text);
    const words={um:1,uma:1,dois:2,duas:2,tres:3,quatro:4,cinco:5,seis:6,sete:7,oito:8,nove:9,dez:10};
    const m=q.match(/(?:^|\s)(\d{1,4})\s*(?:x|un|und|unidade|unidades)?(?:\s|$)/);
    if(m) return Math.max(1,Math.min(999,Number(m[1])));
    for(const [word,n] of Object.entries(words)){
      if(new RegExp(`(?:^|\\s)${word}(?:\\s|$)`).test(q)) return n;
    }
    return fallback;
  }

  function isDangerous(text){ return classifyIntents(text).includes('safety'); }
  function isPromptInjection(text){ return classifyIntents(text).includes('prompt_injection'); }

  function buildWhatsAppMessage({sellerName,customerName,city,service,items,preferences,pending,id}){
    const rows=(items||[]).map((item,i)=>{
      const ref=item.ref?` — Ref. ${item.ref}`:'';
      return `${i+1}. ${item.name} — SKU ${item.sku}${ref} — Qtd. ${item.quantity||1}`;
    });
    return [
      `Olá, ${sellerName}. Vim pelo Assistente do site TEM TUDO.`,'',
      `Cliente: ${customerName||'não informado'}`,
      `Cidade: ${city||'não informada'}`,
      `Atendimento: ${id||'não informado'}`,'',
      'Necessidade:',service||'Atendimento comercial solicitado pelo site.','',
      'Itens do orçamento:',rows.length?rows.join('\n'):'Nenhum item confirmado.','',
      'Preferências/restrições:',preferences||'Não informadas.','',
      'Dúvidas pendentes:',pending||'Confirmar preço, disponibilidade e condição comercial.','',
      'Peço a confirmação de preço, disponibilidade e condição comercial.'
    ].join('\n');
  }

  function scoreProduct(product,query,synonyms={}){
    const q=normalize(query);
    if(!q) return 0;
    const sku=normalize(product.sku), ref=normalize(product.ref);
    const hay=normalize([product.name,product.sku,product.ref,product.brand,product.cat,product.synonyms||''].join(' '));
    const cq=compact(query), csku=compact(product.sku), cref=compact(product.ref);
    let score=0;
    if(cq && cq===csku) score+=1000;
    if(cq && cref && cq===cref) score+=900;
    if(sku===q) score+=800;
    if(ref && ref===q) score+=700;
    if(hay.includes(q)) score+=180;
    const expanded=new Set(q.split(' ').filter(Boolean));
    for(const word of [...expanded]) (synonyms[word]||[]).forEach(v=>expanded.add(normalize(v)));
    for(const word of expanded){
      if(!word) continue;
      if(hay.includes(word)) score+=word.length>=5?25:8;
      else if(word.length>=5 && hay.split(' ').some(p=>levenshtein(p,word)<=1)) score+=10;
    }
    return score;
  }

  function levenshtein(a,b){
    if(a===b) return 0;
    if(!a.length) return b.length;
    if(!b.length) return a.length;
    const row=Array.from({length:b.length+1},(_,i)=>i);
    for(let i=1;i<=a.length;i++){
      let prev=row[0]; row[0]=i;
      for(let j=1;j<=b.length;j++){
        const temp=row[j];
        row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));
        prev=temp;
      }
    }
    return row[b.length];
  }

  return {normalize,compact,greetingForHour,classifyIntents,parseQuantity,isDangerous,isPromptInjection,buildWhatsAppMessage,scoreProduct,levenshtein};
});
