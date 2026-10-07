# disponibilidade-e-entregas Validation

**Date**: 2026-10-07
**Spec**: `.specs/features/disponibilidade-e-entregas/spec.md`
**Diff range**: `fb073b8..26c44f2` (7 feature commits: T1 `ef0c966` → T7 `26c44f2`; docs commit `fb073b8` precedes)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status | Commit    | Notes                                                                             |
| ---- | ------ | --------- | --------------------------------------------------------------------------------- |
| T1   | ✅ Done | `ef0c966` | `disponibilidade.ts`: disponível = executado − entregue, clamp 0; 5 tests.        |
| T2   | ✅ Done | `f57b41c` | `registrar-entrega.ts`: papel, bloqueio, exceção + auditoria, status; 11 tests.   |
| T3   | ✅ Done | `36de32b` | `saldo-pedido.ts`: cinco valores por item; 5 tests.                               |
| T4   | ✅ Done | `0028050` | `historico-entregas.ts`: quantidade, autor, data/hora, exceção; 5 tests.          |
| T5   | ✅ Done | `f5069bd` | adapter Prisma (sem testes por matriz/AD-002).                                    |
| T6   | ✅ Done | `627045f` | rota POST/GET entregas; 8 tests (declared 7).                                     |
| T7   | ✅ Done | `26c44f2` | rota GET saldo; 5 tests.                                                          |

All 7 tasks committed. `tasks.md` checkboxes and `spec.md` traceability statuses (`Pending` → `Implemented`) were updated inside the feature commits (verified in the `fb073b8..26c44f2` diff).

---

## Spec-Anchored Acceptance Criteria

> Evidence-or-zero: every AC traced to `file:line` + the exact assertion. Asserted values compared against the spec-defined outcome.

