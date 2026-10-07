# Importação de Pedido por Número — Validation

**Date**: 2026-10-06
**Spec**: `.specs/features/importacao-pedido-por-numero/spec.md`
**Diff range**: `39b95d6..HEAD` (`59d5922`), 24 commits (T1–T23 + record)
**Verifier**: independent sub-agent, iteration 2 (author ≠ verifier)
**Method**: read-only over real tree; sensor mutations applied to file backups and restored; tree verified clean before and after.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1–T17 | ✅ Done | All `Done when` checked; commits present in range. |
| T18 | ✅ Done | `e214075` — reprocess route `POST /api/integracao/pedidos/[jobId]/reprocessar`, `agendarDespacho` extracted. |
| T19 | ✅ Done | `e83672f` — connector `404 → ORDER_NOT_FOUND` + scheduled dispatch failure outcome. |
| T20 | ✅ Done | `4bac672` — scheduled dispatch `CONNECTOR_TIMEOUT → FAILED` outcome. |
| T21 | ✅ Done | `dcf1bcb` — `registrarDivergencia` port + Prisma `$transaction`/`auditLog.create` adapter tests. |
| T22 | ✅ Done | `7bac049` — default 5 s timeout + read-only legacy SQL tests. |
| T23 | ✅ Done | `a404624` — callback validates `CONNECTOR_CALLBACK_TOKEN`. |
| record | ✅ Done | `59d5922` — spec traceability coverage `23 mapped, 0 unmapped`. |

---

## Spec-Anchored Acceptance Criteria

> 23 ACs (INTG-01…INTG-23). Outcome = precise spec-defined value/state. Evidence = `file:line` + assertion. Evidence-or-zero applied.

### P1 — Importar pedido por número

| ID | Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| -- | --------- | -------------------- | ----------------------- | ------ |
| INTG-01 | integer positive order number | create job w/ idempotency key + `202 {jobId}` | `solicitar-importacao.test.ts:85` - `expect(repo.jobs[0].idempotencyKey).toBe('pedido:70435')`; `:87` - `expect(result).toEqual({ jobId: repo.jobs[0].id, reused: false })`; `route.test.ts:169` - `expect(response.status).toBe(202)`; `:170` - `expect(await response.json()).toEqual({ jobId: 'job_1' })` | ✅ PASS |
| INTG-02 | job created → dispatch authenticated HTTPS call w/ `jobId`+`orderNumber`, within 5 s | `POST`, `Bearer` token, body `{jobId, orderNumber}`; 5 s deadline | `http-conector-legado.test.ts:26` - `expect(calls[0].url).toBe(`${BASE}/jobs/import-order`)`; `:28` - `authorization` `Bearer ${TOKEN}`; `:29` - `expect(JSON.parse(body)).toEqual({ jobId: 'job_1', orderNumber: '70435' })`; `route.test.ts:207-210` - `expect(mocks.scheduled).toHaveLength(1)`, `expect(mocks.dispatchCalls).toEqual([{ jobId: 'job_1', orderNumber: '70435' }])`; `http-conector-legado.test.ts:75` - `expect(DEFAULT_CONNECTOR_TIMEOUT_MS).toBe(5_000)`; `:95-99` - aborts at exactly 5000 ms | ✅ PASS |
| INTG-03 | normalized payload → Zod validate + upsert `Pedido`/`ItemPedido` in one transaction | reject invalid; persist order+items; atomic | `processar-callback.test.ts:191` - `rejects.toBeInstanceOf(InvalidCallbackPayloadError)`; `:193` - `expect(pedidos.orders).toHaveLength(0)`; `:245-248` - `expect(orders[0].legacyOrderKey).toBe('1:70435')`, `requestedQuantity).toBe('12.500')`; `prisma-pedidos-repository.test.ts:84` - `expect(state.calls.transactions).toBe(1)`; `:85-90` - 1 order upsert + 1 item upsert in that transaction | ✅ PASS |
| INTG-04 | upsert success | job `SUCCEEDED` + `IntegrationJobEvent` | `processar-callback.test.ts:219-221` - `expect(jobs[0].status).toBe('SUCCEEDED')`, `completedAt).toEqual(NOW)`, `events.map(type)).toEqual(['SUCCEEDED'])` | ✅ PASS |
| INTG-05 | number not integer positive | `400`, no job | `route.test.ts:193-194` - `expect(response.status).toBe(400)`, `expect(mocks.jobs).toHaveLength(0)`; `:200-201` absent body → same; `solicitar-importacao.test.ts:93-115` - rejects `1.5`, `0`, `-3` | ✅ PASS |
| INTG-06 | connector timeout | job `FAILED` + `errorCode` | `http-conector-legado.test.ts:69-71` - `rejects.toMatchObject({ code: 'CONNECTOR_TIMEOUT' })`; `route.test.ts:237-240` - `expect(jobs[0].status).toBe('FAILED')`, `expect(jobs[0].errorCode).toBe('CONNECTOR_TIMEOUT')`, `expect(events.map(type)).toEqual(['DISPATCHED','FAILED'])`, `expect(events[1].detail).toBe('CONNECTOR_TIMEOUT')` | ✅ PASS (was GAP) |
| INTG-07 | persist commercial data without writing Top Gerente | no write to legacy | `topgerente.test.ts:130` - `expect(calls[0].sql.trim().toUpperCase().startsWith('SELECT')).toBe(true)`; `:131-133` - `expect(sql.toUpperCase()).not.toMatch(/\b(INSERT|UPDATE|DELETE|REPLACE|DROP|ALTER|TRUNCATE)\b/)`; `:119` - `expect(calls[0].params).toEqual([2, 70435])`; `importar-pedido.test.ts:200-203` - commercial fields updated app-side | ✅ PASS (was spec-precision) |

