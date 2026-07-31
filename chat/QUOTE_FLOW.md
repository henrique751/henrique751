# Fluxo de orçamento

## Estados de item

`confirmed`, `needs_disambiguation`, `not_found`, `availability_pending`, `price_pending`, `alternative_suggested`, `removed`.

## Entrada

Produto único, SKU, referência, lista por linhas, quantidades, alterações e remoções.

## Confirmação

- Produto único: confirmar antes de salvar, salvo clique explícito em “Adicionar”.
- Lista: confirmar o conjunto localizado.
- Item ambíguo: perguntar somente sobre ele.
- Preço e total: não calcular sem valores atuais confirmados.

## Fechamento

Nome, cidade, itens, quantidades, necessidade, preferências e dúvidas pendentes são organizados em mensagem revisável para o WhatsApp.
