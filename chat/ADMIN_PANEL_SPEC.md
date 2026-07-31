# Painel administrativo — especificação segura

O painel não deve ser hospedado como página pública do GitHub Pages.

## Módulos planejados

- Lacunas de conhecimento.
- Sugestões de vendedores.
- Fontes pendentes, conflitantes e expiradas.
- Perguntas sem resultado.
- Atendimentos e handoffs.
- Métricas agregadas.
- Disponibilidade de vendedores.
- Aprovação e histórico de alterações.

## Requisitos antes da implantação

Backend autenticado, controle de papéis, banco persistente, trilha de auditoria, proteção contra CSRF, rate limit e política de retenção. A interface pública não recebe logs, prompt, chaves ou estoque bruto.
