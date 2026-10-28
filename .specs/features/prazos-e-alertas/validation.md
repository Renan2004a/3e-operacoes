# Prazos e Alertas Validation

**Date**: 2026-10-07
**Spec**: `.specs/features/prazos-e-alertas/spec.md`
**Diff range**: `d3d30b7..4a231c6` (7 feature commits T1–T7; spec/design/tasks at `dcb68fd`)
**Verifier**: independent sub-agent (author ≠ verifier)

**Result**: ✅ PASS — 12/12 ACs matched spec outcome, 0 blocking gaps, 1 minor coverage gap.

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `d3d30b7` — `prazo.ts` + 7 unit tests |
| T2   | ✅ Done | `71d94b0` — `atraso.ts` + 6 unit tests |
| T3   | ✅ Done | `002677a` — `alertas.ts` + 4 unit tests |
| T4   | ✅ Done | `5ee1435` — Prisma adapter (no tests per matrix) |
| T5   | ✅ Done | `e8f77b2` — item route + 6 integration tests |
| T6   | ✅ Done | `758838b` — activity route + 6 integration tests |
| T7   | ✅ Done | `4a231c6` — alerts route + 5 integration tests |

---

## Spec-Anchored Acceptance Criteria

Evidence-or-zero: every AC traced to `file:line` + assertion expression, with the spec-defined outcome re-derived from `spec.md`.

### P1: Definir prazo

| AC | Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| -- | ------------------------- | -------------------- | ----------------------- | ------ |
| PRAZO-01 | Authorized user defines item deadline → persist item date | `OrderItem.deadlineAt` = submitted date, item returned | `src/app/api/pedidos/itens/[itemId]/prazo/route.test.ts:79-83` - `expect(response.status).toBe(200)`; `expect(body.item.deadlineAt).toBe(prazo)`; `expect(mocks.itens.get('item_1')).toEqual(new Date(prazo))`. Unit: `src/modules/prazos/prazo.test.ts:40` `expect(prazosItens.get('item_1')).toEqual(prazo)` | ✅ PASS |
| PRAZO-02 | Authorized user defines activity deadline → persist sector date | `Activity.deadlineAt` = submitted date | `src/app/api/producao/atividades/[id]/prazo/route.test.ts:76-80` - `expect(body.atividade.deadlineAt).toBe(prazo)`; `expect(mocks.atividades.get('act_1')).toEqual(new Date(prazo))`. Unit: `prazo.test.ts:79` | ✅ PASS |
| PRAZO-03 | IF user is neither manager nor seller THEN reject with `403` | HTTP 403, nothing persisted | `route.test.ts:94-96` (item) `expect(response.status).toBe(403)`; `expect(error).toBe('forbidden')`; `expect(mocks.itens.get('item_1')).toBeNull()`. `atividades/[id]/prazo/route.test.ts:91-93` (activity). Matrix: `src/modules/usuarios/permissoes.test.ts:13` `expect(pode(['SELLER'], 'definir_prazo')).toBe(true)` | ✅ PASS (see Gap 1) |
| PRAZO-04 | IF date invalid THEN reject with `400` | HTTP 400, nothing persisted | `route.test.ts:104-106` - `expect(response.status).toBe(400)`; `expect(error).toBe('invalid_deadline')`; `expect(mocks.itens.get('item_1')).toBeNull()`; absent-field `:114-115`. Activity `:101-103`, `:111-112`. Unit `prazo.test.ts:56-59` `rejects.toBeInstanceOf(PrazoInvalidoError)` | ✅ PASS |

### P1: Status de prazo e atraso

| AC | Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| -- | ------------------------- | -------------------- | ----------------------- | ------ |
| PRAZO-05 | Item has no deadline → return `SEM_PRAZO` | exactly `'SEM_PRAZO'` | `src/modules/prazos/atraso.test.ts:8` - `expect(calcularStatusPrazo({ prazo: null, concluido: false, agora: AGORA })).toBe('SEM_PRAZO')` | ✅ PASS |
| PRAZO-06 | Deadline not yet passed → `EM_DIA` | exactly `'EM_DIA'` (future and equality) | `atraso.test.ts:17` - `toBe('EM_DIA')` (future); `atraso.test.ts:21` - `toBe('EM_DIA')` at `prazo === agora` boundary | ✅ PASS |
| PRAZO-07 | Deadline passed AND not concluded → `ATRASADO` | exactly `'ATRASADO'` | `atraso.test.ts:26` - `expect(calcularStatusPrazo({ prazo: PASSADO, concluido: false, agora: AGORA })).toBe('ATRASADO')` | ✅ PASS |
| PRAZO-08 | Deadline passed AND concluded → NOT overdue | not `'ATRASADO'`; test pins `'EM_DIA'` | `atraso.test.ts:31` - `expect(calcularStatusPrazo({ prazo: PASSADO, concluido: true, agora: AGORA })).toBe('EM_DIA')` | ✅ PASS |
| PRAZO-09 | Compute overdue only for scope with a deadline; no deadline never overdue | `'SEM_PRAZO'` even when concluded | `atraso.test.ts:12` - `expect(calcularStatusPrazo({ prazo: null, concluido: true, agora: AGORA })).toBe('SEM_PRAZO')` | ✅ PASS |

