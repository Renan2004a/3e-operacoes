# ocorrencias Validation

**Date**: 2026-10-07
**Spec**: `.specs/features/ocorrencias/spec.md`
**Diff range**: `64fc26e..421a017` (7 feature commits: T1 `8ce0fb0` → T7 `421a017`; docs commit `64fc26e` precedes)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Commit    | Notes                                                                 |
| ---- | ------- | --------- | --------------------------------------------------------------------- |
| T1   | ✅ Done | `8ce0fb0` | motivos: lista ativos por tipo + valida vínculo; 6 tests.              |
| T2   | ✅ Done | `3e4486e` | registrar: perda/refugo/indisp/pausa/parada; 12 tests (declared 10).   |
| T3   | ✅ Done | `19b6197` | listar: ocorrências da atividade; 5 tests.                            |
| T4   | ✅ Done | `72e9995` | schema: `MotivoOcorrencia` + `Occurrence.motivoId` (reasonCode removed). |
| T5   | ✅ Done | `ecf4b12` | adapter Prisma (sem testes por matriz/AD-002).                        |
| T6   | ✅ Done | `0404fd3` | rota POST/GET ocorrências; 10 tests (declared 6).                     |
| T7   | ✅ Done | `421a017` | rota GET motivos; 5 tests.                                            |

All 7 tasks committed. `tasks.md` checkboxes and `spec.md` traceability statuses were updated to `Implemented` inside the feature commits (verified in the `64fc26e..421a017` diff).

---

## Spec-Anchored Acceptance Criteria

> Evidence-or-zero: every AC traced to `file:line` + the exact assertion. Asserted values compared against the spec-defined outcome.

| AC | Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- | --- |
| OCO-01 | Registra perda/refugo/indisp com motivo válido → persiste vinculada à atividade com usuário e data/hora | persisted row with `activityId`, `userId`, `occurredAt` | `registrar-ocorrencia.test.ts:92` - `expect(result.activityId).toBe('act_1')`, `:112` userId `'user_1'`, `:117` `occurredAt` `toBe(NOW)`, `:118` `ocorrencias` length 1; route `route.test.ts:152` - `:161` `status 201`, `:163` userId, `:165` quantidade `'2'`, `:166` motivoId, `:167` persisted | ✅ PASS |
| OCO-02 | Perda/refugo/indisp sem motivo → rejeitar `400` | HTTP 400, no persistence | `registrar-ocorrencia.test.ts:151` - `:160` rejects `MotivoObrigatorioError` for PERDA/REFUGO/INDISPONIBILIDADE, `:162` `ocorrencias` length 0; route `route.test.ts:170` - `:178` `status 400`, `:179` error `'motivo_required'`, `:181` length 0 | ✅ PASS |
| OCO-03 | Motivo inexistente/inativo → rejeitar `400` | HTTP 400 | `registrar-ocorrencia.test.ts:165` - `:180` rejects `MotivoInvalidoError` for `nao_existe`/`inativo`/`de_refugo`; `motivos.test.ts:67` (`:70-72`) inexistente, `:75` (`:81-84`) inativo + outro tipo; route `route.test.ts:184` - `:192` `status 400`, `:193` error `'invalid_motivo'`, `:194` length 0 | ✅ PASS |
| OCO-04 | Quantidade fora da unidade do item → rejeitar `400` | HTTP 400 | `registrar-ocorrencia.test.ts:185` - `:196` rejects `QuantidadeInvalidaError` for `'2.5'` in `UN`, `:197` length 0; route `route.test.ts:197` - `:206` `status 400`, `:207` error `'invalid_quantity'`, `:208` length 0 | ✅ PASS |
| OCO-05 | Perda/refugo registrada → **NÃO** alterar saldo pendente de produção | production balance unchanged | `registrar-ocorrencia.test.ts:217` - `:236` `expect(producao.map(i=>i.toString())).toEqual(['4'])`, `:237` `ocorrencias` length 2, `:238` no `saldo` field | ✅ PASS ⚠️ weak evidence (see gaps) |
| OCO-06 | Ocorrência registrada → registrar usuário e data/hora | `userId` + `occurredAt` persisted | `registrar-ocorrencia.test.ts:111` userId `'user_1'`, `:117` `occurredAt` `toBe(NOW)` (same test as OCO-01) | ✅ PASS |
| OCO-07 | Consulta ocorrências → retorna tipo, quantidade, motivo, observação e data/hora | all five fields present/correct | `listar-ocorrencias.test.ts:28` - `:55` tipo `'PERDA'`, `:56` quantidade `'2'`, `:57` motivo.descricao, `:58` observacao, `:59` occurredAt; route `route.test.ts:243` - `:263` tipo, `:264` quantidade `'2'`, `:265` motivo.descricao, `:266` observacao | ✅ PASS |
| OCO-08 | Consulta motivos de um tipo → apenas ativos daquele tipo | only `ativo:true` of requested `tipo` | `motivos.test.ts:34` - `:43` `expect(motivos.map(i=>i.id)).toEqual(['perda_ativa'])`; route `motivos/route.test.ts:55` - `:64` `motivos` length 1, `:65` codigo `'DEFEITO_CORTE'` | ✅ PASS |
| OCO-09 | Aceitar apenas motivos cadastrados e do mesmo tipo | reject unknown/inactive/other-type | `motivos.test.ts:56` accept same-type active (`:63` id, `:64` descricao); `:67` reject inexistente; `:75` reject inativo + outro tipo; `registrar-ocorrencia.test.ts:256` reject invalid motivo on PAUSA | ✅ PASS |
| OCO-10 | Atividade inexistente → `404` | HTTP 404 | `listar-ocorrencias.test.ts:118` - `:121` rejects `AtividadeNaoEncontradaError`; `registrar-ocorrencia.test.ts:283` - `:291` rejects same; route `route.test.ts:233` POST `:239` `404` + `:240` `'activity_not_found'`, `:269` GET `:272` `404` | ✅ PASS |
| OCO-11 | Operador fora do setor da atividade → `403` | HTTP 403 | `registrar-ocorrencia.test.ts:268` - `:279` rejects `OperadorForaDoSetorError`, `:280` length 0; route `route.test.ts:220` - `:228` `status 403`, `:229` error `'operator_outside_sector'`, `:230` length 0 | ✅ PASS |
| OCO-12 | Ocorrência de pausa/parada → aceitar duração em minutos sem exigir motivo | `duracaoMin` set, `motivoId` null, no motivo required | `registrar-ocorrencia.test.ts:241` - `:249` tipo `'PAUSA'`, `:250` `duracaoMin` `30`, `:251` `motivoId` `null`, `:252` `quantidade` `null`, `:253` length 1; `listar-ocorrencias.test.ts:86` - `:106` `duracaoMin` `30`, `:107` quantidade `null` | ✅ PASS |
| OCO-13 | Quantidade zero ou negativa em perda/refugo/indisp → rejeitar `400` | HTTP 400 | `registrar-ocorrencia.test.ts:200` - `:212` rejects `QuantidadeInvalidaError` for `'0'` and `'-2'`, `:214` length 0; HTTP 400 proven via shared error class at route `route.test.ts:197` (`invalid_quantity`) | ✅ PASS ⚠️ HTTP for 0/-2 not fed directly |

