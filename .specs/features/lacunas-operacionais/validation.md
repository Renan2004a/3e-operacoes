# lacunas-operacionais Validation

**Date**: 2026-10-07
**Spec**: `.specs/features/lacunas-operacionais/spec.md`
**Diff range**: `1df0df2..5b70859` (T1 `65f104c`, T2 `27982d2`, T3 `19841b6`, T4 `3dfca94`, T5 `d0b8c23`, T6 `11f5e15`, T7 `f70ca43`, T8 `5b70859`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1: retry com backoff | ✅ Done | `despacho.ts` + 11 unit tests |
| T2: rota lista jobs | ✅ Done | `jobs/route.ts` + 5 integration tests |
| T3: leitura de setores | ✅ Done | `setores/route.ts` GET → `consultar_pedidos` |
| T4: tela importar pedido | ✅ Done | `(app)/integracao/page.tsx` + 7 tests |
| T5: classificar item | ✅ Done | `pedido-detalhe.tsx` + gerente page |
| T6: ordem + impressão | ✅ Done | `producao/.../ordem/page.tsx` + 7 tests |
| T7: tela técnico | ✅ Done | `(app)/tecnico/integracao/page.tsx` + 7 tests |
| T8: E2E + navegação | ✅ Done | `tests/e2e/lacunas-operacionais.spec.ts` |

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| LAC-01 WHEN número válido confirmado THEN chamar importação e mostrar status | POST `/api/integracao/pedidos` com `orderNumber`; status exibido | `src/app/(app)/integracao/page.test.tsx:66` - `toHaveBeenCalledWith('/api/integracao/pedidos', { orderNumber: '70435' })`; `:70` - `findByText('Job job_1')` | ✅ PASS |
| LAC-02 IF número inválido THEN erro sem chamar API | alerta de validação; nenhuma chamada `apiPost` | `src/app/(app)/integracao/page.test.tsx:54` - `findByRole('alert')` com `/número de pedido válido/i`; `:55` - `apiPost).not.toHaveBeenCalled()` | ✅ PASS |
| LAC-03 tela atualiza status até concluir | transição `DISPATCHED` → `SUCCEEDED` | `src/app/(app)/integracao/page.test.tsx:88` - `findByText('Despachado')`; `:89` - `findByText('Concluído', {}, { timeout: 3000 })` | ✅ PASS |
| LAC-04 WHEN item pendente THEN escolher setor e classificar | `GET /api/setores` popula select; POST `classificar` com `sectorId` | `src/app/(app)/gerente/pedidos/[orderId]/page.test.tsx:180` - `findByRole('option', { name: 'Telhas' })`; `:200` - `toHaveBeenCalledWith('/api/pedidos/itens/item_1/classificar', { sectorId: 'setor_telhas' })` | ✅ PASS |
| LAC-05 IF já classificado THEN indicar e não repetir | badge "Item classificado"; sem botão; 409 também marca | `src/app/(app)/gerente/pedidos/[orderId]/page.test.tsx:227` - `findByText('Item classificado')`; `:228` - `queryByRole('button', ...)).not.toBeInTheDocument()`; `:243` - 409 marca classificado | ✅ PASS |
| LAC-06 tela reflete item classificado após ação | badge após POST bem-sucedido | `src/app/(app)/gerente/pedidos/[orderId]/page.test.tsx:220` - `findByText('Item classificado')` | ✅ PASS |
| LAC-07 WHEN ordem aberta THEN mostrar pedido, item, setor, solicitado, executado, pendente | heading do item; "Pedido 70435 · Setor Telhas"; 10/8/2 M | `src/app/(app)/producao/atividades/[id]/ordem/page.test.tsx:79` - `findByRole('heading', { level: 2, name: 'TELA...' })`; `:80` - `getByText('Pedido 70435 · Setor Telhas')`; `:81-83` - `10 M` / `8 M` / `2 M` | ✅ PASS |
| LAC-08 WHEN imprimir THEN estilo de impressão (sem menu) | `window.print()`; ações com `print:hidden` | `src/app/(app)/producao/atividades/[id]/ordem/page.test.tsx:102` - `expect(imprimir).toHaveBeenCalledTimes(1)`; `:110` - `botao.closest('.print\\:hidden')).not.toBeNull()` | ✅ PASS (ver observação O1) |
| LAC-09 WHEN técnico abre THEN listar jobs com status e erros | `GET /api/integracao/jobs`; status + errorCode visíveis | `src/app/(app)/tecnico/integracao/page.test.tsx:68` - `findByText('Pedido 70435')`; `:69` - `getByText('Falhou')`; `:70` - `getByText(/Erro: CONNECTOR_TIMEOUT/)`; API `src/app/api/integracao/jobs/route.test.ts:92-99` | ✅ PASS |
| LAC-10 WHEN job selecionado THEN mostrar eventos | `GET /api/integracao/pedidos/:id`; eventos renderizados | `src/app/(app)/tecnico/integracao/page.test.tsx:87` - `findByText('DISPATCHED')`; `:88` - `getByText('RETRY')`; `:89` - `toHaveBeenCalledWith('/api/integracao/pedidos/job_1')` | ✅ PASS |
| LAC-11 WHEN falha transitória THEN repetir até limite antes de FAILED | 3 tentativas (env `CONNECTOR_MAX_ATTEMPTS`), backoff 1s, `RUNNING` em sucesso | `src/app/api/integracao/despacho.test.ts:165` - `chamadas).toHaveLength(2)`; `:179` - `toHaveLength(3)` + `status).toBe('FAILED')`; `:224-233` - limite por env = 2; `:245` - `sleeps).toEqual([1_000, 1_000])` | ✅ PASS |
| LAC-12 IF falha definitiva THEN FAILED sem repetir | 1 chamada; `FAILED` com `errorCode` | `src/app/api/integracao/despacho.test.ts:206` - `chamadas).toHaveLength(1)`; `:209` - `events).toEqual(['DISPATCHED', 'FAILED'])`; `:218` - `CONNECTOR_UNAUTHORIZED` idem | ✅ PASS |
| LAC-13 tentativas registradas em evento do job | evento `RETRY` por tentativa frustrada com número | `src/app/api/integracao/despacho.test.ts:194-197` - `retries).toHaveLength(2)`; `detail).toBe('CONNECTOR_HTTP_ERROR (tentativa 1/3)')` / `'... 2/3'` | ✅ PASS |

**Status**: ✅ All 13 ACs covered with spec-matching assertions (1 minor observation O1, non-blocking).

---

## Edge Cases

- [x] IF importação falhar THEN mostrar `errorCode`: `src/app/(app)/integracao/page.test.tsx:103` - `findByText('Código do erro: ORDER_NOT_FOUND')`.
- [x] IF lista de jobs vazia THEN estado vazio: `src/app/(app)/tecnico/integracao/page.test.tsx:78` - `findByText('Sem jobs de integração')`.

---

## Discrimination Sensor

Isolated scratch via file backups in `%TEMP%\opencode\sensor-lacunas` (no `git stash`). Baseline `git status --porcelain` = clean; restored after each mutation. Final `git status --porcelain` and `git diff --stat` = clean (matches baseline).

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 | `src/app/api/integracao/despacho.ts:91` | Retry classification: `if (!transitorio \|\| ...)` → `if (transitorio \|\| ...)` (transient↔definitive inverted) | ✅ Killed (7 failed) |
| 2 | `src/app/api/integracao/despacho.ts:81` | Max-attempts boundary: `attempt <= maxAttempts` → `attempt < maxAttempts` | ✅ Killed (2 failed) |
| 3 | `src/app/(app)/integracao/page.tsx:77` | Import status/error mapping: find `FAILED` event → find `RETRY` event | ✅ Killed (1 failed) |
| 4 | `src/shared/ui/pedido-detalhe.tsx:295` | Classify pending guard: `=== 'CLASSIFIED'` → `!== 'CLASSIFIED'` | ✅ Killed (5 failed) |
| 5 | `src/app/(app)/tecnico/integracao/page.tsx:128` | Técnico empty state: `!jobs \|\| length===0` → `!jobs && length===0` | ✅ Killed (1 failed) |
| 6 | `src/app/api/integracao/despacho.ts:108` | RETRY event detail: `tentativa ${attempt}` → `${attempt + 1}` | ✅ Killed (1 failed) |
| 7 | `src/app/api/setores/route.ts:12` | Read permission regression: `consultar_pedidos` → `gerenciar_setores` | ✅ Killed (1 failed) |

**Sensor depth**: P0-full (7 manual behavior-level mutations, ≥5 required).
**Result**: 7/7 killed - PASS ✅. No surviving mutants.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ |
| No scope creep | ✅ (see Deviations) |
| Matches patterns | ✅ (ports, `autorizar`, `apiGet`/`apiPost`, shared UI) |
| Spec-anchored outcome check (asserted values match spec) | ✅ |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ |
| Every test maps to a spec requirement - no unclaimed tests | ✅ |
| Documented guidelines followed: `docs/testes.md`, `docs/frontend.md`, `AGENTS.md` | ✅ |

---

## Gate Check

- **Gate command**: `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`; plus `npm run test:e2e`
- **Result**: 8/8 gates passed, 0 failed

| Gate | Exit | Detail |
| ---- | ---- | ------ |
| `prisma:generate` | 0 | Client generated |
| `lint` | 0 | 0 errors, 3 pre-existing warnings |
| `typecheck` | 0 | clean |
| `typecheck:connector` | 0 | clean |
| `test:coverage` | 0 | 90 files, **658 tests passed**, coverage 96.69% stmts / 94.04% branch |
| `build` | 0 | all 43 routes compiled (incl. `/integracao`, `/tecnico/integracao`, `/producao/atividades/[id]/ordem`) |
| `test:e2e` | 0 | 44 passed (2 projects) |

- **Test count before feature**: ~611 (unit; derived from +47/-2 test blocks in the diff)
- **Test count after feature**: 658 unit + 44 e2e
- **Delta**: +47 unit, +5 e2e
- **Skipped tests**: none
- **Failures**: none
- **Test integrity**: 2 removed test blocks are intentional replacements (neutral home → técnico redirect; empty-shell → técnico nav), not silent deletions.

---

## Deviations Investigated

| # | Deviation | Verdict |
| - | --------- | ------- |
| a | `CONNECTOR_RETRY_BACKOFF_MS` env added (design only named `CONNECTOR_MAX_ATTEMPTS`) | ✅ Justified. `resolverRetryBackoffMs` defaults to 1_000 (spec's "backoff 1s"); override enables fast tests (`pedidos/route.test.ts` sets `0`) and ops tuning. No behavior regression. |
| b | New `ListaJobsRepository` port | ✅ Justified. Interface segregation; `prismaIntegracaoRepository` implements `IntegracaoRepository & ListaJobsRepository`; route depends on the port. Matches existing port style. |
| c | `GET /api/pedidos/[orderId]` includes `classificationStatus` | ✅ Justified. Required by UI to render pending vs. classified (LAC-04/05/06). Defaults to `PENDING_CLASSIFICATION` when spec missing. Covered by `consulta-pedidos.test.ts:322` and `route.test.ts:142`. |
| d | `GET /api/setores` permission `gerenciar_setores` → `consultar_pedidos` | ✅ Justified and safe. Returns only active sectors (id, code, name, active) - non-sensitive read for classification. POST/PATCH still require `gerenciar_setores` (verified `route.test.ts:195`). Mutation 7 confirms the new permission is asserted; 403 still returned for profile-less users. |
| e | `print:hidden` on shell header/nav (`app-shell.tsx:60,102`) | ✅ Justified for LAC-08 "sem menu"; additive CSS only. See O1: not directly asserted. |
| f | Nav additions (`/integracao` for PM/SR/TR; `/tecnico/integracao` for TR) | ✅ Justified. Matches permission matrix: `solicitar_importacao` = PM/TR/SR; `monitorar_integracao` = TR/SR. Operator/Seller/Shipping correctly excluded. `app-shell.test.tsx` updated. |

### Observations (non-blocking)

- **O1**: LAC-08 "sem menu" - the shell's `print:hidden` on header/nav is not asserted by any test; only the ordem actions container is (`ordem/page.test.tsx:110`). A mutation removing the shell class would survive. Low-risk cosmetic/supporting change; the AC's primary evidence (print invocation + `print:hidden` on actions) is covered.
- **O2**: `GET /api/integracao/jobs` returns each job's `idempotencyKey` (`pedido:<orderNumber>`), which duplicates the already-returned `legacyOrderNumber`. No additional information disclosure.
- **O3**: Job `attemptCount` is not incremented during retry; the spec requires attempts recorded as events (LAC-13), which is satisfied via `RETRY` events.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| LAC-01..LAC-13 | Done | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 13/13 ACs matched spec outcome (1 minor observation O1, non-blocking)
**Sensor**: 7/7 mutations killed
**Gate**: 8 passed, 0 failed

**What works**: Import by order number with status polling (LAC-01/02/03); item classification with pending/classified/reflect handling (LAC-04/05/06); production order with data + print style (LAC-07/08); técnico jobs + events screen with empty state (LAC-09/10); connector dispatch retry on transient errors only, definitive errors fail fast, each attempt evented (LAC-11/12/13).

**Issues found**: none blocking.

**Next steps**: Mark feature verified; optionally add a test asserting shell `print:hidden` (O1) in a future pass.
