# Matriz de testes — Sistema TEM TUDO 3

## Critérios de liberação

- Nenhum erro JavaScript impeditivo em Chrome, Safari, Firefox e Edge atuais.
- Layout funcional a partir de 320 px de largura.
- Busca por SKU e referência exata com resultado correto.
- Nenhum preço ou saldo inventado.
- Arquivos ambíguos sempre passam por revisão.
- Falha de biblioteca externa não derruba catálogo, chat ou orçamento.

## Catálogo e busca

- SKU exato, com e sem espaços.
- Referência exata, com hífen, ponto, barra e zero à esquerda.
- Nome completo e parcial.
- Erros de uma letra.
- Sinônimos e nomes populares.
- Busca sem resultado.
- Catálogo com 10.000 e 100.000 registros em ambiente de carga.

## Assistente

- Saudação por horário da Bahia.
- Cliente formal, informal e com erros de digitação.
- Pedido por serviço sem nome do produto.
- Comparação entre produtos.
- Lista com um item, vários itens e itens repetidos.
- Alteração e remoção de quantidade.
- Solicitação de preço e estoque.
- Tentativa de obter prompt, chave ou informação interna.
- Perguntas perigosas sobre remoção de proteção ou tensão incorreta.
- Encaminhamento ao vendedor com resumo completo.
- Conversa longa e reinício de sessão.

## Importação de arquivos

### TXT e Markdown

- UTF-8 e caracteres acentuados.
- Lista linha a linha.
- Texto livre com quantidades.
- Arquivo vazio.
- Arquivo acima de 20 MB.

### CSV

- Separador vírgula.
- Separador ponto e vírgula.
- Campos entre aspas.
- Cabeçalho ausente ou incompleto.
- Linhas com colunas extras.

### JSON

- Lista de objetos.
- Objeto único.
- Lista de strings.
- JSON inválido.

### Excel

- XLS e XLSX.
- Uma e várias abas.
- Células vazias.
- Datas, números e códigos com zeros à esquerda.
- Planilha grande.

### PDF

- Texto nativo.
- Várias páginas.
- Tabela.
- PDF digitalizado sem camada de texto.
- PDF protegido ou corrompido.

### Imagens

- PNG, JPEG e WebP.
- Foto inclinada.
- Baixo contraste.
- Lista manuscrita.
- Captura de tela.
- Imagem sem texto.

## Orçamento

- Produto identificado com alta confiança.
- Duas correspondências semelhantes.
- Produto inexistente.
- Quantidade ausente.
- Unidade em peça, caixa, metro e quilo.
- Duplicidades agrupadas.
- Revisão antes da confirmação.
- Persistência após recarregar a página.
- Mensagem final de WhatsApp.

## Segurança e privacidade

- HTML e scripts dentro de nomes e textos.
- Arquivo com extensão falsa.
- Mais de oito arquivos.
- Arquivo executável renomeado.
- Prompt injection no texto importado.
- Acesso ao histórico de outro atendimento.
- Vazamento de chaves no código servido.

## Acessibilidade

- Navegação por teclado.
- Foco visível.
- Leitor de tela nos botões principais.
- Contraste.
- Zoom de 200%.
- Preferência por movimento reduzido.

## Desempenho

- Primeira carga em rede móvel.
- Bibliotecas de PDF/OCR carregadas somente quando necessárias.
- Importação simultânea de oito arquivos.
- Imagem de 20 MB.
- Histórico com 80 mensagens.