**Status**: ✅ 13/13 ACs matched the spec-defined outcome. No AC uncovered. 3 non-blocking spec-precision/evidence gaps flagged (below).

**Payload/conjunction rule**: payload fields are asserted on value/state, not merely on call occurrence - e.g. `result.activityId/userId/occurredAt`, `body.ocorrencia.quantidade '2'`, `body.ocorrencias[0].motivo.descricao 'Motivo'`, `body.motivos[0].codigo 'DEFEITO_CORTE'`, `status 400/403/404/201/200`. No AC passes on a call-only assertion.

### Spec-precision / evidence gaps (non-blocking)

1. **OCO-05 is not test-discriminating (weak evidence).** `registrar-ocorrencia.test.ts:236` asserts a local `producao` seed is unchanged, but the injected fake repo (`createDeps`, `:56-86`) has no production-write method and the `producao` array is never reachable from the SUT - the assertion is a smoke check on the port contract, not a behavioral observation. The real guarantee is structural: `OcorrenciaRepository` (`registrar-ocorrencia.ts:42-49`) exposes no production write, so a production write cannot be introduced in the domain without a type error. The only place it could be introduced at runtime is the adapter, which is untested by declared policy (matrix "Repository adapter = none"; AD-002). See sensor M4.
2. **OCO-03/OCO-09 HTTP-level inactive/wrong-type not fed directly.** The route test only sends `motivoId: 'nao_existe'` (`route.test.ts:188`); inactive and wrong-type rejection is asserted at the domain level and maps to the same `MotivoInvalidoError` → `invalid_motivo` 400. Same shared-error-class pattern the prior feature flagged (PROD-15).
3. **OCO-13 HTTP 400 for `0`/`-2` proven via shared error class.** `registrar-ocorrencia.test.ts:200-214` asserts the domain rejection; the HTTP 400 is asserted for the same `QuantidadeInvalidaError` via the fractional case (`route.test.ts:197-208`). No HTTP test feeds `0`/`-2` directly.

