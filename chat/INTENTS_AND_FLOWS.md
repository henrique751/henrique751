# Intenções e fluxos

## Intenções implementadas no núcleo local

Saudação, vendedor, orçamento, preço, estoque, entrega, garantia, compatibilidade, comparação, uso, limpeza, armazenamento, manutenção, segurança, foto, remoção, quantidade, confirmação, negação, SKU, referência e tentativa de revelar dados internos.

## Fluxos persistentes

- `need_service`: cliente descreve o serviço.
- `warranty_model` → `warranty_date` → `warranty_problem`.
- `customer_name` → `customer_city` → handoff.
- `pendingProduct`: confirmação de produto.
- `pendingList`: confirmação de lista.
- `lastProducts`: continuidade contextual.
- `assignedSeller`: vendedor persistente.

## Regras

- Perguntar somente dados que alteram a escolha.
- Até três opções.
- Uma correspondência exata não gera lista desnecessária.
- Ambiguidades são confirmadas antes do orçamento.
- Segurança e prompt injection são tratadas antes da IA externa.
