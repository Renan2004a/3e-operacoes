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
| Remoção de prazo | AD-009/D3: não faz parte desta etapa. |
| Alerta comercial por prazo de entrega | AD-009/D4: dependia do atendimento integral (AD-011). **Parcialmente superado pela AD-025 (2026-10-28): implementado somente no detalhe; painel, lista e histórico continuam fora.** |
| Importar data de entrega do Top Gerente | AD-009/D8: conector inalterado; sem precedência. |
| Auditoria de alteração de prazo | AD-009/D7: etapa própria de RFN006. |
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
| Níveis independentes | Item = entrega; atividade = setor; sem herança | AD-009 | sim (2026-10-22) |
| Formato do prazo | Data civil `YYYY-MM-DD`, estrita | AD-009/D2 | sim |
| Semântica do dia | Fim do dia em `America/Sao_Paulo` | AD-009/D2 | sim |
| Remoção de prazo | Não suportada nesta etapa | AD-009/D3 | sim |
| Alerta comercial | Fora desta etapa (depende da AD-011) | AD-009/D4 | sim |
| Prazo operacional na UI | Somente leitura | AD-009/D5 | sim |
| Leitura | Perfis com `consultar_pedidos` | AD-009/D9 | sim |

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

### P1: Persistência e exibição dos prazos ⭐ MVP (AD-009)

**User Story**: Como Vendedor ou Gerente, quero ver o prazo que salvei mesmo depois de recarregar a página ou entrar novamente, para acompanhar a entrega sem perder a informação.

**Why P1**: O prazo era gravado no banco, mas não era devolvido pela API de detalhe nem hidratado na interface.

**Acceptance Criteria**:

1. WHEN o detalhe do pedido é consultado THEN o sistema SHALL devolver `deadlineAt` do item, com o valor persistido.
2. WHEN o detalhe do pedido é consultado THEN o sistema SHALL devolver `activityDeadlineAt` da atividade, quando houver.
3. WHEN a página é recarregada ou um novo login é feito THEN o sistema SHALL exibir o mesmo prazo persistido.
4. WHEN o item não tem prazo THEN o sistema SHALL exibir `Sem prazo` e o campo vazio.
5. WHEN o prazo é informado THEN o sistema SHALL aceitar apenas `YYYY-MM-DD` real; formatos ambíguos, datas inexistentes e timestamps SHALL ser rejeitados com `400`.
6. WHEN o prazo é para a data atual THEN o sistema SHALL considerá-lo `EM_DIA` até o fim do dia em `America/Sao_Paulo`.
7. WHEN o prazo é de um dia anterior e o escopo não está concluído THEN o sistema SHALL considerá-lo `ATRASADO`.
8. WHEN o prazo de um nível é alterado THEN o sistema SHALL NOT alterar o prazo do outro nível.
9. WHEN o pedido é reimportado THEN o sistema SHALL preservar os prazos locais.
10. WHEN o usuário tem `consultar_pedidos` THEN o sistema SHALL permitir leitura; a escrita SHALL exigir `definir_prazo`.

**Independent Test**: Salvar um prazo, recarregar a página e ver o mesmo dia; salvar a data de hoje e não ver atraso; alterar o prazo do item e conferir que o do setor não mudou.

---

## Edge Cases

- IF a atividade não existir THEN o sistema SHALL responder `404`.
- IF o item não existir THEN o sistema SHALL responder `404`.
- IF o usuário não tiver sessão THEN o sistema SHALL responder `401`.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Tasks | Status |
| --- | --- | --- | --- | --- |
| PRAZO-01 | P1: Definir | Execute | T1, T4, T5 | Verified (T1) |
| PRAZO-02 | P1: Definir | Execute | T1, T4, T6 | Verified (T1) |
| PRAZO-03 | P1: Definir | Execute | T5, T6 | Verified (T5, T6) |
| PRAZO-04 | P1: Definir | Execute | T1, T5, T6 | Verified (T1) |
| PRAZO-05 | P1: Atraso | Execute | T2 | Verified (T2) |
| PRAZO-06 | P1: Atraso | Execute | T2 | Verified (T2) |
| PRAZO-07 | P1: Atraso | Execute | T2 | Verified (T2) |
| PRAZO-08 | P1: Atraso | Execute | T2 | Verified (T2) |
| PRAZO-09 | P1: Atraso | Execute | T2 | Verified (T2) |
| PRAZO-10 | P1: Alertas | Execute | T3, T4, T7 | Verified (T3, T7) |
| PRAZO-11 | Edge: atividade inexistente | Execute | T1, T6 | Verified (T1, T6) |
| PRAZO-12 | Edge: item inexistente | Execute | T1, T5 | Verified (T1) |
| PRAZO-13 | P1: Persistência | Execute | T8 | Verified (T8) |
| PRAZO-14 | P1: Persistência | Execute | T8 | Verified (T8) |
| PRAZO-15 | P1: Persistência | Execute | T8, T9 | Verified (T8, T9) |
| PRAZO-16 | P1: Persistência | Execute | T9 | Verified (T9) |
| PRAZO-17 | P1: Datas | Execute | T8, T9 | Verified (T8, T9) |
| PRAZO-18 | P1: Datas | Execute | T8 | Verified (T8) |
| PRAZO-19 | P1: Independência | Execute | T8 | Verified (T8) |
| PRAZO-20 | P1: Reimportação | Execute | T8 | Verified (T8) |
| PRAZO-21 | P1: Permissões | Execute | T8 | Verified (T8) |