### P1 — Acompanhar o status da importação

| ID | Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| -- | --------- | -------------------- | ----------------------- | ------ |
| INTG-08 | query `jobId` | status + event list | `consultar-status.test.ts:100-102` - `expect(result.jobId).toBe('job_1')`, `status).toBe('RUNNING')`, `events.map(type)).toEqual(['CREATED','DISPATCHED'])`; `[jobId]/route.test.ts:133-134` - `events.map(type)).toEqual(['DISPATCHED','RUNNING'])` | ✅ PASS |
| INTG-09 | non-final (`PENDING`/`DISPATCHED`/`RUNNING`) | `202` | `[jobId]/route.test.ts:100-101` - `expect(response.status).toBe(202)`, `toMatchObject({ jobId:'job_1', status })` for all 3; `consultar-status.test.ts:70` - `expect(result.final).toBe(false)` | ✅ PASS |
| INTG-10 | final (`SUCCEEDED`/`FAILED`) | `200` | `[jobId]/route.test.ts:112-113` - `expect(response.status).toBe(200)`, `toMatchObject({ jobId:'job_1', status })`; `consultar-status.test.ts:81-88` - `final: true` | ✅ PASS |
| INTG-11 | `jobId` not found | `404` | `[jobId]/route.test.ts:90` - `expect(response.status).toBe(404)`; `consultar-status.test.ts:58` - `rejects.toBeInstanceOf(JobNotFoundError)` | ✅ PASS |

### P2 — Ressincronizar um pedido existente

