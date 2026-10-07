# Indicadores e Consulta — Especificação

## Problem Statement

O vendedor não tem uma visão dos pedidos e o gerente não tem um painel consolidado da produção. As informações existem no banco do app, mas não há consulta nem indicadores. Precisamos de leitura de pedidos com filtros e de um painel por setor/status com indicadores de PCP.

## Goals

- [ ] Consultar pedidos com filtros (cliente, setor, status, período).
- [ ] Vendedor consulta todos os pedidos, somente leitura.
- [ ] Painel consolidado por setor e status, com pendências.
- [ ] Indicadores de produção por setor e cumprimento de prazo.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Alterar dados pela consulta | É somente leitura. |
| Gráficos e telas | Fase de frontend. |
| Exportação de relatórios | Fora do escopo atual. |
| Indicadores financeiros | Fora do escopo. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Fonte dos indicadores | Somente o banco do app | Não consultar o legado para indicadores | sim |
| Paginação | Limite e offset | Consulta previsível | não |
| Cumprimento de prazo | Concluídas no prazo ÷ concluídas com prazo | Sem prazo não entra | sim |
| Produção por setor | Soma de `Execution.quantity` por setor | Dado já existente | sim |
| Permissão | `consultar_pedidos` (todos os perfis) | RF008 | sim |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Consultar pedidos ⭐ MVP

**User Story**: Como vendedor, quero consultar os pedidos, para informar o cliente.

**Why P1**: RF008.

**Acceptance Criteria**:

1. WHEN um usuário consulta a lista de pedidos THEN o sistema SHALL retornar pedidos com número, cliente e status.
2. WHEN filtros são informados THEN o sistema SHALL filtrar por cliente, setor, status e período.
3. WHEN o vendedor consulta THEN o sistema SHALL permitir ver todos os pedidos, somente leitura.
4. WHEN um pedido é consultado THEN o sistema SHALL retornar os itens com solicitado, executado, disponível, entregue e pendente.

**Independent Test**: Filtrar por cliente e ver só os pedidos dele; abrir um pedido e ver os cinco valores por item.

---

### P1: Painel consolidado ⭐ MVP

**User Story**: Como gerente, quero ver o andamento por setor e status, para priorizar.

**Why P1**: RF006.

**Acceptance Criteria**:

1. WHEN o gerente consulta o painel THEN o sistema SHALL retornar a contagem de atividades por setor e por status.
2. WHEN o painel é consultado THEN o sistema SHALL retornar as pendências (atividades não concluídas).

**Independent Test**: Ver a contagem de atividades de Telhas e as pendências.

---

### P2: Indicadores de PCP

**User Story**: Como gerente, quero indicadores de produção e prazo, para o PCP.

**Why P2**: Complementa o painel.

**Acceptance Criteria**:

1. WHEN os indicadores são consultados THEN o sistema SHALL retornar a produção por setor.
2. WHEN os indicadores são consultados THEN o sistema SHALL retornar o cumprimento de prazo das atividades com prazo.
3. The system SHALL calcular os indicadores apenas com dados do banco do app.

**Independent Test**: Ver a produção de Telhas e o percentual de cumprimento de prazo.

---

## Edge Cases

- IF o pedido não existir THEN o sistema SHALL responder `404`.
- IF o usuário não tiver sessão THEN o sistema SHALL responder `401`.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Tasks | Status |
| --- | --- | --- | --- | --- |
| IND-01 | P1: Consulta | Execute | T1, T4, T5 | Verified (T1, T5) |
| IND-02 | P1: Consulta | Execute | T1, T5 | Verified (T1, T5) |
| IND-03 | P1: Consulta | Execute | T1, T5 | Verified (T1, T5) |
| IND-04 | P1: Consulta | Execute | T1, T6 | Verified (T1, T6) |
| IND-05 | P1: Painel | Execute | T2, T4, T7 | Verified (T2, T7) |
| IND-06 | P1: Painel | Execute | T2, T7 | Verified (T2, T7) |
| IND-07 | P2: PCP | Execute | T3, T4, T7 | Verified (T3, T7) |
| IND-08 | P2: PCP | Execute | T3, T7 | Verified (T3, T7) |
| IND-09 | P2: PCP | Execute | T3 | Verified (T3) |
| IND-10 | Edge: pedido inexistente | Execute | T1, T6 | Verified (T1, T6) |
| IND-11 | Edge: sem sessão | Execute | T5, T6, T7 | Verified (T5, T6, T7) |

**Coverage:** 11 total, 11 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] A lista de pedidos respeita os filtros.
- [ ] O detalhe do pedido traz os cinco valores por item.
- [ ] O painel traz contagem por setor/status e pendências.
- [ ] Os indicadores trazem produção por setor e cumprimento de prazo.
