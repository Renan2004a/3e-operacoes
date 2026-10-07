# Ocorrências — Especificação

## Problem Statement

O chão de fábrica precisa registrar o que dá errado durante a produção: peças perdidas no Corte e Dobra, refugo nas Telhas e indisponibilidade na Revenda. Hoje isso não existe, e sem registro não há indicador nem rastreabilidade. Perda e refugo **não** reduzem a obrigação de produzir.

## Goals

- [ ] Registrar perda, refugo, indisponibilidade, pausa e parada por atividade.
- [ ] Exigir motivo (lista fechada) para perda, refugo e indisponibilidade.
- [ ] Manter perda/refugo fora do saldo pendente de produção.
- [ ] Listar as ocorrências de uma atividade.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Alertas/notificações ao gerente | Fase de prazos/alertas. |
| Entregas e disponibilidade | Feature própria. |
| Autenticação e perfis | Feature própria; assume usuário autenticado. |
| Interface | Fase de frontend. |
| Efeito da indisponibilidade no saldo de Revenda | Depende de validar "pedido atendido". |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Lista de motivos | Nova entidade `MotivoOcorrencia` (tipo + código + descrição + ativo) | O schema atual não tem a lista fechada | não |
| Sugestões iniciais de motivo | As 3 de `docs/backlog/motivos-ocorrencia.md`, marcadas como sugestão | Não inventar regra; validar com o Everton | não |
| Efeito no saldo | Perda/refugo não alteram o saldo de produção | Decisão vigente em `docs/decisoes.md` | sim |
| Indisponibilidade em Revenda | Registrada; efeito no saldo fica pendente | `docs/regras-negocio.md` ainda não define | não |
| Motivo obrigatório | Apenas para perda, refugo e indisponibilidade | RN012, RN023, RN032 | sim |
| Tipos | PERDA, REFUGO, INDISPONIBILIDADE, PAUSA, PARADA, DEFEITO | RF005 | sim |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Registrar ocorrência ⭐ MVP

**User Story**: Como operador, quero registrar uma ocorrência, para registrar perdas, refugos e indisponibilidades.

**Why P1**: Sem isso não há rastreabilidade nem indicadores.

**Acceptance Criteria**:

1. WHEN o operador registra perda, refugo ou indisponibilidade com motivo válido THEN o sistema SHALL persistir a ocorrência vinculada à atividade com usuário e data/hora.
2. IF a ocorrência de perda, refugo ou indisponibilidade não tiver motivo THEN o sistema SHALL rejeitar com `400`.
3. IF o motivo não existir ou estiver inativo THEN o sistema SHALL rejeitar com `400`.
4. IF a quantidade não respeitar a unidade do item THEN o sistema SHALL rejeitar com `400`.
5. WHEN uma ocorrência de perda ou refugo é registrada THEN o sistema SHALL NOT alterar o saldo pendente de produção.
6. WHEN a ocorrência é registrada THEN o sistema SHALL registrar o usuário e a data/hora.

**Independent Test**: Registrar 2 peças perdidas de 10 e ver o saldo pendente continuar 10.

---

### P1: Listar ocorrências da atividade ⭐ MVP

**User Story**: Como gerente, quero ver as ocorrências de uma atividade, para entender o que aconteceu.

**Why P1**: É a base do acompanhamento.

**Acceptance Criteria**:

1. WHEN as ocorrências de uma atividade são consultadas THEN o sistema SHALL retornar tipo, quantidade, motivo, observação e data/hora.

**Independent Test**: Consultar as ocorrências e ver o motivo e a quantidade.

---

### P1: Lista fechada de motivos ⭐ MVP

**User Story**: Como responsável pelo sistema, quero uma lista fechada de motivos por tipo, para padronizar o registro.

**Why P1**: O motivo não pode ser texto livre.

**Acceptance Criteria**:

1. WHEN os motivos de um tipo são consultados THEN o sistema SHALL retornar apenas motivos ativos daquele tipo.
2. The system SHALL aceitar apenas motivos cadastrados e do mesmo tipo da ocorrência.

**Independent Test**: Listar motivos de refugo e ver apenas os ativos de refugo.

---

## Edge Cases

- IF a atividade não existir THEN o sistema SHALL responder `404`.
- IF o operador não pertencer ao setor da atividade THEN o sistema SHALL responder `403`.
- WHEN a ocorrência for de pausa ou parada THEN o sistema SHALL aceitar duração em minutos sem exigir motivo.
- IF a quantidade for zero ou negativa em perda, refugo ou indisponibilidade THEN o sistema SHALL rejeitar com `400`.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| OCO-01 | P1: Registrar | Design | Implemented |
| OCO-02 | P1: Registrar | Design | Implemented |
| OCO-03 | P1: Registrar | Design | Implemented |
| OCO-04 | P1: Registrar | Design | Implemented |
| OCO-05 | P1: Registrar | Design | Implemented |
| OCO-06 | P1: Registrar | Design | Implemented |
| OCO-07 | P1: Listar | Design | Pending |
| OCO-08 | P1: Motivos | Design | Implemented |
| OCO-09 | P1: Motivos | Design | Implemented |
| OCO-10 | Edge: atividade inexistente | Design | Pending |
| OCO-11 | Edge: setor do operador | Design | Implemented |
| OCO-12 | Edge: pausa/parada | Design | Implemented |
| OCO-13 | Edge: quantidade inválida | Design | Implemented |

**Coverage:** 13 total, 0 mapped to tasks, 13 unmapped ⚠️

---

## Success Criteria

- [ ] Registrar perda/refugo/indisponibilidade sem motivo é bloqueado.
- [ ] O saldo pendente não muda ao registrar perda ou refugo.
- [ ] A lista de motivos é fechada e por tipo.
- [ ] As ocorrências aparecem vinculadas à atividade, com usuário e data/hora.