| AC | Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- | --- |
| EXP-01 | Consulta disponibilidade → executado − entregue | `8 − 3 = 5`; nunca negativo | `disponibilidade.test.ts:12` - `expect(disponivel.toString()).toBe('5')`; `:39` negative clamp `toBe('0')`; `:48` `'10.5'` | ✅ PASS |
| EXP-02 | Considera apenas produzido/separado (executado) | disponível = executado quando entregue 0 | `disponibilidade.test.ts:21` - `expect(disponivel.toString()).toBe('8')` | ✅ PASS ⚠️ weak (see gaps) |
| EXP-03 | Expedição/Gerente registra dentro do disponível → persiste com usuário e data/hora | `Delivery` row with `userId` + `occurredAt`, `201` | `registrar-entrega.test.ts:110-114` - `userId 'user_exp'`, `occurredAt toBe(NOW)`, `quantidade '3'`, `managerOverride false`, `entregas` length 1; route `itens/[itemId]/entregas/route.test.ts:175-180` - `status 201`, `body.entrega.userId 'user_exp'`, `quantidade '3'`, `status 'PARCIAL'`, length 1 | ✅ PASS |
| EXP-04 | Usuário não Expedição/Gerente → rejeitar `403` | `403`, no persistence | `registrar-entrega.test.ts:140-141` - rejects `PapelSemPermissaoError`, `entregas` length 0; route `route.test.ts:222-224` - `status 403`, error `'forbidden'`, length 0 | ✅ PASS |
| EXP-05 | Quantidade ultrapassa disponível → bloquear `409` | `409`, no persistence | `registrar-entrega.test.ts:153-154` - rejects `EntregaAcimaDoDisponivelError`, `entregas` length 1; route `route.test.ts:209-211` - `status 409`, error `'above_available'`, length 1 | ✅ PASS |
| EXP-06 | Gerente autoriza exceção com motivo → registra acima do disponível com auditoria | `managerOverride true`, `overrideReason`, `authorizedByUserId`, `availableBefore`, audit payload | `registrar-entrega.test.ts:176-186` - `managerOverride true`, `overrideReason 'cliente urgente'`, `authorizedByUserId 'user_mgr'`, `availableBefore '5'`, `entregas` length 2, `auditoria.{disponivelAntes '5', quantidade '6', gerenteId 'user_mgr', occurredAt NOW}`; route `route.test.ts:195-200` - `201`, `managerOverride true`, `overrideReason`, `availableBefore '5'`, length 2 | ✅ PASS ⚠️ adapter persistence untested (sensor M7) |
| EXP-07 | Exceção sem motivo ou por não-gerente → rejeitar `400`/`403` | no persistence | `registrar-entrega.test.ts:200-201` - rejects `MotivoExcecaoObrigatorioError`, length 0; `:221-222` - rejects `PapelSemPermissaoError`, length 0; HTTP mapping `route.ts:73-75` (400) / `:67-69` (403) | ✅ PASS ⚠️ HTTP-level via shared error class (see gaps) |
| EXP-08 | Entrega parcial → item parcial | status `PARCIAL` | `registrar-entrega.test.ts:237` - `expect(result.status).toBe('PARCIAL')` | ✅ PASS |
| EXP-09 | Entregue alcança executado → item concluído | status `CONCLUIDO` | `registrar-entrega.test.ts:252` - `expect(result.status).toBe('CONCLUIDO')` | ✅ PASS |
| EXP-10 | Saldo do pedido → por item: solicitado, executado, disponível, entregue, pendente | all five values correct | `saldo-pedido.test.ts:51-55` - `solicitado '10'`, `executado '8'`, `disponivel '5'`, `entregue '3'`, `pendente '2'`; route `[orderId]/saldo/route.test.ts:84-88` - same five as `'10'/'8'/'5'/'3'/'2'` | ✅ PASS |
| EXP-11 | Histórico do item → quantidade, usuário, data/hora, exceção | four fields correct | `historico-entregas.test.ts:61-64` - `quantidade '3'`, `usuarioId 'user_exp'`, `usuarioNome 'Ana Expedição'`, `occurredAt toBe(NOW)`; `:77` - `excecao` `[false, true]`; route `route.test.ts:248-251` - `entregas` length 2, `quantidade '3'`, `usuarioId 'user_prev'`, `excecao true` | ✅ PASS |
| EXP-12 | Item/pedido inexistente → `404` | HTTP 404 | `registrar-entrega.test.ts:275` rejects `ItemNaoEncontradoError`; `historico-entregas.test.ts:108` rejects same; `saldo-pedido.test.ts:124` rejects `PedidoNaoEncontradoError`; route `route.test.ts:256-260` POST+GET `404 'item_not_found'`; `saldo/route.test.ts:131-132` `404 'order_not_found'` | ✅ PASS |
| EXP-13 | Quantidade zero/negativa → rejeitar `400` | `400`, no persistence | `registrar-entrega.test.ts:263-267` - rejects `QuantidadeInvalidaError` for `'0'` and `'-2'`, `entregas` length 0; route `route.test.ts:233-236` - `status 400`, error `'invalid_quantity'` for `'0'`, length 0 | ✅ PASS |
| EXP-14 | Item sem produção → disponível zero | `0` | `disponibilidade.test.ts:30` - `expect(disponivel.toString()).toBe('0')`; `saldo-pedido.test.ts:91` - `disponivel '0'` | ✅ PASS |

**Status**: ✅ 14/14 ACs matched the spec-defined outcome. No AC uncovered. 3 non-blocking spec-precision/evidence gaps flagged (below).

**Payload/conjunction rule**: payload fields are asserted on value/state, not merely on call occurrence - e.g. `result.entrega.{userId,quantidade,occurredAt,managerOverride,overrideReason,authorizedByUserId,availableBefore}`, `auditoria.{disponivelAntes,quantidade,gerenteId,occurredAt}`, `result.status 'PARCIAL'/'CONCLUIDO'`, `saldo[0].{solicitado,executado,disponivel,entregue,pendente}`, `body.itens[0].{...}` as strings, `historico[0].{quantidade,usuarioId,usuarioNome,occurredAt,excecao}`, and status codes `201/400/403/404/409/200`. No AC passes on a call-only assertion.

### Spec-precision / evidence gaps (non-blocking)

