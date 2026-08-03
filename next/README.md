# TEM TUDO — Novo Sistema

Aplicação web responsiva criada sem dependência de plataformas de geração por créditos.

## Implementado nesta primeira versão

- interface responsiva para celular, tablet e desktop;
- catálogo pesquisável por nome, marca, SKU, referência, categoria e aplicação;
- orçamento persistente no navegador;
- rodízio entre vendedores no envio por WhatsApp;
- assistente local orientado pelo catálogo, com fallback seguro;
- respostas que evitam inventar preço, estoque, garantia e compatibilidade;
- análise de TXT, CSV, JSON e planilhas XLS/XLSX;
- extração de texto de PDFs no navegador;
- OCR local de imagens quando Tesseract.js está disponível;
- revisão dos itens identificados antes de adicioná-los ao orçamento;
- importação incremental de produtos em JSON;
- painel de métricas e testes internos;
- arquitetura preparada para expansão acima de 10.000 produtos.

## Segurança e dados

Nesta versão, todos os dados operacionais ficam no navegador do usuário por meio de `localStorage`. Nenhuma chave de IA é exposta no frontend. Integrações futuras com banco, autenticação e IA devem ser feitas por um backend seguro.

## Testes internos

O painel inclui verificações automáticas de catálogo, unicidade de SKU, busca por referência, busca por aplicação, persistência do orçamento, interpretação de quantidade, fallback de estoque e integridade das rotas.

## Próximas etapas

1. importar a base oficial completa das marcas principais;
2. substituir os cartões demonstrativos pelos dados e imagens oficiais;
3. validar exemplos reais de orçamento enviados por clientes;
4. integrar banco de dados e autenticação;
5. implementar área separada por perfil: cliente, vendedor, estoque e administrador;
6. criar backend próprio para IA e processamento de arquivos pesados;
7. executar testes de navegador, desempenho, acessibilidade e segurança.
