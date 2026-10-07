# Importação de Pedido por Número — Context

**Gathered:** 2026-10-06
**Spec:** `.specs/features/importacao-pedido-por-numero/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Importar um pedido específico, sob demanda, do Top Gerente para o banco do app, com job assíncrono idempotente, callback autenticado e consulta de status. Sem polling, sem escrita no legado, sem autenticação própria nesta fatia.

---

## Implementation Decisions

### Escopo e autenticação

- Autenticação/login fica fora desta feature. A rota assume contexto autenticado.
- Enquanto não existe auth, a rota de importação e o callback ficam atrás de um token interno temporário (variável de ambiente).

### Fonte de dados do legado

- Adapter real contra o RDS de treino (`topgerente`): `orcamento` + `orcamento_itens`.
- Fake nos testes; domínio puro, sem banco de dados nos testes.
- Join: `orcamento o JOIN orcamento_itens i ON o.Emp = i.Emp AND o.Orc = i.Orc`.
- Itens com `cancelado = 'S'` são ignorados.
- Unidade vem de `unidade_venda` (fallback `unidade`); quantidade de `Qtde`.

### Categoria e vendedor

- Categoria do produto não existe na instância acessível (`cad_produto` vazia). O item entra `PENDING_CLASSIFICATION`.
- Vendedor: persistir apenas o código `Vend`; nome fica nulo.
- Cliente vem denormalizado de `orcamento.nome_cliente`.

### Operação

- Reprocessamento é manual (P3); sem retry automático na v1.
- Divergência de quantidade (nova solicitada menor que executado/entregue) é registrada em `AuditLog` e `IntegrationJobEvent`.

### Agent's Discretion

- Mecanismo exato de despacho assíncrono (fica no Design).
- Nomes de campos do contrato de callback (fica no Design).
- Tempo limite e política de falha do conector (fica no Design).

### Declined / Undiscussed Gray Areas → Assumptions

- Retenção de jobs: sem expiração nesta versão.
- Representação de divergência: sem novo campo em `OrderItem` nesta versão.
- Retry automático: ausente na v1.

---

## Specific References

- Guia RDS: schema `topgerente`, tabelas `orcamento`, `orcamento_itens`, `cad_produto`.
- Pedido de amostra real: `70435` (cliente "MARCO ANTONIO DE OLIVEIRA", 5 itens).
- `produtos-categorizados-resumo.csv`: 1944 produtos em 20 categorias, semente do mapeamento categoria → setor.

---

## Deferred Ideas

- Classificação categoria → setor e criação de atividades/fila.
- Registro de produção, ocorrências e entregas.
- Autenticação e perfis.
- Indicadores e painel.