| ID | Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| -- | --------- | -------------------- | ----------------------- | ------ |
| INTG-12 | reimport existing | update commercial fields + requested qty by business key | `importar-pedido.test.ts:200-203` - `expect(orders[0].customerName).toBe('NOVO CLIENTE')`, `sellerLegacyCode).toBe('22')`, `sourceUpdatedAt).toEqual(updatedAt)`, `requestedQuantity).toBe('9.000')` | ✅ PASS |
| INTG-13 | same business key | no second `Pedido` | `importar-pedido.test.ts:181-182` - `expect(orders).toHaveLength(1)`, `expect(second.orderId).toBe(first.orderId)` | ✅ PASS |
| INTG-14 | preserve operational records | keep executions/deliveries | `importar-pedido.test.ts:293-296` - `expect(orders[0].items[0].id).toBe('item_1')`, `executedQuantity).toBe('5.000')`, `deliveredQuantity).toBe('1.000')` | ✅ PASS |
| INTG-15 | new qty < executed/delivered | register divergence in `AuditLog` **and** `IntegrationJobEvent` | Event: `processar-callback.test.ts:330-331` - `expect(events.map(type)).toEqual(['SUCCEEDED','DIVERGENCE'])`, `expect(events[1].detail).toContain('"legacyItemKey":"1"')`. `AuditLog`: `prisma-pedidos-repository.test.ts:104-113` - `expect(auditCreate).toHaveLength(1)`, `toMatchObject({ data: { action:'QUANTITY_DIVERGENCE', entityType:'OrderItem', entityId:'1:70435:1', beforeJson:{...}, afterJson:{...} } })`. Port call: `importar-pedido.test.ts:236-246` exact payload. Boundary: `:269-271` equal → not divergent; `:282` greater → not divergent | ✅ PASS (was partial) |
| INTG-16 | identical within idempotency window | return existing `jobId`, no new dispatch | `solicitar-importacao.test.ts:124-125` - `expect(second).toEqual({ jobId: first.jobId, reused: true })`, `expect(repo.jobs).toHaveLength(1)`; `route.test.ts:249-252` - `expect(response.status).toBe(202)`, body `{jobId:'job_1'}`, `expect(mocks.jobs).toHaveLength(1)`, `expect(mocks.scheduled).toHaveLength(0)` | ✅ PASS |

### P3 — Reprocessar uma importação falha

| ID | Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| -- | --------- | -------------------- | ----------------------- | ------ |
| INTG-17 | reprocess `FAILED` job | new dispatch, preserve previous history | `reprocessar.test.ts:95-101` - `expect(result.jobId).not.toBe('job_failed')`, `expect(jobs).toHaveLength(2)`, `created?.status).toBe('PENDING')`, `idempotencyKey).toBe('pedido:70435:retry:...')`; `:112-114` - `expect(events).toEqual(oldEvents)`, new job has 0 events; `reprocessar/route.test.ts:216-229` - `expect(response.status).toBe(202)`, `expect(body.jobId).not.toBe('job_failed')`, `expect(mocks.jobs).toHaveLength(2)`, `expect(mocks.scheduled).toHaveLength(1)`, `expect(mocks.dispatchCalls).toEqual([{ jobId: body.jobId, orderNumber: '70435' }])` | ✅ PASS |
| INTG-18 | job not `FAILED` | reject with `409` | `reprocessar.test.ts:85` - `rejects.toBeInstanceOf(JobNotFailedError)` for PENDING/DISPATCHED/RUNNING/SUCCEEDED; `reprocessar/route.test.ts:206-208` - `expect(response.status).toBe(409)`, `expect(mocks.jobs).toHaveLength(1)`, `expect(mocks.scheduled).toHaveLength(0)` | ✅ PASS (was GAP) |

### Edge Cases