Additional non-AC observations:
- **OCO-01 route does not assert `occurredAt`** (only the domain test does, `registrar-ocorrencia.test.ts:117`); `OCO-06` rests on the domain test.
- **Undefined response envelopes**: `{ ocorrencia }`, `{ ocorrencias }`, `{ motivos }` are not defined in the spec; they are consistent with the repo convention (`{ atividades }`, `{ execucao, status, saldo }`).
- **Extra behavior not in spec**: malformed body / wrong field types → `400 invalid_body` (`route.ts:39-63`); unknown `tipo` on POST → `400 invalid_body`. Consistent with the 400 contract but unspecified.
- **Uncovered branch** `registrar-ocorrencia.ts:97` (`input.quantidade ?? ''`): the "exige motivo but quantity omitted" path (empty string → `QuantidadeInvalidaError`) has no dedicated test. Not an AC.

---

## Edge Cases

- [x] Atividade inexistente → 404: handled (`registrar-ocorrencia.ts:80`, `listar-ocorrencias.ts:31`; asserted OCO-10 at both routes).
- [x] Operador fora do setor → 403: handled (`registrar-ocorrencia.ts:83`; asserted OCO-11 domain + route).
- [x] Pausa/parada aceita duração sem motivo: handled (`registrar-ocorrencia.ts:85-98`; asserted OCO-12 domain + listagem).
- [x] Quantidade zero/negativa → 400: handled (`unidades.ts:38-40`; asserted OCO-13 domain + shared error mapping).

---

## Discrimination Sensor

**Method**: isolated per-file backups under `%TEMP%\ocorrencias-sensor-backup`; each file mutated in place, targeted `vitest run` executed, then restored from backup. `git stash` was **not** used. Baseline `git status --porcelain` and `git diff` were empty before and after; every mutated file's SHA-256 was re-verified against the baseline hash after restore.

| # | Mutation | File:line | Description | Killed? |
| --- | --- | --- | --- | --- |
| M1 | motivo-required guard | `registrar-ocorrencia.ts:88` | remove `throw new MotivoObrigatorioError` | ✅ Killed (1 failed / 11 passed) |
| M2 | wrong-type validation | `motivos.ts:73` | drop `\|\| motivo.tipo !== tipo` | ✅ Killed (2 failed / 16 passed) |
| M2b | inactive validation | `motivos.ts:73` | drop `\|\| !motivo.ativo` | ✅ Killed (2 failed / 16 passed) |
| M3 | unit validation | `unidades.ts:41` | flip `!quantidade.isInteger()` → `quantidade.isInteger()` | ✅ Killed (4 failed / 8 passed) |
| M5 | 403 sector guard | `registrar-ocorrencia.ts:83` | invert `if (!pertence)` → `if (pertence)` | ✅ Killed (11 failed / 1 passed) |
| M6 | 404 listar guard | `listar-ocorrencias.ts:31` | invert `if (!atividade)` → `if (atividade)` | ✅ Killed (5 failed / 5) |
| M4 | production-balance side effect | `prisma-ocorrencias-repository.ts:99` | add `prisma.activity.update({ status: 'DIVERGENT' })` inside `registrarOcorrencia` | ❌ **Survived** (33 passed) |

**Sensor depth**: expanded (7 behavior-level mutations; OCO-05 is a data-integrity path).
**Result**: 6/7 killed. The single survivor (M4) is confined to the Prisma adapter, which is **untested by declared policy** (Test Coverage Matrix "Repository adapter = none"; AD-002 "os testes usam fake; o domínio não depende de banco"). The domain-level production-balance guarantee is structural (the port exposes no production write), so M4 cannot be expressed in the domain without a type error. This is the same accepted latent integration risk recorded for `producao-e-fila` (`validation.md` line 137), not a regression introduced by this feature.
**Isolation**: after all runs, `git status --porcelain` was empty, `git diff` was byte-identical (0 lines), and all five mutated files matched their baseline SHA-256. Real tree never mutated.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code / no speculative flexibility | ✅ |
| Surgical changes (ocorrencias module + 2 routes + schema + tests) | ✅ |
| No scope creep | ✅ |
| Matches existing patterns | ✅ composite port mirrors `ProducaoRepository` (`prisma-producao-repository.ts:13-18`); guard + `x-user-id` mirrors producao routes |
| Spec-anchored outcome check (asserted values match spec) | ✅ with 3 non-blocking gaps flagged |
| Per-layer coverage met (domain 1:1 ACs; routes happy+edge+error) | ✅ |
| Every test maps to a spec AC / edge / Done-when (no unclaimed tests) | ✅ (401 auth tests map to the route token guard in `design.md` "Code Reuse") |
| Documented guidelines followed: `docs/testes.md` (80% domain), AD-002, tasks.md Test Coverage Matrix | ✅ |

