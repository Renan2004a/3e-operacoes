# Produção e Fila de Atividades — Especificação

## Problem Statement

A classificação cria as atividades por setor, mas não existe fila para o operador nem registro da produção. Sem isso, o saldo pendente não é calculado e o gerente não enxerga o andamento. Precisamos de fila por setor, registro de execução e cálculo de saldo conforme as unidades de cada setor.

## Goals

- [ ] Fila de atividades por setor, filtrando pelos setores do usuário.
- [ ] Registro de execução com validação de unidade e casas decimais.
- [ ] Saldo pendente = solicitado − executado conforme.
- [ ] Prioridades por atividade.
- [ ] Dados da ordem de produção para impressão.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Ocorrências (perda, refugo, indisponibilidade) | Feature seguinte; não reduzem a obrigação de produzir. |
| Entregas e disponibilidade | Feature própria. |
| Prazos e alertas | Feature própria. |
| Autenticação e perfis | Feature própria; assume usuário autenticado. |
| Interface de impressão e telas | Fase de frontend. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Revenda: saldo pendente | `solicitado − separado`; indisponibilidade entra na feature de ocorrências | RN031 histórica inclui indisponível, mas o significado de "pedido atendido" ainda não está validado | não |
| Conclusão da atividade | `COMPLETED` quando executado ≥ solicitado | RN001: saldo zero | não |
| Excesso de execução | Marca `DIVERGENT`, não bloqueia | RN001 manda sinalizar divergência | sim |
| Operador vê só seus setores | Filtra por `UserSector` | RF003 | sim |
| Peça inteira / metro 2 casas | Validado na entrada | RN003, RN010, RN020, RN022 | sim |
| Prioridade | Gerente define; default 0 | RF007 | sim |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Fila de atividades por setor ⭐ MVP

**User Story**: Como operador, quero ver as atividades do meu setor, para saber o que executar.

**Why P1**: É a tela de trabalho do chão de fábrica.

**Acceptance Criteria**:

1. WHEN um operador consulta a fila THEN o sistema SHALL retornar as atividades dos setores aos quais ele pertence.
2. The system SHALL ordenar a fila por prioridade decrescente e, depois, por data de criação.
3. IF o usuário não pertencer a nenhum setor THEN o sistema SHALL retornar uma lista vazia.

**Independent Test**: Consultar a fila de um operador de Telhas e ver só atividades de Telhas.

---

### P1: Registrar execução ⭐ MVP

**User Story**: Como operador, quero registrar a quantidade produzida ou separada, para atualizar o andamento.

**Why P1**: Sem registro não existe saldo.

**Acceptance Criteria**:

1. WHEN o operador registra uma quantidade na atividade THEN o sistema SHALL persistir a execução com usuário e data/hora.
2. IF a quantidade não respeitar a unidade do item THEN o sistema SHALL rejeitar com `400`.
3. WHEN a soma das execuções alcança a quantidade solicitada THEN o sistema SHALL marcar a atividade como `COMPLETED`.
4. IF a soma das execuções ultrapassar a quantidade solicitada THEN o sistema SHALL marcar a atividade como `DIVERGENT`.

**Independent Test**: Registrar 8 de 10 peças e ver o saldo pendente 2.

---

### P1: Saldo pendente ⭐ MVP

**User Story**: Como gerente, quero ver solicitado, executado e pendente, para acompanhar o andamento.

**Why P1**: É o indicador central da produção.

**Acceptance Criteria**:

1. The system SHALL calcular o saldo pendente como quantidade solicitada menos a quantidade executada conforme.
2. WHEN uma atividade é consultada THEN o sistema SHALL retornar solicitado, executado e pendente.
3. The system SHALL tratar a unidade do setor: peça inteira e metro com duas casas decimais.

**Independent Test**: Atividade de 10 m com 8 m produzidos retorna pendente 2,00 m.

---

### P1: Prioridades ⭐ MVP

**User Story**: Como gerente, quero definir a prioridade de uma atividade, para orientar a fila.

**Why P1**: RF007 e a ordenação da fila dependem disso.

**Acceptance Criteria**:

1. WHEN um gerente define a prioridade de uma atividade THEN o sistema SHALL persistir a prioridade e refletir na ordenação da fila.

**Independent Test**: Aumentar a prioridade de uma atividade e vê-la subir na fila.

---

### P2: Ordem de produção

**User Story**: Como gerente, quero os dados da ordem de produção, para imprimir e distribuir.

**Why P2**: RF018; a impressão em si fica para o frontend.

**Acceptance Criteria**:

1. WHEN a ordem de produção de uma atividade é solicitada THEN o sistema SHALL retornar pedido, item, setor, quantidade solicitada, executada e pendente.

**Independent Test**: Solicitar a ordem de uma atividade e ver os dados completos.

---

## Edge Cases

- IF a atividade não existir THEN o sistema SHALL responder `404`.
- IF o operador não pertencer ao setor da atividade THEN o sistema SHALL rejeitar a execução com `403`.
- WHEN a quantidade for zero ou negativa THEN o sistema SHALL rejeitar com `400`.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| PROD-01 | P1: Fila | Design | Pending |
| PROD-02 | P1: Fila | Design | Pending |
| PROD-03 | P1: Fila | Design | Pending |
| PROD-04 | P1: Execução | Design | Done |
| PROD-05 | P1: Execução | Design | Done |
| PROD-06 | P1: Execução | Design | Done |
| PROD-07 | P1: Execução | Design | Done |
| PROD-08 | P1: Saldo | Design | Done |
| PROD-09 | P1: Saldo | Design | Done |
| PROD-10 | P1: Saldo | Design | Done |
| PROD-11 | P1: Prioridade | Design | Pending |
| PROD-12 | P2: Ordem | Design | Pending |
| PROD-13 | Edge: atividade inexistente | Design | Pending |
| PROD-14 | Edge: setor do operador | Design | Done |
| PROD-15 | Edge: quantidade inválida | Design | Done |

**Coverage:** 15 total, 9 mapped to tasks, 6 unmapped ⚠️

---

## Success Criteria

- [ ] A fila mostra apenas atividades dos setores do usuário, ordenadas por prioridade.
- [ ] Registrar 8 de 10 peças deixa pendente 2; ultrapassar 10 marca `DIVERGENT`.
- [ ] Metro aceita 2 casas decimais; peça rejeita fração.
- [ ] A ordem de produção retorna os dados completos.