| ID | Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| -- | --------- | -------------------- | ----------------------- | ------ |
| INTG-19 | order not in Top Gerente | connector `not_found`; job ends `FAILED` with `errorCode = ORDER_NOT_FOUND` | Connector: `topgerente.test.ts:90` - `expect(result).toEqual({ found: false })`; `index.test.ts:99-100` - `expect(result.status).toBe(404)`, `expect(callbackCalls).toHaveLength(0)`. Adapter: `http-conector-legado.test.ts:52-55` - `rejects.toMatchObject({ code: 'ORDER_NOT_FOUND' })`. Job: `route.test.ts:223-226` - `expect(jobs[0].status).toBe('FAILED')`, `expect(jobs[0].errorCode).toBe('ORDER_NOT_FOUND')`, `expect(events.map(type)).toEqual(['DISPATCHED','FAILED'])`, `expect(events[1].detail).toBe('ORDER_NOT_FOUND')` | ✅ PASS (was GAP) |
| INTG-20 | callback invalid token | `401`, persist nothing | `callback/route.test.ts:180-182` - `expect(response.status).toBe(401)`, `expect(mocks.jobs[0].status).toBe('RUNNING')`, `expect(mocks.upsertCalls).toHaveLength(0)`; `internal-auth.test.ts:55,59,64` - `requireCallbackToken` accepts/refuses/refuses-unset | ✅ PASS |
| INTG-21 | callback for concluded job | `200`, no repeat upsert | `processar-callback.test.ts:288-289` - `expect(orders[0].items[0].requestedQuantity).toBe('5.000')`, `expect(integracao.events).toHaveLength(0)` (both `SUCCEEDED`/`FAILED`); `callback/route.test.ts:190-191` - `expect(response.status).toBe(200)`, `expect(mocks.upsertCalls).toHaveLength(0)` | ✅ PASS |
| INTG-22 | cancelled item | exclude from upsert | `topgerente.test.ts:82` - `expect(result.order.items.map(seq)).toEqual([1])` (excludes `S`/`s`); `importar-pedido.test.ts:216` - `expect(orders[0].items.map(legacyItemKey)).toEqual(['1'])` | ✅ PASS |
| INTG-23 | two imports same number in parallel | exactly one job | `solicitar-importacao.test.ts:147-148` - `expect(repo.jobs).toHaveLength(1)`, `expect(a.jobId).toBe(b.jobId)` | ✅ PASS (real DB uniqueness structural only — see residual) |

**Status**: ✅ **All 23 ACs matched spec outcome. 0 GAPs, 0 spec-precision gaps.**

**Payload/conjunction rule**: payloads are asserted on value/state, not mere call occurrence — dispatch body `toEqual({jobId, orderNumber})` (`http-conector-legado.test.ts:29`, `route.test.ts:210`); callback body asserted field-by-field (`index.test.ts:78-91`); INTG-15's conjunction (AuditLog **and** IntegrationJobEvent) verified at both the adapter and the event layer.

---

## Discrimination Sensor

**Sensor depth**: P0-full (auth + data integrity), **8 behavior-level mutations**. Isolated via file backup → mutate → run targeted tests → restore. Real tree verified clean.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| M1 (re-run of iteration-1 M7) | `src/modules/integracao/adapters/http-conector-legado.ts:55-57` | Removed the `404 → ORDER_NOT_FOUND` branch (falls through to `CONNECTOR_HTTP_ERROR`) | ✅ Killed (1 failed: `http-conector-legado.test.ts:52` expected `ORDER_NOT_FOUND`, got `CONNECTOR_HTTP_ERROR`) |
| M2 | `src/app/api/integracao/despacho.ts:37` | `error instanceof ConectorLegadoError ? error.code : 'DISPATCH_FAILED'` → always `'DISPATCH_FAILED'` | ✅ Killed (2 failed: `route.test.ts:224,238` errorCode mismatch) |
| M3 | `src/app/api/integracao/pedidos/[jobId]/reprocessar/route.ts:23` | `409` → `400` for non-`FAILED` job | ✅ Killed (1 failed: `reprocessar/route.test.ts:206` expected 409, got 400) |
| M4 | `src/shared/http/internal-auth.ts:32` | `requireCallbackToken` reads `APP_INTERNAL_TOKEN` instead of `CONNECTOR_CALLBACK_TOKEN` | ✅ Killed (5 failed: `internal-auth.test.ts:55`, `callback/route.test.ts:170,190,211,219`) |
| M5 | `src/modules/integracao/adapters/http-conector-legado.ts:4` | `DEFAULT_CONNECTOR_TIMEOUT_MS = 5_000` → `60_000` | ✅ Killed (1 failed: `http-conector-legado.test.ts:75`) |
| M6 | `src/modules/pedidos/adapters/prisma-pedidos-repository.ts:91` | AuditLog `action: 'QUANTITY_DIVERGENCE'` → `'OTHER'` | ✅ Killed (1 failed: `prisma-pedidos-repository.test.ts:105`) |
| M7 | `connector-local/src/topgerente.ts:78` | `cancelado === 'S'` → `!== 'S'` (invert exclusion) | ✅ Killed (4 failed: `topgerente.test.ts:59,82,100`, `index.test.ts:82`) |
| M8 | `src/modules/pedidos/importar-pedido.ts:102` | divergence threshold `<` → `<=` | ✅ Killed (1 failed: `importar-pedido.test.ts:269`) |

