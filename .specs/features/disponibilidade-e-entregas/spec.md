# Disponibilidade e Entregas — Especificação

## Problem Statement

A produção já é registrada, mas a Expedição não tem como saber o que está disponível nem registrar a saída. Sem isso, o saldo do pedido fica incompleto e entregas podem passar do que foi produzido. Precisamos de disponibilidade, registro de entrega e bloqueio de exceção.

## Goals

- [ ] Calcular disponível = executado conforme − entregue.
- [ ] Registrar entrega total ou parcial, restrita a Expedição e Gerente.
- [ ] Bloquear entrega acima do disponível, com exceção autorizada pelo gerente.
- [ ] Expor o saldo consolidado do pedido e o histórico de entregas.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Autenticação e cadastro de perfis | Feature própria; aqui os papéis vêm do cadastro do usuário. |
| Interface | Fase de frontend. |
| Efeito da indisponibilidade no saldo de Revenda | Pendente de validação. |
| Alertas e notificações | Feature de prazos/alertas. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Papéis do usuário | Lidos de `UserRole` pelo usuário atual (cabeçalho temporário) | Auth ainda não existe | não |
| Status de entrega do item | Derivado: parcial enquanto entregue < executado; concluído quando igual | RN004; sem novo campo | sim |
| Exceção | Só gerente, com motivo e auditoria | RN005, `docs/perfis-permissoes.md` | sim |
| Disponível | Executado conforme − entregue | RN002 | sim |
| Item sem produção | Disponível zero | RN002 | sim |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Consultar disponibilidade ⭐ MVP

**User Story**: Como Expedição, quero ver o disponível por item, para saber o que pode sair.

**Why P1**: É a base da entrega.

**Acceptance Criteria**:

1. WHEN a disponibilidade de um item é consultada THEN o sistema SHALL calcular a quantidade executada menos a quantidade entregue.
2. The system SHALL considerar apenas o que foi produzido ou separado.

**Independent Test**: Item com 8 produzidos e 3 entregues retorna disponível 5.

---

### P1: Registrar entrega ⭐ MVP

**User Story**: Como Expedição, quero registrar entregas totais ou parciais, para atualizar o saldo.

**Why P1**: É a operação da expedição.

**Acceptance Criteria**:

1. WHEN Expedição ou Gerente registra uma entrega dentro do disponível THEN o sistema SHALL persistir a entrega com usuário e data/hora.
2. IF o usuário não for Expedição nem Gerente THEN o sistema SHALL rejeitar com `403`.
3. IF a quantidade entregue ultrapassar o disponível THEN o sistema SHALL bloquear com `409`.
4. WHEN o Gerente autoriza a exceção com motivo THEN o sistema SHALL registrar a entrega acima do disponível com auditoria.
5. IF a exceção for solicitada sem motivo ou por quem não é gerente THEN o sistema SHALL rejeitar com `400` ou `403`.
6. WHEN a entrega for parcial THEN o sistema SHALL manter o item como parcialmente entregue.
7. WHEN a quantidade entregue alcançar a executada THEN o sistema SHALL marcar o item como concluído.

**Independent Test**: Entregar 3 de 8 e ver parcial; entregar o restante e ver concluído.

---

### P1: Saldo consolidado do pedido ⭐ MVP

**User Story**: Como Vendedor ou Gerente, quero ver o saldo do pedido, para informar o cliente.

**Why P1**: RF011.

**Acceptance Criteria**:

1. WHEN o saldo do pedido é consultado THEN o sistema SHALL retornar, por item, solicitado, executado, disponível, entregue e pendente.

**Independent Test**: Consultar o saldo de um pedido e ver os cinco valores por item.

---

### P1: Histórico de entregas ⭐ MVP

**User Story**: Como Expedição, quero ver o histórico de entregas, para conferir o que já saiu.

**Why P1**: RF010.

**Acceptance Criteria**:

1. WHEN o histórico de entregas do item é consultado THEN o sistema SHALL retornar quantidade, usuário, data/hora e se houve exceção.

**Independent Test**: Consultar o histórico e ver as entregas com o autor.

---

## Edge Cases

- IF o item não existir THEN o sistema SHALL responder `404`.
- WHEN a quantidade for zero ou negativa THEN o sistema SHALL rejeitar com `400`.
- IF o item não tiver produção executada THEN o sistema SHALL ter disponível zero.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| EXP-01 | P1: Disponibilidade | Design | Implemented |
| EXP-02 | P1: Disponibilidade | Design | Implemented |
| EXP-03 | P1: Entrega | Design | Implemented |
| EXP-04 | P1: Entrega | Design | Implemented |
| EXP-05 | P1: Entrega | Design | Implemented |
| EXP-06 | P1: Entrega | Design | Implemented |
| EXP-07 | P1: Entrega | Design | Implemented |
| EXP-08 | P1: Entrega | Design | Implemented |
| EXP-09 | P1: Entrega | Design | Implemented |
| EXP-10 | P1: Saldo | Design | Implemented |
| EXP-11 | P1: Histórico | Design | Pending |
| EXP-12 | Edge: item inexistente | Design | Pending |
| EXP-13 | Edge: quantidade inválida | Design | Implemented |
| EXP-14 | Edge: sem produção | Design | Implemented |

**Coverage:** 14 total, 0 mapped to tasks, 14 unmapped ⚠️

---

## Success Criteria

- [ ] Entregar acima do disponível é bloqueado, exceto com autorização de gerente.
- [ ] A exceção gera auditoria completa.
- [ ] Entrega parcial mantém o item parcial; a entrega final conclui.
- [ ] O saldo do pedido retorna os cinco valores por item.
