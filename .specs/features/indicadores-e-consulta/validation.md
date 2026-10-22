# indicadores-e-consulta Validation

**Date**: 2026-10-07
**Spec**: `.specs/features/indicadores-e-consulta/spec.md`
**Diff range**: `32b4cb6..55d3f38` (docs commit → T7; 7 feature commits)
**Verifier**: independent sub-agent (author ≠ verifier)

## Validation — PASS

**Verdict**: PASS

Functionally correct: all 11 ACs have a concrete `file:line` + assertion, the full build gate is green (429 tests), and all 6 injected behavior-level mutants were killed. Two ACs rest on thin evidence and three behaviors are under-specified by the spec; they are ranked as gaps below and do not invalidate the verdict.

---

## Task Completion

| Task | Commit | Status | Notes |
| ---- | ------ | ------ | ----- |
| T1 Consulta de pedidos | `32d88c3` | ✅ Done | 8 unit tests; filters + detail + 404 |
| T2 Painel consolidado | `78f5904` | ✅ Done | 5 unit tests; sector/status counts + pendências |
| T3 Indicadores de PCP | `db3bf17` | ✅ Done | 6 unit tests; production sum + prazo |
| T4 Repositório Prisma | `f3debce` | ✅ Done | Adapter; build gate |
| T5 Rota de lista | `51e2a00` | ✅ Done | 6 integration tests |
| T6 Rota de detalhe | `0763c84` | ✅ Done | 5 integration tests |
| T7 Rota de indicadores | `55d3f38` | ✅ Done | 5 integration tests |

Feature tests added: 35 (8 + 5 + 6 + 6 + 5 + 5). No pre-existing test files were modified (diff stat confirms only feature files added).

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| IND-01 consulta lista retorna número, cliente e status | Each row exposes `numero`, `cliente`, `status` | `src/modules/indicadores/consulta-pedidos.test.ts:95` - `expect(lista.map((l) => [l.numero, l.cliente, l.status])).toEqual([...])`; `src/app/api/pedidos/route.test.ts:92` - `expect(body.pedidos[0]).toEqual({ id, numero, cliente, status })` | ✅ PASS |
| IND-02 filtra por cliente, setor, status e período | Each filter narrows the list | `consulta-pedidos.test.ts:111` cliente (case-insensitive); `:130` setor; `:149` status; `:164` período inclusive nas bordas; `:176` limite/offset; `src/app/api/pedidos/route.test.ts:110` cliente+status; `:118` filtro inválido → `invalid_filters` | ✅ PASS |
| IND-03 vendedor vê todos os pedidos, somente leitura | SELLER autorizado; sem escopo por vendedor; apenas leitura | `src/app/api/pedidos/route.test.ts:75` `mocks.perfis.user_vendedor = ['SELLER']`; `:87` `expect(response.status).toBe(200)`; `route.ts:29` exports only `GET`; no seller filter in `prisma-indicadores-repository.ts:20` | ⚠️ Partial (evidence thin - see Gap 1) |
| IND-04 detalhe traz 5 valores por item | `solicitado`, `executado`, `disponivel`, `entregue`, `pendente` | `consulta-pedidos.test.ts:204-208` - `10 / 8 / 5 / 3 / 2`; `src/app/api/pedidos/[orderId]/route.test.ts:106` - `expect(body.pedido.itens[0]).toEqual({ itemId, solicitado:'10', executado:'8', disponivel:'5', entregue:'3', pendente:'2' })` | ✅ PASS |
| IND-05 painel retorna contagem por setor e por status | `porSetor[]` and `porStatus[]` totals | `src/modules/indicadores/painel.test.ts:30` - `expect(painel.porSetor).toEqual([{sectorId:'setor_corte',total:1},{sectorId:'setor_telhas',total:2}])`; `:46` porStatus; `src/app/api/indicadores/route.test.ts:107-115` | ✅ PASS |
| IND-06 painel retorna pendências (não concluídas) | Count of activities whose status ≠ `COMPLETED` | `painel.test.ts:62` - `expect(painel.pendencias).toBe(2)` (PENDING+PAUSED); `:79` `toBe(0)`; `indicadores/route.test.ts:116` `toBe(2)` | ✅ PASS |
| IND-07 produção por setor | Sum of `Execution.quantity` per sector | `src/modules/indicadores/pcp.test.ts:54` - `expect(pcp.producaoPorSetor[0].quantidade.toString()).toBe('10')`; `:64-69` split; `indicadores/route.test.ts:129` - `[{ sectorId:'setor_telhas', quantidade:'10' }]` | ✅ PASS |
| IND-08 cumprimento de prazo das atividades com prazo | concluded-on-time ÷ concluded-with-deadline; no-deadline excluded | `pcp.test.ts:92-94` `concluidasComPrazo=3 / noPrazo=2 / 66.67`; `:112-114` sem prazo ignorada; `:130-134` zero sem concluídas com prazo; `indicadores/route.test.ts:154` | ✅ PASS |
| IND-09 indicadores apenas com dados do banco do app | No legacy/connector source used | `pcp.test.ts:137-140` - `readFileSync(...).not.toMatch(/conector\|legado\|integracao/i)`; adapter reads only `prisma` (`prisma-indicadores-repository.ts:1,21,61,68,78`) | ⚠️ Partial (assertion is a static source proxy - see Gap 2) |
| IND-10 pedido inexistente responde 404 | HTTP 404 | `consulta-pedidos.test.ts:214` - `rejects.toBeInstanceOf(PedidoNaoEncontradoError)`; `src/app/api/pedidos/[orderId]/route.test.ts:128` - `expect(response.status).toBe(404)`, `error: 'order_not_found'` | ✅ PASS |
| IND-11 sem sessão responde 401 | HTTP 401 | `src/app/api/pedidos/route.test.ts:127` - `expect(response.status).toBe(401)`, `error: 'unauthorized'`; `[orderId]/route.test.ts:135`; `indicadores/route.test.ts:165`; plus 403 no-profile at `route.test.ts:140` | ✅ PASS |