### P1: Alertas de atraso

| AC | Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| -- | ------------------------- | -------------------- | ----------------------- | ------ |
| PRAZO-10 | Manager queries alerts → overdue, past-deadline, not-concluded activities | list contains exactly the overdue activity (id + deadline), excludes future/completed/no-deadline | `src/modules/prazos/alertas.test.ts:41-42` - `expect(alertas.map(a => a.id)).toEqual(['act_atrasada'])`; `expect(alertas[0].deadlineAt).toEqual(PASSADO)`; completed excluded `:53`; no-deadline excluded `:64`; empty `:76`. Route `src/app/api/producao/alertas/route.test.ts:89` `expect(body.alertas.map(a => a.id)).toEqual(['act_atrasada'])`; `:102`, `:115`, `:125` | ✅ PASS |

### Edge cases

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PRAZO-11: activity missing | HTTP 404 | `atividades/[id]/prazo/route.test.ts:121-122` - `expect(response.status).toBe(404)`; `expect(error).toBe('activity_not_found')`. Unit `prazo.test.ts:100` | ✅ PASS |
| PRAZO-12: item missing | HTTP 404 | `itens/[itemId]/prazo/route.test.ts:121-122` - `expect(response.status).toBe(404)`; `expect(error).toBe('item_not_found')`. Unit `prazo.test.ts:67` | ✅ PASS |
| No session | HTTP 401 | item `route.test.ts:133`; activity `route.test.ts:133`; alerts `route.test.ts:131` - `expect(response.status).toBe(401)` | ✅ PASS |

**Payload/conjunction rule:** route tests assert the returned payload value (`body.item.deadlineAt`, `body.atividade.deadlineAt`) and the repository side effect (map value), not merely that the call happened. PRAZO-10 asserts the exact id list *and* `deadlineAt` value.

**Status**: ✅ All 12 ACs covered and matched to spec outcome.

---

## Discrimination Sensor

Scratch isolation: original files copied to a temp backup dir; each mutation applied in the real tree, targeted tests run, file restored from backup. Never `git stash`. Baseline `git status --porcelain` empty and `git diff` empty before and after.

| # | Mutation | File:line | Description | Killed? |
| - | -------- | --------- | ----------- | ------- |
| 1 | No-deadline branch | `src/modules/prazos/atraso.ts:23` | `return 'SEM_PRAZO'` → `return 'ATRASADO'` when `!prazo` | ✅ Killed (PRAZO-05, PRAZO-09 failed) |
| 2 | `agora > prazo` boundary | `atraso.ts:24` | `>` → `>=` | ✅ Killed (PRAZO-06 equality test failed) |
| 3 | Concluded guard | `atraso.ts:24` | Removed `&& !concluido` | ✅ Killed (PRAZO-08 + 2 alert tests failed) |
| 4 | Permission action | `src/app/api/pedidos/itens/[itemId]/prazo/route.ts:14` | `'definir_prazo'` → `'consultar_pedidos'` | ✅ Killed (PRAZO-03 403 test failed: got 200) |
| 5 | Alert filter | `src/modules/prazos/alertas.ts:43` | `if (status !== 'ATRASADO')` → `if (status === 'ATRASADO')` | ✅ Killed (8 failures across unit + route) |
| 6 | Permission matrix | `src/modules/usuarios/permissoes.ts:39` | `definir_prazo: ['PRODUCTION_MANAGER','SELLER']` → `['PRODUCTION_MANAGER']` | ✅ Killed by `permissoes.test.ts:13`; **route tests survived** (gap evidence, see Gap 1) |