**Result**: **8 injected, 8 killed, 0 survived** → PASS. Iteration-1's surviving mutant M7 is now killed by the new adapter test (`http-conector-legado.test.ts:45-56`).

**Isolation**: baseline `git status --porcelain` = `?? .specs/features/importacao-pedido-por-numero/validation.md`; after sensor = identical; `git diff` empty (no tracked-file changes). Full suite re-run after restore: **16 files, 94 tests, 0 failed**. CLEAN.

---

## Edge Cases

- [x] INTG-19 order not found → connector `not_found`; app job `FAILED` + `errorCode = ORDER_NOT_FOUND` — handled and tested at connector, adapter, and job layers.
- [x] INTG-20 callback invalid token → `401`, no persist — handled.
- [x] INTG-21 callback for concluded job → `200`, no repeat upsert — handled.
- [x] INTG-22 cancelled item excluded — handled.
- [x] INTG-23 parallel same number → one job — handled at domain; real DB uniqueness structural only.

---

## Gate Check

- **Gate command**: `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`
- **Result**: **6 passed, 0 failed** (run individually; PowerShell 5 has no `&&`)
  - `prisma:generate` exit 0
  - `lint` exit 0 (2 pre-existing warnings in `postcss.config.mjs`, `prettier.config.mjs`; 0 errors)
  - `typecheck` exit 0
  - `typecheck:connector` exit 0
  - `test:coverage` exit 0 — **16 files, 94 tests passed, 0 failed, 0 skipped**
  - `build` exit 0 (routes: `/api/integracao/pedidos`, `/api/integracao/pedidos/[jobId]`, `/api/integracao/pedidos/[jobId]/reprocessar`, `/api/integracao/callback`)
- **Coverage** (`src/modules/**` excluding adapters): statements 100% (91/91), branches 89.36% (42/47), functions 100% (18/18), lines 100% (79/79) — thresholds 80/80/80/75 met.
- **Test count before feature**: 1 (`src/shared/time/timezone.test.ts`)
- **Test count after feature**: 94
- **Delta**: +93 new tests (iteration-1 was 79; T18–T23 added +15)
- **Skipped tests**: none
- **Failures**: none

---

## Author Deviations Assessment

### (a) New `src/app/api/integracao/despacho.ts` extraction — ✅ Legitimate

`agendarDespacho` + `getConectorLegado` extracted from the `pedidos` POST route (`route.ts:5,39`) and reused verbatim by the new reprocess route (`reprocessar/route.ts:5,33`). Two call sites justify the module; no speculative flexibility. The process-level connector cache (`despacho.ts:9-20`) avoids re-creating the HTTP client per request. Matches existing patterns.

### (b) `registrarDivergencia` port method — ✅ Legitimate

`PedidosRepository` gained `registrarDivergencia` (`importar-pedido.ts:70-71`); `importarPedido` now calls it per divergence (`importar-pedido.ts:128-130`) instead of touching Prisma directly, and the adapter owns the `AuditLog` write (`prisma-pedidos-repository.ts:88-102`). This keeps the domain DB-free (AD-002) and makes INTG-15's `AuditLog` outcome testable with a fake Prisma (`prisma-pedidos-repository.test.ts:93-114`). All fakes were updated consistently.

### (c) `resolve.alias` `@` added to `vitest.config.ts` — ✅ Legitimate