**Status**: 9 ✅ PASS, 2 ⚠️ Partial, 3 spec-precision gaps flagged. Payload/conjunction rule: IND-01, IND-04, IND-05, IND-06, IND-07, IND-08 assert full payload objects on value/state (not mere call occurrence). ✅

---

## Discrimination Sensor

Scratch method: file backups under `%TEMP%\opencode\sensor-backup`; each mutation applied to the real source, targeted `npx vitest run <file>` executed, then the file restored from backup. `git stash` was never used. Baseline `git status --porcelain` (empty) matched after cleanup.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| M1 filter predicate (setor) | `consulta-pedidos.ts:110` | `a.sectorId === filtros.setor` → `!==` | ✅ Killed |
| M2 pendências definition | `painel.ts:53` | `status !== 'COMPLETED'` → `status === 'COMPLETED'` | ✅ Killed |
| M3 production-per-sector sum | `pcp.ts:59` | `acumulado.plus(quantidade)` → `acumulado.minus(quantidade)` | ✅ Killed |
| M4 prazo-compliance deadline filter | `pcp.ts:69` | `completedAt <= deadlineAt` → `completedAt >= deadlineAt` | ✅ Killed |
| M5 app-only guard | `pcp.ts:56` | injected `legado` token into `pcp.ts` source | ✅ Killed |
| M6 order-status derivation | `consulta-pedidos.ts:80` | empty-activity status `'PENDING'` → `'COMPLETED'` | ✅ Killed |

**Sensor depth**: expanded (6 mutations; P0-style ≥5). **Result**: 6/6 killed. Isolation confirmed: `git status --porcelain` empty before and after; HEAD unchanged at `55d3f38`.

Note on M5: the app-only guard is killed only because IND-09's test inspects source text. A behavior-level mutation that made the *adapter* read a legacy source would not be caught by any test (Gap 2).

---

## Gate Check

