# Prazos e Alertas — Especificação

## Problem Statement

O pedido pode nascer sem data de entrega e, mesmo com data, não há como sinalizar atraso. Hoje o gerente não enxerga o que passou do prazo. Precisamos registrar prazo por item/setor, calcular o status sem tratar "sem prazo" como atrasado e listar os atrasos.

## Goals

- [ ] Definir prazo opcional por item e por atividade/setor.
- [ ] Status `SEM_PRAZO`, `EM_DIA` e `ATRASADO`.
- [ ] Nunca classificar como atrasado sem prazo definido.
- [ ] Listar atividades atrasadas para o gerente.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Notificações push/e-mail de alerta | Fora do escopo atual; aqui é consulta. |
| Interface | Fase de frontend. |
| Prazos por item no Top Gerente | Não alterar o legado. |
| Autenticação | Feature já concluída; usa a sessão. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Quem define prazo | Gerente de Produção e Vendedor | `docs/perfis-permissoes.md` | sim |
| Atraso de item | Prazo do item ultrapassado e item não concluído | `docs/regras-negocio.md` | sim |
| Atraso de atividade | Prazo da atividade ultrapassado e atividade não `COMPLETED` | `docs/regras-negocio.md` | sim |
| Sem prazo | `SEM_PRAZO`, nunca atrasado | `docs/regras-negocio.md` | sim |
| Fonte do prazo | `OrderItem.deadlineAt` e `Activity.deadlineAt` | Campos já existem no schema | sim |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Definir prazo ⭐ MVP

**User Story**: Como gerente ou vendedor, quero definir o prazo de um item/setor, para orientar a produção.

**Why P1**: Sem prazo não existe atraso.

**Acceptance Criteria**:

1. WHEN um usuário autorizado define um prazo para um item THEN o sistema SHALL persistir a data do item.
2. WHEN um usuário autorizado define um prazo para uma atividade THEN o sistema SHALL persistir a data do setor.
3. IF o usuário não for gerente nem vendedor THEN o sistema SHALL rejeitar com `403`.
4. IF a data for inválida THEN o sistema SHALL rejeitar com `400`.

**Independent Test**: Definir um prazo e vê-lo persistido no item.

---

### P1: Status de prazo e atraso ⭐ MVP

**User Story**: Como gerente, quero ver se um item está em dia ou atrasado, para agir.

**Why P1**: RF012.

**Acceptance Criteria**:

1. WHEN um item não tem prazo THEN o sistema SHALL retornar `SEM_PRAZO`.
2. WHILE o prazo não foi ultrapassado THEN o sistema SHALL retornar `EM_DIA`.
3. WHEN o prazo foi ultrapassado e a atividade não está concluída THEN o sistema SHALL retornar `ATRASADO`.
4. WHEN o prazo foi ultrapassado e a atividade está concluída THEN o sistema SHALL NOT classificar como atrasado.
5. The system SHALL calcular atraso apenas para o escopo que possui prazo.

**Independent Test**: Prazo no passado com produção pendente retorna `ATRASADO`; sem prazo retorna `SEM_PRAZO`.

---

### P1: Alertas de atraso ⭐ MVP

**User Story**: Como gerente, quero listar as atividades atrasadas, para priorizar.

**Why P1**: RF012.

**Acceptance Criteria**:

1. WHEN o gerente consulta os alertas THEN o sistema SHALL retornar as atividades atrasadas com prazo ultrapassado e não concluídas.

**Independent Test**: Com duas atividades, só a atrasada aparece na lista.

---

## Edge Cases

- IF a atividade não existir THEN o sistema SHALL responder `404`.
- IF o item não existir THEN o sistema SHALL responder `404`.
- IF o usuário não tiver sessão THEN o sistema SHALL responder `401`.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Tasks | Status |
| --- | --- | --- | --- | --- |
| PRAZO-01 | P1: Definir | Execute | T1, T4, T5 | Done (T1) |
| PRAZO-02 | P1: Definir | Execute | T1, T4, T6 | Done (T1) |
| PRAZO-03 | P1: Definir | Execute | T5, T6 | Done (T5) |
| PRAZO-04 | P1: Definir | Execute | T1, T5, T6 | Done (T1) |
| PRAZO-05 | P1: Atraso | Execute | T2 | Done (T2) |
| PRAZO-06 | P1: Atraso | Execute | T2 | Done (T2) |
| PRAZO-07 | P1: Atraso | Execute | T2 | Done (T2) |
| PRAZO-08 | P1: Atraso | Execute | T2 | Done (T2) |
| PRAZO-09 | P1: Atraso | Execute | T2 | Done (T2) |
| PRAZO-10 | P1: Alertas | Execute | T3, T4, T7 | Done (T3) |
| PRAZO-11 | Edge: atividade inexistente | Execute | T1, T6 | Done (T1) |
| PRAZO-12 | Edge: item inexistente | Execute | T1, T5 | Done (T1) |

**Coverage:** 12 total, 12 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] Sem prazo nunca é atrasado.
- [ ] Prazo ultrapassado com produção pendente é `ATRASADO`.
- [ ] Só gerente e vendedor definem prazo.
- [ ] A lista de alertas traz apenas atividades atrasadas.