**Coverage:** 21 total, 21 mapped to tasks, 0 unmapped

---

## Success Criteria

- [x] Sem prazo nunca é atrasado.
- [x] Prazo ultrapassado com produção pendente é `ATRASADO`.
- [x] Só gerente e vendedor definem prazo.
- [x] A lista de alertas traz apenas atividades atrasadas.
- [x] O prazo do item sobrevive a F5 e a novo login.
- [x] O prazo de hoje não é atrasado; o de ontem é.
- [x] Item e atividade mantêm prazos independentes.
- [x] Formato de data estrito, sem deslocamento de dia.

---

## Adendo 2026-10-28 — AD-025 (atraso comercial do detalhe)

**Contexto:** o critério de atraso comercial que dependia da AD-011 foi decidido e implementado **somente no detalhe do pedido** (Vendedor/Gerente). O alerta operacional do painel não foi alterado.

**Fora deste adendo:** painel, lista, filtros, PCP e indicador histórico de entrega tardia. A entrega feita depois do prazo, mas já integral, não é sinalizada como atraso atual.

### P1: Atraso comercial do item ⭐ MVP

**User Story:** Como Vendedor ou Gerente, quero ver no detalhe se a entrega ao cliente está atrasada, para cobrar o atendimento sem confundir com o prazo do setor.

**Acceptance Criteria:**

1. WHEN o item não tem prazo de entrega THEN o sistema SHALL retornar `SEM_PRAZO`.
2. WHEN o prazo ainda não terminou THEN o sistema SHALL retornar `EM_DIA`.
3. WHEN o prazo terminou e `entregue < solicitado` THEN o sistema SHALL retornar `ATRASADO`.
4. WHEN o prazo terminou e `entregue >= solicitado` THEN o sistema SHALL retornar `EM_DIA`, ainda que a entrega tenha ocorrido depois do prazo.
5. The system SHALL NOT usar `executado`, `pendente` ou o status da atividade como substitutos da quantidade entregue.
6. The system SHALL calcular o status no servidor, com um único instante de referência para a resposta, e expor `statusPrazoEntrega` sem persistência.
7. WHEN `statusPrazoEntrega` for `ATRASADO` THEN o detalhe SHALL exibir “Entrega atrasada”; o prazo operacional do setor SHALL continuar independente.
8. WHEN uma nova consulta for feita THEN o status SHALL ser recalculado; não haverá atualização automática à meia-noite nem polling.

**Independent Test:** item solicitado 10, executado 10, entregue 0, prazo vencido → “Entrega atrasada”; depois de entregar 10, nova consulta → sem atraso.

### Edge Cases

- Revenda com indisponibilidade e sem entrega: atraso permanece; indisponibilidade não substitui entrega (AD-012, sujeita a T00.4).
- Item cancelado: não há campo/contrato; o cancelamento não é inferido pela ausência no payload (AD-010).
- Solicitado zero e entregue zero: `EM_DIA`; a validação comercial da importação não muda.
- Nova leitura com solicitado alterado: o status pode mudar; não há histórico.

### Requirement Traceability

| Requirement ID | Story | Tasks | Status |
| --- | --- | --- | --- |
| PRAZO-22 | P1: Atraso comercial — sem prazo | T10 | Implementado |
| PRAZO-23 | P1: Atraso comercial — prazo futuro | T10 | Implementado |
| PRAZO-24 | P1: Atraso comercial — produção sem entrega | T10, T11 | Implementado |
| PRAZO-25 | P1: Atraso comercial — atendimento integral | T10, T11 | Implementado |
| PRAZO-26 | P1: Atraso comercial — decimais e zero | T10 | Implementado |
| PRAZO-27 | P1: Atraso comercial — Revenda/independência operacional | T11 | Implementado |
| PRAZO-28 | P1: Atraso comercial — contrato da API | T12 | Implementado |
| PRAZO-29 | P1: Atraso comercial — interface Vendedor/Gerente | T12 | Implementado |

**Coverage:** 8 novos critérios mapeados para T10–T12; os 21 critérios anteriores permanecem válidos.
