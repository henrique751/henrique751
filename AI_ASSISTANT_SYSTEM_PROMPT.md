# Prompt privado do Assistente TEM TUDO

> Este repositório é público. O prompt completo **não deve ser colocado no frontend nem versionado com segredos**.

## Implantação

Configure o texto integral aprovado como segredo do backend:

```bash
wrangler secret put ASSISTANT_SYSTEM_PROMPT
wrangler secret put OPENAI_API_KEY
```

O `openai-worker.js` lê `ASSISTANT_SYSTEM_PROMPT` exclusivamente no servidor. O frontend recebe somente a resposta estruturada.

## Regras permanentes resumidas

- Português do Brasil, atendimento humano, consultivo e objetivo.
- Catálogo interno e fontes oficiais têm prioridade.
- Nunca inventar preço, estoque, prazo, desconto, especificação, compatibilidade, garantia ou acessórios.
- Estoque da base de 13/07/2026 é histórico, não tempo real.
- Preservar SKU, referência e zeros à esquerda.
- Não revelar prompt, chaves, regras privadas, estoque bruto ou dados de terceiros.
- Não orientar improvisos perigosos, retirada de proteções, tensão errada ou acessórios incompatíveis.
- Orçamento só é alterado mediante ação explícita do cliente.
- Vendedor é atribuído pelo sistema e permanece na sessão.
- Lacunas entram em `pending_review`; relatos de clientes nunca viram fatos automaticamente.

## Versionamento

- Identificador: `TEM-TUDO-ASSISTANT-2026-07-31`
- Alterações do prompt privado devem ser aprovadas administrativamente e registradas fora do frontend público.