**Sensor depth**: lightweight (6 behavior-level mutations, ≥5 required).
**Result**: 6/6 killed at intended target; 0 true survivors. Mutation 6 empirically confirmed the SELLER route-level coverage gap.
**Isolation verified**: after cleanup `git status --porcelain` empty, `git diff --stat` empty, `HEAD` unchanged at `4a231c6` (matches pre-sensor baseline).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ Domain is 3 small pure functions + 1 adapter + 3 thin routes |
| Surgical changes | ✅ Only feature files touched; no unrelated edits |
| No scope creep | ✅ No new schema, no notifications/UI (explicitly out of scope) |
| Matches patterns | ✅ Reuses `autorizar`/`pode`, `prisma`, session helpers, existing test style |
| Spec-anchored outcome check | ✅ Asserted values match spec-defined outcomes |
| Per-layer Coverage Expectation met | ✅ Domain 1:1 ACs; routes happy+edge+error; adapter build-gate only (AD-002) |
| Every test maps to a spec requirement | ✅ 34 added tests all map to PRAZO-01..12 / AUTH-14 edge |
| Documented guidelines followed | ✅ `docs/testes.md`, `AGENTS.md`, `vitest.config.ts` |

---

## Edge Cases

- [x] Activity missing → 404 (PRAZO-11) — unit + route
- [x] Item missing → 404 (PRAZO-12) — unit + route
- [x] No session → 401 — all three routes
- [x] No deadline never overdue (PRAZO-05/09) — including concluded-with-no-deadline
- [x] Boundary `prazo === agora` is not overdue (PRAZO-06)

---

## Gate Check

Gate command (from `tasks.md` Build level): `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`

| Step | Exit | Notes |
| ---- | ---- | ----- |
| `prisma:generate` | 0 | Client generated |
| `lint` | 0 | 0 errors, 2 pre-existing warnings in `postcss.config.mjs` / `prettier.config.mjs` (not feature files) |
| `typecheck` | 0 | — |
| `typecheck:connector` | 0 | — |
| `test:coverage` | 0 | **59 files, 394 tests passed**, 0 failed, 0 skipped; overall 96.16% stmts |
| `build` | 0 | All 3 feature routes emitted (`/api/pedidos/itens/[itemId]/prazo`, `/api/producao/atividades/[id]/prazo`, `/api/producao/alertas`) |

- **Test count before feature**: 360 (394 − 34 added)
- **Test count after feature**: 394
- **Delta**: +34 (7 + 6 + 4 + 6 + 6 + 5); no test deletions in the feature commits
- **Failures**: none
- **Skipped**: none

---

## Deviations Investigated

1. **Composed `PrazosRepository` port** (`src/modules/prazos/adapters/prisma-prazos-repository.ts:6`). Design describes a single `PrazosRepository` port; implementation splits it into `PrazoRepository` (`prazo.ts:8`) and `AlertasRepository` (`alertas.ts:22`) and composes them. Verdict: **acceptable refinement** (interface segregation); the adapter satisfies every interface the design requires and all consumers type-check against it. Not a spec violation.
2. **Dropped route-level SELLER test.** Route tests exercise `PRODUCTION_MANAGER` (200) and `OPERATOR` (403) only; no `SELLER` session test at either route. `definir_prazo` for SELLER is covered **only** by the matrix unit test `permissoes.test.ts:13`. Since both routes call the shared `autorizar(request, 'definir_prazo')`, the behavior is correct, but the end-to-end positive SELLER path is untested at the route layer. Logged as Gap 1 (minor).

---

## Ranked Gaps

| # | Gap | AC | Severity | Evidence |
| - | --- | -- | -------- | -------- |
| 1 | No route-level SELLER happy-path test; SELLER authorization covered only by `permissoes.test.ts:13`. Mutation 6 removing SELLER from the matrix passed all route tests. | PRAZO-03 / Assumption "gerente e vendedor" | Minor (non-blocking; behavior verified via shared matrix) | `route.test.ts` only sets `user_mgr`/`user_operador` |

No blocking gaps. The spec-defined `403` outcome for unauthorized profiles is directly asserted; the SELLER-positive path is a coverage depth gap, not a functional defect.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| PRAZO-01 | Done (T1) | ✅ Verified |
| PRAZO-02 | Done (T1) | ✅ Verified |
| PRAZO-03 | Done (T5, T6) | ✅ Verified (minor route-level depth gap) |
| PRAZO-04 | Done (T1) | ✅ Verified |
| PRAZO-05 | Done (T2) | ✅ Verified |
| PRAZO-06 | Done (T2) | ✅ Verified |
| PRAZO-07 | Done (T2) | ✅ Verified |
| PRAZO-08 | Done (T2) | ✅ Verified |
| PRAZO-09 | Done (T2) | ✅ Verified |
| PRAZO-10 | Done (T3, T7) | ✅ Verified |
| PRAZO-11 | Done (T1, T6) | ✅ Verified |
| PRAZO-12 | Done (T1) | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready.