- **Gate command**: `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`
- **Result**: 6 passed, 0 failed
  - `prisma:generate` ✅ (client generated)
  - `lint` ✅ (0 errors, 2 pre-existing warnings in `postcss.config.mjs`, `prettier.config.mjs` - not in feature scope)
  - `typecheck` ✅
  - `typecheck:connector` ✅
  - `test:coverage` ✅ 65 files / 429 tests passed; coverage 96.42% stmts, 93.53% branch
  - `build` ✅ (routes `/api/pedidos`, `/api/pedidos/[orderId]`, `/api/indicadores` emitted as dynamic)
- **Test count before feature**: 394 (derived: 429 − 35 new feature tests; no pre-existing test modified)
- **Test count after feature**: 429
- **Delta**: +35
- **Skipped tests**: none
- **Failures**: none

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes (only feature files) | ✅ |
| No scope creep | ✅ |
| Matches patterns (port/adapter, `autorizar`, vitest) | ✅ |
| Spec-anchored outcome check (asserted values match spec) | ⚠️ IND-03/IND-09 thin (Gaps 1-2) |
| Per-layer Coverage Expectation (domain 1:1 ACs; routes happy+edge+error) | ✅ |
| Every test maps to a spec AC / Done-when (no unclaimed tests) | ✅ |
| Documented guidelines followed | ✅ `docs/testes.md`, `vitest.config.ts`, `docs/regras-negocio.md` |

---

## Edge Cases

- [x] Pedido inexistente → `404` (`[orderId]/route.test.ts:125-130`)
- [x] Sem sessão → `401` (all three route tests); no-profile → `403`
- [x] Sem atividades → status `PENDING`, painel vazio, percentual `0`
- [x] Filtro inválido → `400 invalid_filters`

---

## Gaps (ranked)

### Gap 1 - IND-03 "todos os pedidos" lacks a direct assertion (Minor)
- **Where**: `src/app/api/pedidos/route.test.ts:100-111` (seeds two orders, then filters) and `:84-98` (one order). No test seeds orders across different `sellerName` values and asserts the seller receives all of them; read-only is structural (only `GET` exported) with no assertion.
- **Classification**: coverage/spec-precision gap, not a functional defect - the query has no seller scoping (`prisma-indicadores-repository.ts:20`) and `consultar_pedidos` allows all profiles (`src/modules/usuarios/permissoes.ts:28`).
- **Fix**: add a route test seeding ≥2 orders (distinct sellers) with no filters and assert both returned; assert the route module exports no mutating handler.

### Gap 2 - IND-09 relies on a static source-text assertion (Minor)
- **Where**: `src/modules/indicadores/pcp.test.ts:137-140` reads `pcp.ts` and regex-matches for legacy keywords. It proves the domain file has no such token, not that the adapter reads only the app DB.
- **Classification**: weak/spec-precision gap; discriminates only source text (kills M5), not behavior.
- **Fix**: add an adapter-level test (or type/port assertion) that `listarExecucoes`/`listarAtividadesComPrazo`/`listarPedidosParaConsulta` call only `prisma`.

### Gap 3 - Pagination defaults and ordering undefined (Major, spec-precision)
- **Where**: defaults `LIMITE_PADRAO = 20`, `OFFSET_PADRAO = 0` at `consulta-pedidos.ts:71-72` are not in the spec (assumption table marks pagination "não" confirmed). The repository `prisma.order.findMany` (`prisma-indicadores-repository.ts:21`) has **no `orderBy`**, so offset pagination has no stable order and can skip/duplicate rows across calls.
- **Classification**: genuine spec-precision gap with defect risk; the AC text (IND-02) does not define defaults or ordering.
- **Fix**: specify the default limit and an explicit stable ordering (e.g. `createdAt desc, id`) in spec/design, and add `orderBy` in the adapter plus a test asserting order stability across pages.