1. **EXP-02 is weakly evidenced.** `disponibilidade.test.ts:15-22` asserts `executado 8, entregue 0 → '8'`, but `calcularDisponivel` takes only `{ executado, entregue }` (`disponibilidade.ts:3-8`) - there is no `solicitado` operand to exclude. The "apenas o que foi produzido ou separado" guarantee is structural (the input type has no requested-quantity field) rather than a behavioral observation. The adapter (`executadoDoItem`, `prisma-expedicao-repository.ts:60-62`) sums `Execution.quantity` only, so the runtime claim rests on untested adapter code (AD-002).
2. **EXP-07 HTTP 400/403 for the exception path is proven via the shared error class.** The domain tests assert `MotivoExcecaoObrigatorioError` (`registrar-entrega.test.ts:200`) and `PapelSemPermissaoError` for a non-manager exception (`:221`). The route maps those exact classes to `400`/`403` (`route.ts:67-75`), but no route test feeds `excecao: true` without `motivoExcecao`, nor `excecao: true` from a non-manager. The `403` at HTTP level is exercised by the plain role guard (EXP-04).
3. **EXP-06 audit *persistence* has no automated test.** The domain test asserts the `auditoria` payload handed to the port (`registrar-entrega.test.ts:182-186`), but the actual `AuditLog` write lives in the Prisma adapter (`prisma-expedicao-repository.ts:132-149`), which is untested by declared policy (Test Coverage Matrix "Repository adapter = none"; AD-002). Sensor mutation M7 survived. See Discrimination Sensor.

Additional non-AC observations:
- **Extra behavior not in spec**: malformed body / wrong field types → `400 invalid_body` (`entregas/route.ts:33-49`); `401` token guard on all three handlers (`entregas/route.ts:26,85`, `saldo/route.ts:10`). Consistent with the repo's existing route conventions, unspecified in `spec.md`.
- **Response envelopes undefined**: `{ entrega, status }`, `{ entregas }`, `{ itens }` are not defined in the spec; they follow the repo convention (`{ ocorrencia }`, `{ atividades }`).
- **`entregas/route.ts:42-49` rejects a body without `quantidade` as `400 invalid_body`** rather than `invalid_quantity`; the route test asserts `400` but not the error code for the missing-quantity case (`route.test.ts:230-231`).

---

## Edge Cases

- [x] Item inexistente → 404: handled (`registrar-entrega.ts:149`, `historico-entregas.ts:30`, `saldo-pedido.ts:43`); asserted domain + route (EXP-12).
- [x] Quantidade zero/negativa → 400: handled (`unidades.ts:38-40`); asserted domain (`'0'`/`'-2'`) + route (`'0'`).
- [x] Item sem produção → disponível zero: handled (`disponibilidade.ts:17-18`); asserted (EXP-14).

---

## Discrimination Sensor

**Method**: isolated per-file backups under `%TEMP%\opencode` (script `sensor.ps1`); each source file mutated in place, targeted `npm test -- <file>` executed (full suite for the adapter-only mutation), then restored byte-for-byte from the in-memory original. `git stash` was **not** used. Baseline `git status --porcelain` was empty; after all runs porcelain = 0 lines and `git diff --stat` = 0 lines (isolation confirmed). Every mutation reported `restored=True`.

| # | Mutation | File:line | Description | Killed? |
| --- | --- | --- | --- | --- |
| M1 | disponível formula | `disponibilidade.ts:17` | swap operands `executado.minus(entregue)` → `entregue.minus(executado)` | ✅ Killed (4 failed / 1 passed) |
| M2 | above-available block | `registrar-entrega.ts:168` | boundary `quantidade.gt(disponivelAntes)` → `.gte(...)` (blocks exactly-at-available) | ✅ Killed (1 failed / 10 passed) |
| M3 | manager-only exception guard | `registrar-entrega.ts:164` | remove `if (!papeis.includes('PRODUCTION_MANAGER')) throw` | ✅ Killed (1 failed / 10 passed) |
| M4 | audit payload on exception (domain) | `registrar-entrega.ts:173` | force `auditoria` object to `null` on exception | ✅ Killed (1 failed / 10 passed) |
| M5 | partial/concluded transition | `registrar-entrega.ts:122` | `entregueTotal.gte(executado)` → `.gt(executado)` | ✅ Killed (1 failed / 10 passed) |
| M6 | role guard | `registrar-entrega.ts:114` | `papeis.some(...)` → `return true` (always allow) | ✅ Killed (1 failed / 10 passed) |
| M7 | audit write (adapter `AuditLog`) | `adapters/prisma-expedicao-repository.ts:132` | `if (input.auditoria)` → `if (false)` (never persist audit) | ❌ **Survived** (285 passed) |

