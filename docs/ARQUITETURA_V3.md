# Sistema TEM TUDO 3 — Arquitetura

## Objetivo

Aplicação web responsiva para atendimento ao cliente, catálogo, interpretação de listas e orçamentos, geração de cotações e encaminhamento organizado para vendedores. A base atual possui 1.888 produtos e a arquitetura deve suportar mais de 10.000 itens.

## Princípios obrigatórios

1. O catálogo interno é a primeira fonte de verdade.
2. Preço, saldo e prazo nunca são inventados; enquanto não houver ERP em tempo real, usar “Consultar disponibilidade”.
3. Correspondências ambíguas exigem confirmação do cliente.
4. Chaves e segredos nunca ficam no navegador.
5. O atendimento básico continua funcionando sem IA externa.
6. Arquivos enviados são revisados pelo cliente antes de virar orçamento.
7. A aplicação não redireciona o usuário para construtores de terceiros.

## Camadas

### Interface pública

- Início, catálogo, marcas, soluções, produto, orçamento, sobre e contato.
- Assistente em painel lateral, adaptado para desktop e celular.
- Importação de TXT, CSV, JSON, Excel, PDF e imagens.
- Carrinho de orçamento persistente no navegador.
- Encaminhamento ao WhatsApp com resumo estruturado.

### Núcleo local

- Normalização de nomes, referências e SKUs.
- Busca tolerante a erros e sinônimos.
- Classificação de intenção.
- Interpretação de listas.
- Regras de segurança e fallback.
- Memória local limitada e controlada.

### Processamento de arquivos

- TXT/CSV/JSON: leitura nativa no navegador.
- XLS/XLSX: leitura local via biblioteca aberta carregada sob demanda.
- PDF: extração local de texto; documentos digitalizados exigem OCR.
- Imagens: OCR local, com revisão obrigatória.
- Limites iniciais: 8 arquivos por atendimento e 20 MB por arquivo.

### Backend futuro, sem alterar a experiência

- API própria para autenticação, documentos, catálogo e conversas.
- Banco PostgreSQL com índices de busca.
- Armazenamento de arquivos com URLs assinadas.
- Fila de processamento para OCR pesado.
- Integração direta com OpenAI somente via servidor, opcional e substituível.
- Integração futura com ERP/Servinn.

## Modelo de dados planejado

### products

- id
- sku
- reference
- name
- normalized_name
- brand_id
- category_id
- description
- voltage
- specifications_json
- warranty_text
- safety_text
- active
- created_at
- updated_at

### product_aliases

- id
- product_id
- alias
- normalized_alias
- source
- confidence

### product_documents

- id
- product_id
- type
- title
- storage_key
- checksum
- extracted_text
- source_date

### quote_imports

- id
- session_id
- original_name
- mime_type
- checksum
- status
- extracted_text
- parser_version
- created_at

### quote_items

- id
- quote_id
- source_text
- requested_quantity
- unit
- matched_product_id
- confidence
- review_status
- notes

### conversations

- id
- session_id
- channel
- customer_name
- city
- assigned_seller_id
- summary
- status
- created_at

### knowledge_gaps

- id
- conversation_id
- question
- context
- status
- reviewed_by
- answer_source

## Segurança

- Sanitização de todo conteúdo exibido.
- Restrição de tamanho, quantidade e tipo de arquivo.
- Sem execução de conteúdo anexado.
- Segredos somente no servidor.
- Registro de origem de informações técnicas.
- Separação futura de perfis: cliente, vendedor, estoque e administrador.

## Escalabilidade

O catálogo atual permanece dividido em arquivos estáticos para garantir continuidade imediata. A migração para banco será feita sem quebrar a interface, substituindo o provedor de dados por uma API paginada e indexada.
