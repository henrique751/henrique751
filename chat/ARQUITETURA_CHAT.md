# Arquitetura do Assistente TEM TUDO

## Estado atual

O site é uma aplicação estática publicada no GitHub Pages. Busca, catálogo, orçamento e WhatsApp funcionam sem IA.

## Componentes

1. `chat-core.js`: normalização, classificação básica, quantidades, segurança, busca aproximada e geração da mensagem de WhatsApp.
2. `assistant-v2.js`: memória local, fluxos conversacionais, orçamento, contingência, cards, rodízio persistente e integração opcional.
3. `openai-worker.js`: backend serverless seguro para a OpenAI Responses API.
4. `config.js`: contém apenas a URL pública do backend; nunca contém chave.
5. `catalog-01.js` a `catalog-08.js`: base estática com 1.888 produtos.

## Fluxo

Cliente → interface → busca local → regras determinísticas de segurança/orçamento → backend opcional → OpenAI → JSON validado → resposta.

## Princípios

- Catálogo, orçamento e WhatsApp continuam funcionais sem IA.
- O modelo não recebe a base inteira; recebe somente os produtos relevantes.
- A chave fica no Worker.
- `store:false` é enviado à Responses API.
- Pesquisa externa só é habilitada no backend, com domínios oficiais configurados.
- Alterações no orçamento exigem confirmação explícita.