**Spec-anchored check**: 12/12 ACs matched spec outcome, 0 blocking gaps, 1 minor coverage gap flagged.
**Sensor**: 6/6 mutations killed (0 true survivors).
**Gate**: 6/6 steps passed (394 tests, 0 failed).

**What works**: Item and activity deadlines persist with 400/403/404/401 handling; status derivation returns `SEM_PRAZO`/`EM_DIA`/`ATRASADO` with correct UTC boundary and concluded guard; alerts list only past-due, not-concluded activities.

**Issues found**: Only Gap 1 (minor, non-blocking) — add a SELLER route-level test if the team wants end-to-end proof of the seller path.

**Next steps**: Feature is ready to archive. Optionally address Gap 1 in a follow-up test-only task.

---

# AD-009 — Persistência, exibição e acompanhamento dos prazos

**Date**: 2026-10-22
**Spec**: `.specs/features/prazos-e-alertas/spec.md` (PRAZO-13 a PRAZO-21)
**Status**: ✅ Implementado e validado localmente. Validação no navegador pendente.

## Causa identificada

O prazo era gravado corretamente em `pedidos_itens.deadlineAt`, mas:

1. `prisma-indicadores-repository.buscarEspecificacoesDosItens` não selecionava `deadlineAt` e `EspecificacaoItem`/`ItemDetalhado` não tinham o campo.
2. `PedidoDetalhe` exibia apenas estado local (`salvos`), perdido ao desmontar/recarregar.

O banco, a migration, a permissão `definir_prazo` e a sincronização foram verificados e **não** eram a causa. A sincronização preserva o campo porque o bloco `update` do upsert não o inclui.

## Critérios e evidências

| AC | Critério | Evidência | Resultado |
| -- | --- | --- | --- |
| PRAZO-13 | Detalhe devolve o prazo do item | `src/app/api/pedidos/[orderId]/route.test.ts` (teste “devolve o prazo de entrega…”), `src/modules/indicadores/consulta-pedidos.test.ts`, `prazos.integration.test.ts` (persistência e detalhe) | ✅ |
| PRAZO-14 | Detalhe devolve o prazo da atividade | Mesmos testes; `activityDeadlineAt` no adapter e no detalhe | ✅ |
| PRAZO-15 | F5 e novo login mantêm o prazo | `src/app/(app)/vendedor/pedidos/[orderId]/page.test.tsx` (desmonta e renderiza de novo), `prazos.integration.test.ts` (novo acesso ao banco) | ✅ |
| PRAZO-16 | Sem prazo exibe “Sem prazo” | Testes do Vendedor e do Gerente; item sem prazo no detalhe | ✅ |
| PRAZO-17 | Formato estrito; inválidos/ambíguos → 400 | `src/modules/prazos/prazo.test.ts` (`validarPrazo`), rotas do item e da atividade (timestamp rejeitado), `dia-do-periodo.test.ts` e `dia-civil.test.ts` | ✅ |
| PRAZO-18 | Hoje não é atrasado; ontem é | `dia-do-periodo.test.ts` (`fimDoDiaNoFuso`), `atraso.test.ts` (fronteira) e integração com o fim do dia | ✅ |
| PRAZO-19 | Níveis independentes | `prazos.integration.test.ts` (define item, confere atividade nula; define atividade, confere item inalterado) | ✅ |
| PRAZO-20 | Reimportação preserva os prazos | `prazos.integration.test.ts` (`upsertOrder` após definir os dois prazos) | ✅ |
| PRAZO-21 | Leitura `consultar_pedidos`; escrita `definir_prazo` | Rota do detalhe (sessão/perfil) e rota de prazo (403 para Operador, 200 para Vendedor); UI esconde o formulário quando os perfis carregados não podem definir prazo | ✅ |

## Datas e fuso