**Sensor depth**: expanded (7 behavior-level mutations; the exception/audit path is a data-integrity path).
**Result**: 6/7 killed. The single survivor (M7) is confined to the Prisma adapter, which is **untested by declared policy** (Test Coverage Matrix "Repository adapter = none"; AD-002 "os testes usam fake; o domínio não depende de banco"). The domain-level audit *payload* is covered (M4 killed), and the port contract requires `auditoria` to be supplied on exception, but nothing asserts the adapter actually writes `AuditLog` - the same accepted latent integration risk already recorded for `ocorrencias` (M4) and `producao-e-fila`.
**Isolation**: after all runs, `git status --porcelain` was empty and `git diff --stat` was empty. Real tree never mutated.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code / no speculative flexibility | ✅ |
| Surgical changes (expedicao module + 2 routes + spec/tasks) | ✅ |
| No scope creep (adapter real per design/AD-002) | ✅ |
| Matches existing patterns (segregated ports composed into a single adapter; guard + `x-user-id` mirror producao/ocorrencias) | ✅ |
| Spec-anchored outcome check (asserted values match spec) | ✅ with 3 non-blocking gaps flagged |
| Per-layer coverage met (domain 1:1 ACs; routes happy+edge+error) | ✅ |
| Every test maps to a spec AC / edge / Done-when (no unclaimed tests) | ✅ (401 auth tests map to the route token guard in `design.md` "Code Reuse") |
| Documented guidelines followed: `docs/testes.md` (80% domain), AD-002, `tasks.md` Test Coverage Matrix | ✅ |

**Per-layer coverage** (from `coverage/coverage-summary.json`, full suite): `expedicao/disponibilidade.ts`, `historico-entregas.ts`, `registrar-entrega.ts`, `saldo-pedido.ts` = **100% stmts / 100% branch / 100% funcs / 100% lines**. The adapter is intentionally untested per the matrix and AD-002. (The default `text` reporter omits the `expedicao` directory row in the table - a display quirk also noted for `producao`; the JSON summary confirms 100%.)

---

## Gate Check

- **Gate command**: `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`
- **Result**: PASS ✅ - 6/6 passed, 0 failed
  - `prisma:generate` → exit 0
  - `lint` → exit 0 (2 pre-existing warnings in `postcss.config.mjs`/`prettier.config.mjs`, unrelated to this feature)
  - `typecheck` → exit 0
  - `typecheck:connector` → exit 0
  - `test:coverage` → exit 0 - **43 files, 285 tests passed**, 0 failed, 0 skipped; thresholds 80/75/80/80 met (97.41% stmts / 94.38% branch / 97.29% funcs / 98.49% lines)
  - `build` → exit 0 (both new routes emitted: `/api/pedidos/[orderId]/saldo`, `/api/pedidos/itens/[itemId]/entregas`)
- **Test count after feature**: 285
- **Test count before feature**: 246 (from `.specs/features/ocorrencias/validation.md` line 118)
- **Delta**: +39 tests across 6 new test files (5 disponibilidade + 11 registrar-entrega + 5 saldo + 5 histórico + 8 entregas route + 5 saldo route) - matches the delta exactly; no tests deleted
- **Skipped tests**: none

---

## Investigated Deviations

