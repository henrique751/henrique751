# Site TEM TUDO — GitHub Pages

Site estático responsivo publicado no GitHub Pages, com catálogo pesquisável e Assistente TEM TUDO.

## Recursos publicados

- logo e mascote oficiais em alta qualidade;
- páginas internas por rotas: início, catálogo, produto, marcas, soluções, assistente, orçamento, sobre e contato;
- base de **1.888 produtos** extraída das listas oficiais das sete marcas;
- busca por nome, SKU, referência, marca, categoria, aplicação, tensão e termos aproximados;
- filtros e paginação;
- orçamento persistente no navegador;
- rodízio de WhatsApp: Henrique → Sergio → Marcos;
- Assistente TEM TUDO com saudação por horário, pesquisa local, interpretação de listas, confirmação de produtos e encaminhamento ao vendedor;
- Enter envia e Shift+Enter quebra linha no desktop;
- fallback local: catálogo, busca, orçamento e chat básico continuam funcionando sem IA externa.

## Estoque

O levantamento interno é de **13/07/2026**. O site mostra “Consultar disponibilidade” e não apresenta o saldo como estoque em tempo real.

## Ativação opcional da OpenAI

O GitHub Pages não executa backend e não pode guardar uma chave secreta com segurança. Para ativar a IA:

1. publique `openai-worker.js` em um Cloudflare Worker ou adapte-o para outra função serverless;
2. configure `OPENAI_API_KEY` como segredo no ambiente do servidor;
3. configure `ALLOWED_ORIGIN=https://henrique751.github.io`;
4. informe a URL pública da função no campo `aiEndpoint` da configuração do aplicativo;
5. nunca coloque a chave em arquivos servidos ao navegador.

Sem o endpoint, o assistente utiliza a lógica local e continua pesquisando os 1.888 produtos.