**Per-layer coverage**: `ocorrencias` module = **100% stmts / 97.14% branch / 100% funcs / 100% lines**. The adapter is intentionally untested per the matrix and AD-002.

---

## Gate Check

- **Gate command**: `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`
- **Result**: PASS ✅ - 6/6 passed, 0 failed
  - `prisma:generate` → exit 0
  - `lint` → exit 0 (2 pre-existing warnings in `postcss.config.mjs`/`prettier.config.mjs`, unrelated to this feature)
  - `typecheck` → exit 0
  - `typecheck:connector` → exit 0
  - `test:coverage` → exit 0 - **37 files, 246 tests passed**, 0 failed, 0 skipped
  - `build` → exit 0 (both new routes emitted: `/api/motivos`, `/api/producao/atividades/[id]/ocorrencias`)
- **Coverage**: 96.93% stmts / 93.29% branch / 96.66% funcs / 98.2% lines
- **Test count after feature**: 246
- **Test count before feature**: 208 (from `.specs/features/producao-e-fila/validation.md` line 126)
- **Delta**: +38 tests across 5 new test files (motivos 6 + registrar 12 + listar 5 + ocorrências route 10 + motivos route 5) - matches the delta exactly; no tests deleted
- **Skipped tests**: none

---

## Investigated Deviations

1. **T5 adapter uses `OcorrenciasRepository extends OcorrenciaRepository` + a direct `listarOcorrencias`** (`prisma-ocorrencias-repository.ts:15-18`). Not a defect: it is the same single composite-port convention already used by `ProducaoRepository` (`prisma-producao-repository.ts:13-18`). `design.md` worded it as "implementar `MotivoRepository` e `OcorrenciaRepository`"; `OcorrenciaRepository` already extends `MotivoRepository` (`registrar-ocorrencia.ts:42`), so one composite interface covers all three ports. Structurally satisfies `ListarOcorrenciasRepository` (its `buscarAtividadeParaOcorrencia` return is a supertype of `{ id }`). Benign, pattern-consistent.
2. **Extra test counts.** T2 declares 10 tests (`tasks.md:114`) but ships 12; T6 declares 6 (`tasks.md:225`) but ships 10. The extras all map to spec ACs/edge cases (OCO-09 pausa, OCO-10, OCO-12, plus the 401 token guard), none are unclaimed, and no tests were deleted. The stale declared counts in the task checkboxes are a documentation inconsistency, not a coverage problem.

---

## Fix Plans (if issues found)

None blocking. No uncovered AC, no failed gate, and the single surviving mutant is sanctioned by AD-002 + the declared Test Coverage Matrix.

**Recommendation (hardening, not a fix task)**: OCO-05's production-balance guarantee currently rests on the port contract + type system, and the adapter (the only runtime place a production write could be added) has no automated coverage. When a MySQL runtime is available, add an integration test asserting that registering a PERDA/REFUGO does not create an `Execution` nor change `Activity.status`/saldo, or add a domain spy asserting no production method is called. This is the same latent risk already accepted for `producao-e-fila`.

---

## Requirement Traceability Update

The Verifier is read-only over code/tests and writes only this file; `spec.md` was **not** modified. Suggested statuses to record (all currently `Implemented` in spec.md):

| Requirement | Previous Status | Suggested Status |
| --- | --- | --- |
| OCO-01..OCO-13 | Implemented | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 13/13 ACs matched spec outcome | 3 non-blocking spec-precision/evidence gaps flagged
**Sensor**: 7 mutations injected, 6 killed, 1 survived (adapter-only, sanctioned by AD-002)
**Gate**: 6/6 gate commands passed (246 tests, 0 failed)

**What works**: occurrence registration for perda/refugo/indisponibilidade with mandatory same-type active motivo; pausa/parada with duration and no motivo; unit-aware quantity validation (reject fraction on integer units, zero/negative); occurrence persistence with user + timestamp; activity listing with tipo/quantidade/motivo/observação/data; closed motivo list filtered by active + tipo; error mapping 400/403/404/401 on both routes; perda/refugo do not alter production balance (port-level guarantee).

**Issues found**: none blocking. Ranked observations:
1. OCO-05 test is non-discriminating (`registrar-ocorrencia.test.ts:236`) and the adapter is untested (AD-002) - the production-balance guarantee is structural only; sensor M4 survived.
2. OCO-03/OCO-09 inactive/wrong-type rejection at HTTP level proven via shared error class, not fed directly.
3. OCO-13 HTTP 400 for `0`/`-2` proven via shared error class.
4. Stale declared test counts in `tasks.md` for T2 (10 vs 12) and T6 (6 vs 10).

**Next steps**: none required for PASS. Optionally schedule an adapter integration test for the production-balance invariant when a MySQL runtime exists.
