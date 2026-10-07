# producao-e-fila Validation

**Date**: 2026-10-07
**Spec**: `.specs/features/producao-e-fila/spec.md`
**Diff range**: `feb6458..HEAD` (11 feature commits: T1 `8d32c05` → T11 `cb54a66`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Commit    | Notes                                                                 |
| ---- | ------- | --------- | --------------------------------------------------------------------- |
| T1   | ✅ Done | `8d32c05` | unidades: peça inteira / metro 2 casas; zero/negativo/não numérico.     |
| T2   | ✅ Done | `945e091` | saldo: pendente = solicitado − executado, clamp em 0.                  |
| T3   | ✅ Done | `2f1cae3` | execução: persiste, valida unidade, resolve status.                    |
| T4   | ✅ Done | `c86ad63` | fila: filtro por setor + ordenação.                                    |
| T5   | ✅ Done | `302a4de` | prioridade: persiste e reflete na fila.                                |
| T6   | ✅ Done | `1c16899` | ordem de produção: pedido/item/setor/saldo.                            |
| T7   | ✅ Done | `c2a634c` | adapter Prisma (sem testes por matriz/AD-002).                         |
| T8   | ✅ Done | `fcb40a9` | rota GET fila.                                                         |
| T9   | ✅ Done | `529dc89` | rota POST execuções.                                                   |
| T10  | ✅ Done | `80bc512` | rota PATCH prioridade.                                                 |
| T11  | ✅ Done | `cb54a66` | rota GET ordem.                                                        |

All 11 tasks committed; `tasks.md` checkboxes and spec traceability statuses are marked Done.

---

## Spec-Anchored Acceptance Criteria

> Evidence-or-zero: every AC traced to `file:line` + the exact assertion. Asserted values compared against the spec-defined outcome.

| AC | Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- | --- |
| PROD-01 | Operador consulta a fila → atividades dos seus setores | only activities whose `sectorId` ∈ user sectors | `src/modules/producao/fila.ts:23-30` + `fila.test.ts:42-54` - `expect(fila.map(i=>i.id)).toEqual(['act_telha'])`; `src/app/api/producao/atividades/route.test.ts:68-80` - `expect(body.atividades.map(...)).toEqual(['act_telha'])` | ✅ PASS |
| PROD-02 | Ordenar por prioridade desc, depois criação | priority DESC, tie-break `createdAt` ASC | `fila.ts:28-30` + `fila.test.ts:71-84` - `toEqual(['act_alta','act_media','act_baixa'])`; `:86-108` - `toEqual(['act_antiga','act_nova'])`; `:110-132` priority precedence; route `atividades/route.test.ts:82-123` | ✅ PASS |
| PROD-03 | Usuário sem setor → lista vazia | `[]`, repo de atividades não consultado | `fila.ts:25` - `if (setores.length === 0) return []`; `fila.test.ts:134-144` - `expect(fila).toEqual([])` + `setoresConsultados` length 0; `atividades/route.test.ts:125-133` - `body.atividades` `[]` | ✅ PASS |
| PROD-04 | Registra quantidade → persiste com usuário e data/hora | execution row with `userId` + `occurredAt` | `registrar-execucao.ts:86-109`; `registrar-execucao.test.ts:73-86` - `userId 'user_1'`, `occurredAt === NOW`, `quantidade '4'`; `execucoes/route.test.ts:124-136` - 201 + `body.execucao.userId 'user_1'` + persisted | ✅ PASS |
| PROD-05 | Quantidade fora da unidade → 400 | HTTP 400 | `unidades.ts:33-45`; `registrar-execucao.ts:96`; `registrar-execucao.test.ts:88-98` - rejects `QuantidadeInvalidaError`; `execucoes/route.test.ts:138-145` - `expect(response.status).toBe(400)` | ✅ PASS |
| PROD-06 | Soma alcança solicitado → COMPLETED | status `COMPLETED` (executado ≥ solicitado) | `registrar-execucao.ts:60-67`; `registrar-execucao.test.ts:112-125` - `result.status 'COMPLETED'`, `status.get('act_1') 'COMPLETED'`, `pendente '0'` | ✅ PASS |
| PROD-07 | Soma ultrapassa solicitado → DIVERGENT | status `DIVERGENT` (executado > solicitado) | `registrar-execucao.ts:64`; `registrar-execucao.test.ts:127-140` - `result.status 'DIVERGENT'`, `pendente '0'` | ✅ PASS |
| PROD-08 | Pendente = solicitado − executado | `solicitado − executado`, clamp 0 | `saldo.ts:18-22`; `saldo.test.ts:7-14` - `pendente '2'`; `:16-23` - `'0'`; `:25-32` - `'0'` quando ultrapassa | ✅ PASS |
| PROD-09 | Consulta atividade → solicitado, executado, pendente | all three present and correct | `saldo.ts:8-12` + `saldo.test.ts:34-43`; `ordem-producao.ts:31-40` + `ordem-producao.test.ts:46-54`; `ordem/route.test.ts:83-93` - `solicitado '10'`, `executado '8'`, `pendente '2'`; `execucoes/route.test.ts:133` - `saldo.pendente '6'` | ✅ PASS |
| PROD-10 | Unidade: peça inteira; metro 2 casas | reject fraction for integer unit; round meter to 2 dp | `unidades.ts:14-19,41-44,48-53`; `unidades.test.ts:9-13` - peça `'10'`; `:15-17` rejects `'2.5'`; `:29-33` metro `'8.5'`; `:35-39` `'8.567'`→`'8.57'`; `:46-53` format `'10'`/`'2.00'`; `saldo.test.ts:45-61` - `'2.00'` metro, `'2'` peça | ✅ PASS ⚠️ |
| PROD-11 | Gerente define prioridade → persiste e reflete na fila | persisted + reorders queue | `prioridade.ts:18-25` + `adapter:123-131`; `prioridade.test.ts:44-50` - `store[0].priority 7`; `:70-79` - queue reorder `['act_a','act_b']`; `prioridade/route.test.ts:80-89` - 200 + `body.atividade.priority 7` | ✅ PASS |
| PROD-12 | Ordem solicitada → pedido, item, setor, solicitado, executado, pendente | all six fields correct | `ordem-producao.ts:31-40`; `ordem-producao.test.ts:36-54`; `ordem/route.test.ts:71-93` - asserts all six values | ✅ PASS |
| PROD-13 | Atividade inexistente → 404 | HTTP 404 | `registrar-execucao.ts:90-91`, `ordem-producao.ts:35-36`, `prioridade.ts:22-23`; `registrar-execucao.test.ts:192-199`; `ordem-producao.test.ts:70-76`; `execucoes/route.test.ts:168-173` - 404; `ordem/route.test.ts:105-109` - 404; `prioridade/route.test.ts:91-95` - 404 | ✅ PASS |
| PROD-14 | Operador fora do setor → 403 | HTTP 403 | `registrar-execucao.ts:93-94`; `registrar-execucao.test.ts:180-190` - `OperadorForaDoSetorError`; `execucoes/route.test.ts:156-166` - `expect(response.status).toBe(403)` | ✅ PASS |
| PROD-15 | Quantidade zero/negativa → 400 | HTTP 400 | `unidades.ts:38-40`; `execucoes/route.ts:54-56` (QuantidadeInvalidaError→400); `unidades.test.ts:19-27`; `registrar-execucao.test.ts:100-110`; `execucoes/route.test.ts:138-145` | ✅ PASS ⚠️ |

**Status**: ✅ All 15 ACs covered and asserted on spec-defined outcomes. 4 spec-precision gaps flagged (below); no AC is uncovered.

**Conjunction/payload rule**: payload fields are asserted on value/state (e.g. `body.atividades` ids, `body.saldo.pendente '6'`, `body.ordem.pendente '2'`), not merely on call occurrence. No AC passes on a call-only assertion.

### Spec-precision gaps (non-blocking)

1. **Unit→"metro" mapping is an undefined hard-coded allowlist.** `unidades.ts:14` - `UNIDADES_METRO = {M, MT, M2, M², METRO, METROS}`. The spec says "metro com duas casas decimais" (PROD-10) but never defines which legacy unit codes map to meter. Any code outside the set (e.g. `ML`, `MTL`, `M3`) is silently treated as piece/integer. Tests only exercise `M` and `UN`.
2. **Response envelope/field names chosen without spec definition.** `{ atividades }`, `{ execucao, status, saldo }`, `{ atividade }`, `{ ordem }`. The spec does not define the HTTP body shape. The nested ordem fields (pedido/item/setor/solicitado/executado/pendente) DO match the spec names, so PROD-12 is well anchored.
3. **Malformed/missing body → 400 (T9/T10) is extra behavior.** `execucoes/route.ts:26-36`, `prioridade/route.ts:17-27`. Spec is silent on malformed JSON; the 400 is consistent with the PROD-05/PROD-15 contract but not specified.
4. **PROD-10 says "unidade do setor" but the implementation keys off the item unit.** `Sector` has no unit column (`prisma/schema.prisma:80-90`); the unit comes from `OrderItem.unit` (`schema.prisma:134`, adapter `prisma-producao-repository.ts:90`). This matches design.md and the spec's Independent Test ("Atividade de 10 m"), but diverges from the literal spec wording.
5. **PROD-15 HTTP 400 for zero/negative is proven via the shared error class.** Zero/negative rejection is asserted at domain level (`unidades.test.ts:19-27`, `registrar-execucao.test.ts:100-110`); the HTTP 400 is asserted for the same `QuantidadeInvalidaError` via the fractional case (`execucoes/route.test.ts:138-145`). No HTTP test feeds `0`/`-2` directly.

---

## Edge Cases

- [x] Atividade inexistente → 404: handled (`registrar-execucao.ts:90-91`; asserted at all four routes, PROD-13).
- [x] Operador fora do setor → 403: handled (`registrar-execucao.ts:93-94`; asserted PROD-14).
- [x] Quantidade zero/negativa → 400: handled (`unidades.ts:38-40`; asserted domain-level + shared error mapping PROD-15).

---

## Discrimination Sensor

**Method**: isolated per-file backups under `%TEMP%\producao-sensor-backup`; each file mutated in place, targeted test run, then restored from backup. `git stash` was **not** used. Baseline `git status --porcelain` was empty and `git diff` was empty before and after.

| # | Mutation | File:line | Description | Killed? |
| --- | --- | --- | --- | --- |
| M1 | pendente formula | `saldo.ts:19` | swap operands `solicitado.minus(executado)` → `executado.minus(solicitado)` | ✅ Killed (5 failed / 1 passed) |
| M2 | completion threshold | `registrar-execucao.ts:65` | `gte(solicitado)` → `gt(solicitado)` for `COMPLETED` | ✅ Killed (2 failed / 7 passed) |
| M3 | divergence threshold | `registrar-execucao.ts:64` | `gt(solicitado)` → `gte(solicitado)` for `DIVERGENT` | ✅ Killed (2 failed / 7 passed) |
| M4 | meter rounding | `unidades.ts:44` | `toDecimalPlaces(2)` → `toDecimalPlaces(3)` | ✅ Killed (1 failed / 8 passed) |
| M5 | piece-integer granularity | `unidades.ts:41` | disable `!quantidade.isInteger()` guard | ✅ Killed (1 failed / 8 passed) |
| M6 | queue sector filter | `fila.ts:27` | widen sector set with `'setor_corte'` | ✅ Killed (2 failed / 4 passed) |
| M7 | queue ordering | `fila.ts:29` | priority `b.priority - a.priority` → `a.priority - b.priority` | ✅ Killed (2 failed / 4 passed) |
| M8 | 403 sector guard | `registrar-execucao.ts:94` | invert `if (!pertence)` → `if (pertence)` | ✅ Killed (8 failed / 1 passed) |

**Sensor depth**: expanded (≥5 behavior-level mutations; saldo/status/data-integrity is a critical path).
**Result**: 8/8 killed - PASS ✅
**Isolation**: after all runs, `git status --porcelain` matched the empty baseline and `git diff` was byte-identical (0 lines). Real tree never mutated.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code / no speculative flexibility | ✅ |
| Surgical changes (only producao + spec/tasks) | ✅ |
| No scope creep (adapter real per design/AD-002) | ✅ |
| Matches existing patterns (port/adapter like `integracao`, `setores`) | ✅ |
| Spec-anchored outcome check (asserted values match spec) | ✅ with 4 spec-precision gaps flagged |
| Per-layer coverage met (domain 1:1 ACs; routes happy+edge+error) | ✅ |
| Every test maps to a spec AC / edge / Done-when (no unclaimed tests) | ✅ |
| Documented guidelines followed: `docs/testes.md` (80% domain), `AD-002`, tasks.md Test Coverage Matrix | ✅ |

**Per-layer coverage** (from `coverage-summary.json`, full suite):
`producao/fila.ts`, `ordem-producao.ts`, `prioridade.ts`, `registrar-execucao.ts`, `saldo.ts`, `unidades.ts`, `tipos.ts` = **100% stmts / 100% branch / 100% funcs / 100% lines**. The adapter is intentionally untested per the tasks matrix (Repository adapter = none) and `AD-002` (domain uses fakes).

**Note**: the default `text` coverage reporter omits the `producao` directory row in the full-suite table (a reporter display quirk), but the JSON summary confirms all producao domain files are at 100% and are included in the totals.

---

## Gate Check

- **Gate command**: `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`
- **Result**: 6/6 passed, 0 failed
  - `prisma:generate` → exit 0
  - `lint` → exit 0 (2 pre-existing warnings in `postcss.config.mjs`/`prettier.config.mjs`, unrelated to this feature)
  - `typecheck` → exit 0
  - `typecheck:connector` → exit 0
  - `test:coverage` → exit 0 - **32 files, 208 tests passed**, 0 failed, 0 skipped
  - `build` → exit 0 (all 4 producao routes emitted)
- **Coverage**: 96.38% stmts / 92.24% branch / 96.07% funcs / 97.88% lines (thresholds 80/75/80/80 met)
- **Test count after feature**: 208
- **Test count before feature**: ~148 (derived: 208 − 60 producao tests; not re-run at `feb6458`)
- **Delta**: +60 tests across 10 new files (39 domain + 21 route)
- **Skipped tests**: none

---

## Fix Plans (if issues found)

None. No surviving mutants, no uncovered ACs, no failed gate. The spec-precision gaps are documentation/robustness observations, not fix tasks; they are candidates for a future hardening task.

**Observation (latent risk, not a gap against the declared matrix)**: the Prisma adapter (`prisma-producao-repository.ts`) has no automated coverage by design (tasks.md matrix: adapter = none; AD-002). The real SQL for the sector filter (`:72-79`) and the transactional execution sum (`:102-121`) is therefore unverified by tests. AD-002 anticipates "teste de integração separado"; recommend scheduling it when a runtime MySQL is available.

---

## Requirement Traceability Update

The Verifier is read-only over code/tests and writes only this file; `spec.md` was **not** modified. Suggested statuses to record (all currently `Done` in spec.md):

| Requirement | Previous Status | Suggested Status |
| --- | --- | --- |
| PROD-01..PROD-15 | Done | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 15/15 ACs matched spec outcome | 4 spec-precision gaps flagged (non-blocking)
**Sensor**: 8/8 mutations killed
**Gate**: 6/6 gate commands passed (208 tests, 0 failed)

**What works**: queue filtered by user sector with priority/creation ordering; execution persisted with user+timestamp; unit validation (piece integer / meter 2 dp) and zero/negative rejection; pendente = solicitado − executado clamped at 0; COMPLETED at ≥, DIVERGENT at >; priority persisted and reflected in queue; production order returns all six required fields; 401/403/404/400 error mapping on all routes.

**Issues found**: none blocking. Ranked spec-precision/robustness observations:
1. Hard-coded meter unit allowlist (`unidades.ts:14`) - confirm the full legacy unit-code set (PROD-10).
2. Undefined HTTP response envelopes - document the contract (PROD-04/09/12).
3. Malformed-body 400 behavior unspecified (T9/T10).
4. PROD-10 wording "unidade do setor" vs item unit (Sector has no unit column).
5. Adapter has no automated coverage (accepted per AD-002; latent integration risk).

**Next steps**: none required for PASS. Optionally open a hardening task for the meter-unit allowlist and an adapter integration test when a MySQL runtime is available.
