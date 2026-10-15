# Alertas, Remessas e Sugestão de Setor — Especificação

## Problem Statement

Três lacunas do cliente ficaram pendentes após a entrega inicial (ver análise de conformidade):

1. **Alertas (RF012)**: existia apenas o alerta de atraso por prazo, sem tela. Faltavam os alertas de itens **parados** e **não encaminhados** (sem setor), e uma visão única no painel.
2. **Entregas escalonadas (RF010)**: o cliente registra entregas em remessas ("1ª Remessa", "ENTREGAR"), com data prevista. Faltava programar a entrega por item e confirmá-la.
3. **Identificação por setor (RF002)**: a classificação era 100% manual. Faltava **sugerir** o setor a partir do produto do legado, mantendo a decisão final com quem desmembra.

## Goals

- [x] Alertas operacionais no painel: **atrasados**, **parados** e **não encaminhados**.
- [x] Endpoint `GET /api/indicadores/alertas`.
- [x] Programar/confirmar/remover **remessa** (entrega prevista) por item, com número e data.
- [x] Exibir as remessas no detalhe do pedido.
- [x] **Sugerir** o setor pelo produto (regras configuráveis), pré-selecionando no desmembramento.

## Out of Scope

| Item | Reason |
| --- | --- |
| Notificação externa (e-mail/WhatsApp) | Fora do escopo. |
| Tela de administração das regras produto→setor | Regras semeadas; edição fica no backlog. |
| Remessa vinculada automaticamente à entrega registrada | Exige integração com o fluxo de expedição; depois. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Critério de "parado" | Sem execução (ou sem criação, se nunca executou) há mais de `ALERTA_PARADO_DIAS` (padrão 5) | Sinaliza item esquecido sem depender de prazo | sim (default do agente) |
| Remessa | Número sequencial por item + data prevista + confirmação opcional | Espelha o papel ("1ª Remessa") | sim (default do agente) |
| Sugestão de setor | Regras `CONTAINS`/`PREFIX` por código/descrição, priorizadas | Simples e ajustável sem recompilar | sim (default do agente) |

**Open questions:** nenhuma bloqueante — defaults escolhidos e registrados acima.

---

## User Stories

### P1: Alertas operacionais ⭐ MVP

**Acceptance Criteria**:

1. WHEN o painel carrega THEN SHALL mostrar atrasados, parados e não encaminhados com contagem.
2. WHEN um item tem prazo vencido e não concluiu THEN SHALL aparecer em **Atrasados**.
3. WHEN um item não tem execução há mais de N dias e não concluiu THEN SHALL aparecer em **Parados**.
4. WHEN um item está pendente de desmembramento ou sem atividade THEN SHALL aparecer em **Não encaminhados**.

### P1: Remessas ⭐ MVP

**Acceptance Criteria**:

1. WHEN o usuário informa número e data de uma remessa THEN SHALL programá-la no item (201).
2. IF o número repetir no mesmo item THEN SHALL responder 409.
3. WHEN a remessa é confirmada THEN SHALL registrar a data de confirmação.
4. WHEN o detalhe do pedido é aberto THEN SHALL listar as remessas do item.
5. IF o perfil não pode programar remessa THEN SHALL responder 403.

### P1: Sugestão de setor ⭐ MVP

**Acceptance Criteria**:

1. WHEN um item pendente corresponde a uma regra ativa THEN SHALL sugerir o setor correspondente.
2. WHEN o item já está classificado THEN SHALL não sugerir.
3. WHEN o desmembramento é aberto THEN SHALL pré-selecionar o setor sugerido, sem impedir a troca.

---

## Edge Cases

- IF não há regras THEN a sugestão é nula e o fluxo manual continua.
- IF a remessa já foi confirmada THEN "Confirmar" não é oferecido; ainda pode ser removida.
- IF o item é não encaminhado THEN ele não entra em atrasados/parados (não há atividade).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| IND-11 | P1: Alertas | Execute | Verified |
| IND-12 | P1: Alertas | Execute | Verified |
| ENT-01 | P1: Remessas | Execute | Verified |
| ENT-02 | P1: Remessas | Execute | Verified |
| ENT-03 | P1: Remessas | Execute | Verified |
| ENT-04 | P1: Remessas | Execute | Verified |
| ENT-05 | P1: Remessas | Execute | Verified |
| LAC-14 | P1: Sugestão | Execute | Verified |
| LAC-15 | P1: Sugestão | Execute | Verified |

**Coverage:** 9 total, 9 mapeados a tasks, 0 sem mapa ✅

---

## Success Criteria

- [x] Painel mostra os três tipos de alerta com links para o pedido.
- [x] Remessa programável/confirmável/removível pela interface, refletida no detalhe.
- [x] Setor sugerido pelo produto no desmembramento, com decisão final manual.
- [x] Suíte verde e build OK; validado contra o banco AWS real.