- `YYYY-MM-DD` → fim do dia em `America/Sao_Paulo` (`fimDoDiaNoFuso`), ex.: `2026-02-01` → `2026-02-02T02:59:59.999Z`.
- Exibição e input usam `formatarDiaCivil`/`diaCivilParaInput` com fuso explícito.
- Horário de verão histórico coberto (`2018-11-10`, `2019-02-16`), inclusive o dia com 25 horas.
- Nenhum dado existente foi convertido (D6); não houve migração.

## Testes executados

| Gate | Comando | Resultado |
| --- | --- | --- |
| Testes | `npm test` | **866 aprovados**, 23 ignorados (2 arquivos de integração) |
| Integração MySQL | `RUN_INTEGRATION_TESTS=1 npx vitest run …` (banco `3e_operacoes_integration`) | **23 aprovados** (17 de consulta + 6 de prazos) |
| Lint | `npm run lint` | 0 erros; 4 avisos pré-existentes |
| Typecheck | `npm run typecheck` | OK |
| Build | `npm run build` | OK |

## Riscos residuais

- Prazos antigos em meia-noite UTC só são corrigidos re-salvando pela interface; não há script.
- O detalhe usa uma atividade por item (`take: 1`), então itens com múltiplas atividades mostram apenas a primeira no prazo operacional.
- O badge do item exibe a data sem sinalizar atraso. A indicação de atraso do item depende do critério de conclusão (AD-011); o cálculo de domínio (`calcularStatusPrazo`) já existe. Registrado no backlog.
- Alerta comercial, remoção, auditoria e edição do prazo operacional seguem fora do escopo (D3, D4, D5, D7).

---

## Adendo V04 — atraso comercial pela entrega (AD-025, 2026-10-28)

**Result**: ✅ PASS nos critérios do adendo. A observação histórica “o badge do item exibe a data sem sinalizar atraso” fica **superada** para o detalhe; painel, lista e histórico continuam fora.

### Evidências por critério

| AC | Critério | Evidência | Resultado |
| -- | --- | --- | --- |
| PRAZO-22 | Sem prazo → `SEM_PRAZO` | `src/modules/prazos/status-prazo-entrega.test.ts` (sem prazo); `consulta-pedidos.test.ts` (detalhe sem prazo) | ✅ |
| PRAZO-23 | Prazo futuro → sem atraso | `status-prazo-entrega.test.ts` (prazo futuro) | ✅ |
| PRAZO-24 | Solicitado 10, executado 10, entregue 0 → `ATRASADO` | `status-prazo-entrega.test.ts`; `consulta-pedidos.test.ts` (produzido e não entregue) | ✅ |
| PRAZO-25 | Atendimento integral → `EM_DIA`; 8/8/10 → `ATRASADO` | `status-prazo-entrega.test.ts` (entregue 10 e 12; caso 8 de 10); `consulta-pedidos.test.ts` (independência do status operacional) | ✅ |
| PRAZO-26 | Decimais e solicitado zero | `status-prazo-entrega.test.ts` (10,00/9,99; 0/0) | ✅ |
| PRAZO-27 | Revenda/indisponibilidade e independência operacional | `consulta-pedidos.test.ts` (Revenda sem entrega; atividade `COMPLETED` x entrega incompleta) | ✅ |
| PRAZO-28 | API devolve `statusPrazoEntrega` | `src/app/api/pedidos/[orderId]/route.test.ts` (campo e caso atrasado) | ✅ |
| PRAZO-29 | Vendedor e Gerente exibem “Entrega atrasada” | `src/app/(app)/vendedor/pedidos/[orderId]/page.test.tsx` (3 casos) e `src/app/(app)/gerente/pedidos/[orderId]/page.test.tsx` (1 caso) | ✅ |

### Gates executados

| Gate | Comando | Resultado |
| --- | --- | --- |
| Testes | `npm test` | **1085 aprovados**, 24 ignorados (125 arquivos aprovados, 2 ignorados) |
| Lint | `npm run lint` | 0 erros; 7 avisos pré-existentes |
| Typecheck | `npm run typecheck` | OK |
| Build | `DATABASE_URL` fictícia + `npm run build` | OK; nenhuma operação de banco |
| Diff | `git diff --check` | OK |

### Limitações

- Validação no navegador/E2E **não executada** nesta entrega; a cobertura é de domínio, consulta, rota e componente.
- Revenda com indisponibilidade continua sujeita à T00.4; o atraso não é encerrado pela indisponibilidade (AD-012).
- Cancelamento depende da AD-010; não há campo/contrato e a ausência no payload não é usada.
- Não há indicador histórico de entrega tardia, alerta comercial no painel/lista ou atualização automática à meia-noite.