### Gap 4 - Prazo completion moment inferred from last `Execution.occurredAt` (Major, spec-precision)
- **Where**: `prisma-indicadores-repository.ts:84-97` takes `executions orderBy occurredAt desc take 1` as `completedAt` (no `completedAt` column exists). `pcp.ts:62-70` counts a `COMPLETED` activity with a deadline but `completedAt === null` in the denominator and not the numerator - i.e. it is scored as late.
- **Classification**: genuine spec-precision gap with defect risk. The spec defines the ratio ("concluídas no prazo ÷ concluídas com prazo") but never defines the completion moment; using the last execution timestamp is an undocumented assumption.
- **Fix**: define completion semantics (first execution reaching requested quantity? status-transition timestamp?) and cover the `COMPLETED`-with-no-execution case with a test.

### Gap 5 - Order status derivation rule not in spec (Minor, spec-precision)
- **Where**: `consulta-pedidos.ts:79-84` derives `PENDING`/`IN_PROGRESS`/`COMPLETED` from item activities; `Order` has no status column (`prisma/schema.prisma:111-125`). Spec IND-01 only requires a `status` field and never defines its source; `design.md` is silent.
- **Classification**: spec-precision gap; the rule is reasonable and pinned by tests (`consulta-pedidos.test.ts:95-100`), but the spec does not state it.
- **Fix**: document the derivation rule in spec/design (or add a `status` column) and keep the existing test.

### Gap 6 - Documented design deviation (Info)
- **Where**: `pcp.ts:48-50` `SPEC_DEVIATION`: `design.md` declares `montarPcp(agora)`, implementation omits `agora` because the formula depends on completion time, not now. Correct and explicitly documented.

### Gap 7 - Cliente filter semantics unspecified (Minor)
- **Where**: `consulta-pedidos.ts:86-88` implements substring, case-insensitive match. Spec IND-02 says "filtrar por cliente" without exact-vs-contains semantics.

---

## Requirement Traceability Update

Spec.md already records all IND-01..IND-11 as `Done`. Recommended status after verification:

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| IND-01 | Done | ✅ Verified (rule gap noted) |
| IND-02 | Done | ✅ Verified (pagination gap noted) |
| IND-03 | Done | ✅ Verified (coverage thin) |
| IND-04 | Done | ✅ Verified |
| IND-05 | Done | ✅ Verified |
| IND-06 | Done | ✅ Verified |
| IND-07 | Done | ✅ Verified |
| IND-08 | Done | ✅ Verified (completion-moment gap noted) |
| IND-09 | Done | ✅ Verified (weak assertion) |
| IND-10 | Done | ✅ Verified |
| IND-11 | Done | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready (with flagged precision gaps)

**Spec-anchored check**: 9/11 ACs matched spec outcome, 2 partial (IND-03, IND-09), 3 spec-precision gaps (Gaps 3-5)
**Sensor**: 6/6 mutations killed
**Gate**: 6/6 passed; 429 tests

**What works**: read-only order listing with cliente/setor/status/período filters and limit/offset; order detail with the five per-item values; panel counts by sector and status plus pendências; PCP production-per-sector sum and deadline compliance over activities that have a deadline; 401/403/404 handling; app-DB-only adapter.

**Issues found**: none blocking. Ranked precision/coverage gaps 1-7 above.

**Next steps**: route Gaps 3 and 4 to a spec clarification + fix task; add the two missing assertions (Gaps 1-2) in a follow-up hardening task.

---

## A1 — Paginação e otimização (2026-10-22)

**Verdict**: PASS local (validação no navegador pendente)

Correção AD-020: filtros, ordenação e paginação no MySQL; total com os filtros; navegação na interface; sem alteração de banco, migração ou CI.