1. **Port naming (flagged a).** The design (`design.md:51`) names a single port `ExpedicaoRepository`. The implementation keeps `ExpedicaoRepository` (`prisma-expedicao-repository.ts:17-20`) as the **composite** adapter-facing interface but introduces a narrower `EntregaRepository` (`registrar-entrega.ts:74-81`) as the port consumed by `registrarEntrega`, plus `SaldoPedidoRepository` and `HistoricoEntregasRepository`. This is interface segregation composed into the design's single port - the same convention used by `ocorrencias` (`OcorrenciasRepository extends ...`). The domain is more testable with the narrow ports. Benign, pattern-consistent; not a functional deviation.
2. **T6 declares 7 tests, ships 8 (flagged b).** `tasks.md:229` says "7 testes"; the route test file has 8. The extra test is `responde 401 sem token no POST e no GET` (`route.test.ts:263-271`), which maps to the route token guard from `design.md` "Code Reuse". No unclaimed test, no deletion. Stale declared count is a documentation inconsistency, not a coverage problem.
3. **`/saldo` resolves `Order.id` (flagged c).** `buscarItensDoPedido` (`prisma-expedicao-repository.ts:162`) does `prisma.order.findUnique({ where: { id: orderId } })`; the route param is `orderId` (`saldo/route.ts:14`). Neither `spec.md` nor `design.md` defines whether the external identifier is the internal `Order.id` (cuid) or the business key `Order.legacyNumber` (`schema.prisma:114`). The internal id is consistent with the sibling routes (`[itemId]` resolves `OrderItem.id`, `[jobId]` resolves `IntegrationJob.id`) and with how the integration callback addresses orders. Benign for this feature; the public identifier contract (id vs. número do pedido) is worth pinning down before the frontend consumes it.

---

## Fix Plans (if issues found)

None blocking. No uncovered AC, no failed gate, and the single surviving mutant is sanctioned by AD-002 + the declared Test Coverage Matrix (same disposition as `ocorrencias` M4 and `producao-e-fila`).

**Recommendation (hardening, not a fix task)**: when a runtime MySQL is available, add an integration test asserting that a manager-override delivery creates an `AuditLog` row with `action = 'DELIVERY_MANAGER_OVERRIDE'`, `entityId = itemId`, `beforeJson.availableBefore`, and `reason` (adapter `prisma-expedicao-repository.ts:132-149`). This closes sensor M7, the only untested spec-relevant side effect.

---

## Requirement Traceability Update

The Verifier is read-only over code/tests and writes only this file; `spec.md` was **not** modified. Suggested statuses to record (all currently `Implemented` in spec.md):

| Requirement | Previous Status | Suggested Status |
| --- | --- | --- |
| EXP-01..EXP-14 | Implemented | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 14/14 ACs matched spec outcome | 3 non-blocking spec-precision/evidence gaps flagged
**Sensor**: 7 mutations injected, 6 killed, 1 survived (adapter-only, sanctioned by AD-002)
**Gate**: 6/6 gate commands passed (285 tests, 0 failed)

**What works**: disponível = executado − entregue clamped at 0; role-restricted delivery (Expedição/Gerente) with user + timestamp persistence; above-available blocked with `409`; manager-only exception with mandatory reason and full audit payload; partial vs. concluded status derivation; consolidated order balance (solicitado/executado/disponível/entregue/pendente) per item; delivery history (quantity/author/timestamp/exception); `400/403/404/409/401` error mapping on both routes.

**Issues found**: none blocking. Ranked observations:
1. Adapter `AuditLog` write for the manager exception has no automated test (sensor M7 survived) - domain payload is covered, persistence rests on AD-002; schedule an integration test when MySQL is available.
2. EXP-02 ("apenas produzido/separado") is structurally guaranteed, not behaviorally asserted - `calcularDisponivel` has no `solicitado` operand and the adapter's execution-only sum is untested.
3. EXP-07 HTTP `400`/`403` for the exception path is proven via the shared error class, not fed directly at route level.
4. T6 declared 7 tests but ships 8 (extra `401` guard test); stale count in `tasks.md:229`.
5. Public identifier for `/saldo` (`Order.id` vs `legacyNumber`) is not pinned in the spec/design.

**Next steps**: none required for PASS. Optionally schedule an adapter integration test for the exception audit trail, and pin the `/saldo` identifier contract before the frontend.
