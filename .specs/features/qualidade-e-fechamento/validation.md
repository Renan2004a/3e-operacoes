# Qualidade e Fechamento Validation

**Date**: 2026-10-07
**Spec**: `.specs/features/qualidade-e-fechamento/spec.md`
**Diff range**: `e7f1112..2edbab8` (T1 `1830f56`, T2 `7764760`, T3 `bb62b26`, T4 `da85c83`, T5 `649a136`, T6 `e453af6`, T7 `2edbab8`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `1830f56` - ordering + pagination normalization. |
| T2   | ✅ Done | `7764760` - prazo excludes no-execution; uses last execution. |
| T3   | ✅ Done | `bb62b26` - cliente filter documented/tested. |
| T4   | ✅ Done | `da85c83` - gerente regains Fila link (QF-10). |
| T5   | ✅ Done | `649a136` - a11y focus/labels/role=alert/non-color. |
| T6   | ✅ Done | `e453af6` - Playwright login + viewports. |
| T7   | ✅ Done | `2edbab8` - go-live doc. |

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| QF-01 WHEN E2E com API mockada THEN login válido navega / inválido mostra erro | Valid navigates to profile route; invalid shows error and stays on `/login` | `tests/e2e/login.spec.ts:53-56` - `page.waitForRequest((r) => r.url().includes('/operador/fila'))` after click; `tests/e2e/login.spec.ts:67-68` - `expect(page.getByRole('alert').filter({hasText:/inválidos/i})).toBeVisible()` + `expect(page).toHaveURL(/\/login$/)`; unit `src/app/login/page.test.tsx:76` - `expect(mocks.push).toHaveBeenCalledWith('/operador/fila')`, `:119` - `expect(mocks.push).not.toHaveBeenCalled()` | ✅ PASS (⚠️ valid-login asserts a client navigation **request**, not the settled final URL - see gaps) |
| QF-02 WHEN largura 360/768/1024/1440 THEN sem rolagem horizontal | `scrollWidth <= innerWidth` at each viewport | `tests/e2e/login.spec.ts:85-90` - `document.documentElement.scrollWidth` vs `window.innerWidth`, `expect(scrollWidth).toBeLessThanOrEqual(innerWidth)`; loop `:80-81` over `VIEWPORTS` `:13-18` | ✅ PASS (real, not tautological - `/login` has no `overflow-x-hidden`) |
| QF-03 The E2E SHALL rodar no Chromium headless sem banco | Runs on chromium, no DB | `tests/e2e/login.spec.ts:71-72` - `expect(browserName).toBe('chromium')`; projects only chromium (`playwright.config.ts:9-12`); all `/api/**` mocked via `page.route` `:20-28` | ✅ PASS (⚠️ "headless" is implicit via Playwright default, not asserted) |
| QF-04 Componentes-chave com rótulos associados e foco visível | Label association + visible focus token | `src/shared/ui/base-components.test.tsx:53-61` - `getByLabelText('E-mail')` is `HTMLInputElement`; `:42-49` - Button has `focus-visible:ring-2`/`ring-accent`; `:91-99` - input `focus-visible:ring-2`; `src/shared/ui/app-shell.test.tsx:89-93` (link), `:95-99` (menu button); `src/shared/ui/pedidos-lista.test.tsx:98` - select `focus-visible:ring-2`; `src/app/login/page.test.tsx:65-66` - label+type | ✅ PASS (focus asserted via class token `FOCO_VISIVEL`, `utils.ts:12-13`) |
| QF-05 Mensagens de erro anunciadas (`role="alert"`) | error role=alert | `src/shared/ui/base-components.test.tsx:76-89` - Field error `getByRole('alert')` + `aria-invalid`+`aria-describedby`; `:143-158` - Alert error `getByRole('alert')`; `src/shared/ui/pedidos-lista.test.tsx:60-61` - `findByRole('alert')`; `tests/e2e/login.spec.ts:67` | ✅ PASS |
| QF-06 Estado não depende apenas de cor | state carries text | `src/shared/ui/base-components.test.tsx:117-121` - Badge renders text `Concluída`; `:160-171` - Alert info `role=status` with text and not `alert`; `src/shared/ui/pedidos-lista.test.tsx:43-45` - status conveyed as text `Pendente` (`ROTULO_STATUS`) | ✅ PASS |
| QF-07 WHEN lista paginada THEN ordem determinística | created desc, id tiebreak; stable pagination | `src/modules/indicadores/consulta-pedidos.test.ts:179-189` - `toEqual(['ped_2','ped_3','ped_1'])` (desc); `:191-202` - `toEqual(['ped_a','ped_b','ped_c'])` (id tiebreak); `:204-247` - default 20 / cap 100 / normalize; impl `consulta-pedidos.ts:93-96,137` | ✅ PASS |
| QF-08 WHEN prazo calculado THEN atividade sem execução NÃO conta como atrasada | no-execution completed excluded; last execution used | `src/modules/indicadores/pcp.test.ts:137-154` - `{concluidasComPrazo:0, concluidasNoPrazo:0, percentual:0}`; `:190-209`, `:211-230` - not penalized; `:156-171` (in time), `:173-188` (late); impl `pcp.ts:67-78` | ✅ PASS |
| QF-09 Filtro de cliente documentado (substring, sem diferenciar maiúsculas) | hint documents substring/case-insensitive; substring sent | `src/shared/ui/pedidos-lista.test.tsx:87-92` - `getByText(/não diferencia maiúsculas/i)`; `:101-110` - `'/api/pedidos?cliente=Cons'`; `:112-121` - trims; `:123-132` - omits when blank; server `consulta-pedidos.test.ts:103-112` - case-insensitive match | ✅ PASS |
| QF-10 Navegação do gerente inclui a fila | gerente has `/operador/fila` | `src/shared/ui/navegacao-perfil.test.ts:6-11` - `toContainEqual({href:'/operador/fila',label:'Fila'})`; `:17-21` - same href as OPERATOR; `src/shared/ui/app-shell.test.tsx:144` - `getByRole('link',{name:'Fila'})` href `/operador/fila` | ✅ PASS |
| QF-11 WHEN go-live lido THEN descreve Cloudflare Tunnel/Access, conector no cliente e troca AWS→Top Gerente real | doc sections present, no credentials | `docs/go-live.md:22-56` (conector local), `:58-69` (Cloudflare Tunnel/Access), `:88-105` (troca AWS → Top Gerente real); only env-var **names**, no values | ✅ PASS |

**Status**: ✅ All 11 ACs covered, 0 gaps. ⚠️ 2 spec-precision notes (QF-01 valid-login request-vs-final-URL; QF-03 headless implicit).

---

## Discrimination Sensor

Isolated scratch via file backups (`.bak`), never `git stash`. Each mutation applied to the real file, targeted test run, file restored from backup, backup deleted.

| # | Mutation | File:line | Description | Killed? |
| - | -------- | --------- | ----------- | ------- |
| 1 | Ordering comparator | `src/modules/indicadores/consulta-pedidos.ts:94-95` | Removed id tiebreak (`return porData`), leaving unstable equal-key order | ✅ Killed (`consulta-pedidos.test.ts` "desempata pela chave do pedido" failed) |
| 2 | Prazo no-execution exclusion | `src/modules/indicadores/pcp.ts:67-72` | Dropped `atividade.completedAt !== null` from the denominator filter | ✅ Killed (3 QF-08 tests failed) |
| 3 | Cliente filter | `src/shared/ui/pedidos-lista.tsx:59` | `if (filtros.cliente.trim())` → `if (filtros.cliente)`, sending whitespace-only param | ✅ Killed (`pedidos-lista.test.tsx` "omite o parâmetro ... vazio" failed) |
| 4 | Gerente nav map | `src/shared/ui/navegacao-perfil.ts:15-22` | Removed the `Fila` entry from `PRODUCTION_MANAGER` | ✅ Killed (4 tests across `navegacao-perfil.test.ts` + `app-shell.test.tsx` failed) |
| 5 | A11y focus guard | `src/shared/ui/button.tsx:37` | Removed `FOCO_VISIVEL` from the Button className | ✅ Killed (`base-components.test.tsx` "expõe foco visível no próprio botão" failed) |
| 6 | A11y role=alert guard | `src/shared/ui/alert.tsx:25` | `variant === 'error' ? 'alert' : 'status'` → `'status'` | ✅ Killed (2 tests: `base-components.test.tsx` + `pedidos-lista.test.tsx` failed) |

**Sensor depth**: expanded (≥5; P1 critical paths: ordering, deadline integrity, filter, nav, a11y).
**Result**: 6/6 killed - PASS ✅
**Isolation**: pre-sensor `git status --porcelain` empty; post-sensor `git status --porcelain` empty and `git diff --stat` empty - matches baseline. No `.bak` residue.

---

## Deviations Investigated

| Deviation | Finding | Weakens coverage? |
| --------- | ------- | ----------------- |
| `playwright.config.ts` baseURL/webServer `127.0.0.1` → `localhost` (`:6,:15`) | Documented at `tests/e2e/login.spec.ts:8-10`: Next.js 16 blocks dev resources when browser origin differs from dev origin, breaking hydration. Both `baseURL` and `webServer.url` use the same origin; E2E still exercises the real `npm run dev` server. | ❌ No |
| `vitest.config.ts` excludes `tests/e2e/**` (`:12-13`) | Playwright specs import `@playwright/test` and cannot run under Vitest. E2E has its own gate `npm run test:e2e`, which is green (14/14). | ❌ No |
| T4 reversed pre-existing app-shell assertion (`da85c83`) | Old test asserted gerente had **no** Fila link; QF-10 mandates the opposite. The assertion was replaced (not deleted): `app-shell.test.tsx:144` now asserts the Fila link, and `:145-146` still assert Entregas/Usuários absent. Only removed `it(...)`/`expect(...)` in the feature diff is this one intentional reversal. | ❌ No (spec-mandated) |

---

## Edge Cases

- [x] IF o E2E não encontrar o navegador THEN falha com mensagem clara: Playwright default (only chromium projects configured); chromium is installed and the suite ran.
- [x] IF a API mockada não cobrir uma rota THEN o E2E falha explicitamente: the valid-login path depends on `**/api/auth/sessao` (`login.spec.ts:38-44`); an uncovered route falls to the error branch and `waitForRequest('/operador/fila')` never resolves → test fails.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ |
| No scope creep | ✅ |
| Matches patterns | ✅ |
| Spec-anchored outcome check (asserted values match spec) | ✅ (2 spec-precision notes, non-blocking) |
| Per-layer Coverage Expectation met (domain 1:1 ACs; UI happy+edge+error; E2E happy+error) | ✅ |
| Every test maps to a spec requirement - no unclaimed tests | ✅ |
| Documented guidelines followed: `docs/testes.md`, `docs/frontend.md`, `AGENTS.md`, `vitest.config.ts`, `playwright.config.ts` | ✅ |

---

## Gate Check

- **Gate command**: `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`, plus `npm run test:e2e`
- **Result**: all steps exit 0
  - `prisma:generate` ✅ | `lint` ✅ (0 errors, 3 pre-existing warnings) | `typecheck` ✅ | `typecheck:connector` ✅
  - `test:coverage` ✅ - 82 files, **568 passed / 0 failed / 0 skipped**; statements 96.66%, branches 93.9%, functions 98.43%, lines 98.81% (thresholds 80/75/80/80)
  - `build` ✅ (Next.js 16.3.5, 24 routes)
  - `test:e2e` ✅ - **14 passed / 0 failed** (chromium-desktop + mobile-chromium × {valid, invalid, chromium, 4 viewports})
- **Test count before feature** (`e7f1112`): 535 `it(` definitions
- **Test count after feature** (`HEAD`): 560 `it(` definitions (+25; runtime 568 with `it.each`)
- **Delta**: +25 new test definitions; 1 intentional assertion reversal (T4, spec-mandated)
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans (if issues found)

None. Feature is ready.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| QF-01..QF-11 | Done | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 11/11 ACs matched spec outcome | 0 gaps | 2 spec-precision notes
**Sensor**: 6/6 mutations killed
**Gate**: 6/6 gate steps passed (568 unit + 14 E2E)

**What works**: deterministic ordering (desc + id tiebreak + pagination normalization); prazo excludes completed-without-execution and uses last execution; cliente filter documented and sends trimmed substring; gerente regains the Fila link while other profiles stay blocked; a11y focus/labels/role=alert/non-color guards; Playwright login (valid/invalid) and no-horizontal-scroll at 360/768/1024/1440 px; go-live doc covering conector, Cloudflare Tunnel/Access and AWS→Top Gerente swap with no credentials.

**Spec-precision notes (non-blocking)**:
1. QF-01 valid login asserts a client navigation **request** to `/operador/fila` (`login.spec.ts:53-56`), not the settled final URL. Constraint documented (no DB → server redirects back to `/login`); the request-level assertion is the feasible strongest check but is weaker than a final-URL assertion.
2. QF-03 "headless" is implicit in the Playwright default/config, not asserted; only `browserName === 'chromium'` is asserted (`login.spec.ts:72`).

**Issues found**: none.

**Next steps**: none - feature verified.