| Critério | Evidência |
| --- | --- |
| Filtros antes da paginação | `src/modules/indicadores/adapters/filtros-pedidos-prisma.ts` + `consulta-pedidos.integration.test.ts` (combinação de número, cliente, setor, status e período) |
| Pedidos com vários setores sem duplicar | `consulta-pedidos.integration.test.ts` — listagem e `total` iguais a 1 nos dois setores |
| Status global preservado | `consulta-pedidos.integration.test.ts` — TELHAS `PENDING` + CORTE `COMPLETED` continua `IN_PROGRESS`; `PAUSED`/`DIVERGENT` em andamento |
| Pesquisa parcial por `legacyNumber` | `consulta-pedidos.integration.test.ts` — `100` retorna `100`, `1000`, `2100` |
| `%` e `_` literais | `filtros-pedidos-prisma.test.ts` + integração com `100%` e `100_` |
| Sem acentos | integração: `joao` retorna `João` e `Joao` (D3) |
| Primeira/intermediária/última/inexistente | `consulta-pedidos.test.ts` (metadados) + integração (25 pedidos, `offset` 0/10/20/100) + `pedidos-lista.test.tsx` |
| Menos de 20, exatamente 20, mais de 20 | integração + unidade (`totalPaginas`) |
| Datas iguais | integração: desempate por `id`, uma linha por página |
| Permissões | `src/app/api/pedidos/route.test.ts` — Vendedor e Gerente 200; 401 sem sessão; 403 sem perfil |
| Filtros na URL / reset na primeira página | `src/shared/ui/pedidos-lista.test.tsx` |
| Total e página | resposta `{ pedidos, paginacao }` em `route.ts` e `consulta-pedidos.ts` |

**Testes**: 832 unitários/rota/componente + 17 integração MySQL local aprovados.
**Ignorados na suíte padrão**: 17 testes de integração (`describe.skipIf`), executados separadamente com `RUN_INTEGRATION_TESTS=1` (D8).
**Gates**: `tsc` OK; ESLint 0 erros (4 avisos pré-existentes); build OK.
**Pendência**: validação no navegador (Vendedor e Gerente) e medição de `EXPLAIN` com volume real. Nenhum índice criado (D6).

### Preservação e substituição de testes (A1)

| Arquivo | Antes | Depois | Situação |
| --- | --- | --- | --- |
| `consulta-pedidos.test.ts` | 41 testes (25 de lista + 16 de detalhe/totais) | 30 (14 de lista + 16 de detalhe/totais) | Os 16 de detalhe/totais foram preservados integralmente. Os 11 testes de filtro/ordenação/paginação em memória foram substituídos por cobertura equivalente: 12 testes do tradutor de filtros, 17 de integração MySQL e 14 testes de paginação no domínio. |
| `pedidos/route.test.ts` | 30 testes | 13 testes | Os 17 testes que exerciam a filtragem sobre um repositório fake passaram a ser cobertos no MySQL real (integração) e no tradutor de filtros (unidade). A rota continua coberta em contrato, validação, conversão de datas, paginação, 401/403 e Vendedor/Gerente. |
| `pedidos-lista.test.tsx` | 21 testes | 30 testes | Os 21 originais foram preservados; 9 foram acrescentados para paginação, URL, reset e página inexistente. |
| `filtros-pedidos-prisma.test.ts` | — | 12 testes | Novo: tradução de cada filtro, status derivado e escape de `%`/`_`. |
| `consulta-pedidos.integration.test.ts` | — | 17 testes | Novo: semântica real no MySQL (filtros, status, setores, datas, ordenação e páginas). |

Nenhum teste de detalhe, totais por unidade, permissão ou erro foi removido. As substituições acima são as únicas e estão justificadas pela mudança de camada (filtro saiu do domínio em memória e passou para o banco).

### Compatibilidade da API

`GET /api/pedidos` mantém os parâmetros e o array `pedidos`; `paginacao` é um campo **aditivo**. Consumidores verificados:

- `src/shared/ui/pedidos-lista.tsx` — atualizado para ler `paginacao`.
- `src/app/(app)/expedicao/entregas/page.tsx` — lê apenas `dados.pedidos`; continua compatível.
- Nenhum script, rota ou teste E2E consome o corpo integral ou depende da ausência de `paginacao`.

### Limitação registrada — Expedição

A tela `/expedicao/entregas` continua consumindo `GET /api/pedidos` sem paginação explícita e, portanto, vê somente os 20 pedidos mais recentes. Esse era o comportamento anterior à A1 e **não foi alterado** nesta correção, que tem escopo restrito a Vendedor e Gerente. A inclusão de navegação/paginação na Expedição fica registrada como pendência para correção própria.