`prisma-pedidos-repository.ts` imports `@/generated/prisma/client` and `@/shared/db/prisma`; the new adapter test needs vitest to resolve the alias. The added mapping (`vitest.config.ts:5-9`) exactly mirrors `tsconfig.json:25-29` (`"@/*": ["./src/*"]`). Necessary for the test that closes INTG-03/INTG-15.

### (d) Callback now validates `CONNECTOR_CALLBACK_TOKEN` — ✅ Legitimate, closes iteration-1 wiring gap

New `requireCallbackToken` (`internal-auth.ts:31-33`) reads `CONNECTOR_CALLBACK_TOKEN`; the callback route uses it (`callback/route.ts:13`) while user routes keep `APP_INTERNAL_TOKEN` (`internal-auth.ts:23-25`). The connector reads `CONNECTOR_CALLBACK_TOKEN` (`index.ts:105`) and `connector-local/.env.example:8` was renamed from `RAILWAY_CALLBACK_TOKEN` to `CONNECTOR_CALLBACK_TOKEN`; root `.env.example:11-13` documents the shared value. Separation of user vs connector credentials is a security improvement, and the wiring is now tested (`internal-auth.test.ts:42-65`, sensor M4).

No scope creep, no unrelated "improvements", changes are surgical to the fix tasks.

---

## Requirement Traceability Update

| Requirement | Iteration-1 | Iteration-2 Verified Status |
| ----------- | ----------- | --------------------------- |
| INTG-01…05, 07…14, 16, 17, 20…23 | ✅ Verified (some with notes) | ✅ Verified |
| INTG-06 | ❌ Needs Fix | ✅ Verified |
| INTG-15 | ⚠️ Partial | ✅ Verified |
| INTG-18 | ❌ Needs Fix | ✅ Verified |
| INTG-19 | ❌ Needs Fix | ✅ Verified |

> **Bookkeeping note (non-blocking)**: `spec.md` Requirement Traceability still lists INTG-06/15/18/19 as `Implementing` (the record commit only fixed the coverage-mapping line). Those statuses should be promoted to `Done`/`Verified` now that the gaps are closed. `tasks.md` T18–T23 `Done when` are all checked and now backed by passing tests. (Verifier is read-only over `spec.md` and cannot make this edit.)

---

## Summary

**Overall**: ✅ **Ready** — all 23 ACs matched, all 8 mutants killed, gate green, no surviving gaps.

**Spec-anchored check**: 23/23 ACs matched spec outcome; 0 GAPs; 0 spec-precision gaps.
**Sensor**: 8/8 mutations killed (iteration-1's survivor M7 now killed).
**Gate**: 6/6 passed (94 tests, 0 failed).

**What works**: idempotent job creation with 60 s window; token guard split (user vs callback); Zod contracts; authenticated dispatch payload with 5 s default timeout; status `202`/`200`/`404`; upsert of order/items in one transaction; cancelled-item exclusion; divergence detection + `AuditLog` **and** `IntegrationJobEvent`; reprocess with `409`/`404`/`202` route; connector `not_found` → job `FAILED`/`ORDER_NOT_FOUND`; read-only legacy SQL; timeout → job `FAILED`/`CONNECTOR_TIMEOUT`.

**Residual risks (not gaps)**:
1. INTG-23 real DB uniqueness relies on `prisma.integrationJob.upsert` (`prisma-integracao-repository.ts:71`), which has no adapter test; the observable domain behavior is covered. Sanctioned by AD-002 + coverage matrix.
2. INTG-02's "em até 5 segundos" is realized as the dispatch HTTP timeout (`DEFAULT_CONNECTOR_TIMEOUT_MS`), not scheduling latency; the 5 s value is asserted. Interpretation is consistent with `tasks.md` T22.
3. `spec.md` traceability statuses for INTG-06/15/18/19 remain `Implementing` (stale bookkeeping; see note above).

**Next steps**: None required for correctness. Optional housekeeping: promote the four `Implementing` statuses in `spec.md` to `Done`.
