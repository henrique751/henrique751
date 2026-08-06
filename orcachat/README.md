# TEM TUDO OrçaChat V1

Protótipo separado do site principal, publicado no GitHub Pages.

## Funcionalidades concluídas

- Layout limpo e responsivo para celular e computador.
- Catálogo de teste com 1.919 SKUs.
- Busca por SKU, nome, marca, medida, voltagem e abreviações comuns.
- Orçamento automático com um produto selecionado por item quando há confiança.
- Itens não identificados preservados para conferência do vendedor.
- Ajuste e exclusão de quantidades.
- Confirmação, nome do cliente e envio completo ao WhatsApp.
- Roleta: Henrique, Sérgio e Marcos, sem repetição consecutiva.
- Histórico local e nova conversa.
- Leitura local de texto, CSV, TXT, Excel e PDF textual.
- Estrutura pronta para imagens/PDFs com Gemini por endpoint seguro.

## Segurança do Gemini

Nunca coloque a chave no `config.js` ou em código público. Implante o Worker em `backend-cloudflare`, salve `GEMINI_API_KEY` como secret e depois coloque somente a URL pública do Worker no campo `geminiEndpoint` de `config.js`.

## Limites atuais do protótipo

- A lista de preços não foi fornecida; valores são confirmados pelo vendedor.
- O estoque é uma fotografia histórica de 13/07/2026, não estoque em tempo real.
- Imagens digitalizadas dependem da ativação do Gemini.
- O histórico fica no navegador deste aparelho; banco de dados e CRM são fases futuras.
