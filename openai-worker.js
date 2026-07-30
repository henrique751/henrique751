/**
 * Cloudflare Worker opcional para ativar IA no Assistente TEM TUDO.
 * Segredos obrigatórios no ambiente do Worker:
 *   OPENAI_API_KEY
 * Opcional:
 *   OPENAI_MODEL (padrão: gpt-5-mini)
 *   ALLOWED_ORIGIN (padrão: https://henrique751.github.io)
 *
 * A chave nunca deve ser colocada em config.js ou no navegador.
 */
export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || 'https://henrique751.github.io';
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': origin === allowedOrigin ? origin : allowedOrigin,
      'Access-Control-Allow-Headers': 'content-type',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Vary': 'Origin'
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405, cors);
    if (!env.OPENAI_API_KEY) return json({ error: 'OPENAI_API_KEY não configurada.' }, 503, cors);

    try {
      const body = await request.json();
      const products = Array.isArray(body.products) ? body.products.slice(0, 6) : [];
      const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
      const quote = Array.isArray(body.quote) ? body.quote.slice(0, 30) : [];
      const instructions = `Você é o Assistente TEM TUDO, vendedor virtual formal, humano e consultivo de uma loja de ferramentas em Eunápolis-BA.
Responda em português do Brasil, com clareza, atenção e poucas palavras por parágrafo.
Use SOMENTE os dados de produtos enviados nesta requisição. Não invente preço, estoque, compatibilidade, tensão, potência, garantia, autonomia ou tempo de carga.
Quando faltar comprovação, diga: “Não encontrei confirmação suficiente para afirmar isso. Posso consultar um vendedor da TEM TUDO para verificar.”
Antes de recomendar, confirme serviço, material, frequência e tensão quando forem relevantes. Mostre no máximo três opções.
O catálogo interno tem prioridade. Não afirme que o estoque é em tempo real.
Quando houver intenção de compra, ajude a montar orçamento e convide o cliente a continuar com um vendedor.`;

      const context = {
        customer: body.customer || '',
        facts: body.facts || {},
        products,
        quote
      };
      const input = [
        ...history.map(item => ({ role: item.role === 'assistant' ? 'assistant' : 'user', content: String(item.content || '') })),
        { role: 'user', content: `${String(body.message || '')}\n\nCONTEXTO INTERNO VERIFICADO:\n${JSON.stringify(context)}` }
      ];
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || 'gpt-5-mini',
          instructions,
          input,
          max_output_tokens: 550
        })
      });
      const data = await response.json();
      if (!response.ok) return json({ error: data?.error?.message || 'Falha ao consultar a IA.' }, response.status, cors);
      const answer = data.output_text || extractText(data);
      return json({ answer }, 200, cors);
    } catch (error) {
      return json({ error: 'Falha temporária no assistente.', detail: String(error?.message || error) }, 500, cors);
    }
  }
};

function extractText(data) {
  return (data.output || []).flatMap(item => item.content || []).filter(c => c.type === 'output_text').map(c => c.text).join('\n').trim();
}
function json(value, status, extraHeaders) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders } });
}
