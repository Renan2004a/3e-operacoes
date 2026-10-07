# frontend-fundacao Validation

**Date**: 2026-10-07
**Spec**: `.specs/features/frontend-fundacao/spec.md`
**Diff range**: `f46aa15..dafc1e3` (feature commits `e39d77b` T1 → `907f1a7` T7; fix `dafc1e3` T9; `f46aa15` docs)
**Verifier**: independent sub-agent (author ≠ verifier), re-verification iteration 2
**Verdict**: ✅ **PASS** (1 browser-unverifiable FE-06, 1 spec-precision FE-03; process note on T9 bookkeeping)

---

## Task Completion

| Task | Commit | Status | Notes |
| ---- | ------ | ------ | ----- |
| T1 | `e39d77b` | ✅ Done | Tokens em `src/app/globals.css`; sem teste (Gate build). |
| T2 | `8ac5c5c` | ✅ Done | 10 testes de componentes base. |
| T3 | `29a24d0` | ✅ Done | 7 testes de `api-client`. |
| T4 | `693767a` | ✅ Done | 6 testes de login. |
| T5 | `2cd82fd` | ✅ Done | 7 testes de `AppShell`. |
| T6 | `90dde38` | ✅ Done | 6 testes de fila. |
| T8 | `82e42b6` | ✅ Done | 6 testes de ocorrência. |
| T7 | `907f1a7` | ⚠️ Done w/ deviation | 7 testes de execução; também alterou arquivos de T6/T8 (D3). |
| T9 | `dafc1e3` | ✅ Done | Fecha o fail-open do layout; adiciona `layout.test.tsx` (4 testes). Checkboxes "Done when" ainda `[ ]` em `tasks.md` (ver D4). |

---

## Fail-Open Closure (the T9 fix)

**Closed: yes.** The default `?? 'OPERATOR'` is gone and every unauthenticated/role-less path redirects to `/login`.

Implementation `src/app/(app)/layout.tsx`:

- `:18` `if (!sessao) redirect('/login')` — no session.
- `:21` `if (!usuario || usuario.roles.length === 0) redirect('/login')` — no user **or** no roles.
- `:22` `const perfil: RoleCode = usuario.roles[0]` — no fallback default.

Evidence (asserted, not merely present):

| Path | Test | Assertion |
| ---- | ---- | --------- |
| no session | `src/app/(app)/layout.test.tsx:42-47` | `rejects.toThrow('REDIRECT:/login')` + `expect(mocks.redirect).toHaveBeenCalledWith('/login')` |
| no roles | `src/app/(app)/layout.test.tsx:49-55` | `mocks.findById → roles: []`; `rejects.toThrow('REDIRECT:/login')` + `toHaveBeenCalledWith('/login')` |
| no user | `src/app/(app)/layout.test.tsx:57-62` | `mocks.findById → null`; `rejects.toThrow('REDIRECT:/login')` |
| valid role | `src/app/(app)/layout.test.tsx:64-72` | renders; `expect(mocks.redirect).not.toHaveBeenCalled()` |

Sensor **M1** restores the old `?? 'OPERATOR'` and the no-roles test fails (rendered `perfil="OPERATOR"`), confirming the regression is actually detected.

---

## Spec-Anchored Acceptance Criteria

Mapping of the 14 IDs (3+3+2+2+2+2 = 14; FE-08 aggregates the fila "loading" + "empty" ACs, as in iteration 1).

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| FE-01 login válido navega ao perfil | autenticar + ir para a tela do perfil | `src/app/login/page.test.tsx:60` - `waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/operador/fila'))` (impl `src/app/login/page.tsx:12,32`) | ✅ PASS |
| FE-02 credenciais inválidas → erro acessível | mensagem de erro, sem navegar | `src/app/login/page.test.tsx:74-76` - `findByRole('alert')` + `toHaveTextContent(/inválidos/i)` + `expect(mocks.push).not.toHaveBeenCalled()` | ✅ PASS |
| FE-03 rótulos associados + teclado | `label` ligado ao controle, operável por teclado | `src/app/login/page.test.tsx:50-51` - `toHaveAttribute('type','email'/'password')`; `src/shared/ui/base-components.test.tsx:51` - `getByLabelText('E-mail')`; `:61-64` `aria-describedby` (impl `field.tsx:40`) | ⚠️ Spec-precision gap (keyboard not directly tested) |
| FE-04 shell exibe navegação do perfil | itens por perfil | `src/shared/ui/app-shell.test.tsx:29` - `getByRole('link',{name:'Fila'})` href `/operador/fila`; `:35` SELLER `not.toBeInTheDocument()`; integração servidor `layout.test.tsx:64-72` | ✅ PASS |
| FE-05 menu mobile por botão | menu acessível por botão em largura de celular | `src/shared/ui/app-shell.test.tsx:48-56` - `aria-expanded` `false`→`true`, nav perde `hidden`; `:62` nav com `aria-label` | ✅ PASS |
| FE-06 360–1440 px sem rolagem horizontal | sem overflow horizontal nas 4 larguras | `src/shared/ui/app-shell.test.tsx:68` - `toHaveClass('overflow-x-hidden')` (impl `app-shell.tsx:43`) | ⚠️ Não verificável em jsdom |
| FE-07 fila lista atividades dos setores | lista renderizada | `src/app/(app)/operador/fila/page.test.tsx:59-61` - `findByText('Atividade atv_1')`, `getByText('Pendente')`, `apiGet` com `/api/producao/atividades`; `:92-97` link `/operador/atividades/atv_1` | ✅ PASS |
| FE-08 estado vazio + carregando | vazio e carregando explícitos | `fila/page.test.tsx:52` - `getByRole('status')` "Carregando"; `:68` - `findByText('Sem atividades na fila')` | ✅ PASS |
| FE-09 registrar quantidade atualiza lista | POST com quantidade + saldo recarregado | `atividades/[id]/page.test.tsx:126-130` - `apiPost` com `{ quantidade: '8' }` + `findByText('Execução registrada.')`; `:154` - `findByText('Pendente: 0 peca')` | ✅ PASS |
| FE-10 quantidade inválida + teclado numérico | mensagem sem registrar; `type=number`/`inputmode=decimal` | `atividades/[id]/page.test.tsx:113-114` - `toHaveTextContent(/maior que zero/i)` + `expect(mocks.apiPost).not.toHaveBeenCalled()`; `:101-102` - `toHaveAttribute('type','number')` / `('inputmode','decimal')` | ✅ PASS |
| FE-11 ocorrência com motivo obrigatório | registra com motivo; bloqueia sem motivo | `ocorrencia-form.test.tsx:56-57` - `toHaveTextContent(/escolha o motivo/i)` + `apiPost not called`; `:71-75` - `apiPost` com `objectContaining({tipo:'PERDA', motivoId:'m1'})` + confirmação; `:79-94` tipo sem motivo não exige | ✅ PASS |
| FE-12 motivo vem da lista fechada da API | motivos da API | `ocorrencia-form.test.tsx:45-46` - `findByRole('option',{name:'Defeito de corte'})` + `apiGet` com `/api/motivos?tipo=PERDA` (impl `ocorrencia-form.tsx:55`) | ✅ PASS |
| FE-13 401 → login | redireciona ao login | `src/shared/http/api-client.test.ts:44` - `expect(assign).toHaveBeenCalledWith('/login')`; `:53` - `expect(assign).not.toHaveBeenCalled()` com `redirectOnUnauthorized:false`; `layout.test.tsx:42-47` sem sessão | ✅ PASS |
| FE-14 falha de API → erro acessível + retry | erro anunciado e tentativa de novo | `login/page.test.tsx:85-86`, `fila/page.test.tsx:75-77,86-89`, `atividades/[id]/page.test.tsx:142`, `ocorrencia-form.test.tsx:100-102`, `api-client.test.ts:59-71`, `base-components.test.tsx:136-138` | ✅ PASS |

**Status**: ✅ 12/14 PASS · 1 spec-precision (FE-03) · 1 browser-unverifiable (FE-06)

### Payload / conjunction rule
- FE-09: payload asserted **by value** (`{ quantidade: '8' }`), not just call occurrence — ✅.
- FE-11: payload asserted **by value** (`objectContaining({ tipo: 'PERDA', motivoId: 'm1' })`) — ✅.
- FE-01: navigation asserted by **exact destination** — ✅.

### Edge cases
- [x] `401` → login: covered (FE-13; `api-client.ts:33-35`; `layout.tsx:18,21` redirect sem sessão/sem perfil).
- [x] Falha de API → erro acessível + retry: covered (FE-14, 6 pontos).
- [x] Não depender apenas de cor: `base-components.test.tsx:98-102` (Badge sempre com texto); `fila/page.tsx:111-113` (rótulo textual + variante).

---

## Not Browser-Verifiable (FE-06) — assessment

FE-06 is **geometric** ("sem rolagem horizontal em 360, 768, 1024 e 1440 px") and jsdom has no layout engine, so `scrollWidth`/`clientWidth` cannot be measured. The only automated evidence is the structural guard:

- `app-shell.tsx:43` root `overflow-x-hidden` + `min-h-screen` (asserted at `app-shell.test.tsx:68`);
- `app-shell.tsx:82` nav com `flex-wrap` no mobile e coluna fixa `md:w-56` no desktop;
- `app-shell.tsx:104` `main` com `min-w-0 flex-1`;
- alvos de toque `min-h-11` (`app-shell.tsx:66,95`);
- foco visível global (`globals.css`); rótulos associados (`field.tsx:40`).

**Assessment**: these guards are *necessary but not sufficient* evidence. `overflow-x-hidden` masks overflow rather than proving absence, and does not detect content clipped at 360 px. This is a **genuine coverage gap for a geometric AC**, environment-constrained: `design.md:87,99` defers E2E (Playwright) to the quality feature, and `docs/testes.md` places browser flows in Playwright. **Not verifiable in this feature without a real browser.** Unchanged from iteration 1.

**Recommendation (do NOT run here)**: add a Playwright viewport test at 360/768/1024/1440 asserting `document.documentElement.scrollWidth <= viewport.width` on `/login`, `/operador/fila` and `/operador/atividades/:id` (including the mobile menu open state). Track it in the deferred quality feature, not as a blocker for this slice.

---

## Discrimination Sensor

Scratch via **file backups** (`%TEMP%\opencode\sensor-frontend-fundacao`), mutate → `npx vitest run <test>` → restore from backup → verify porcelain/diff. `git stash` never used. 7 mutations injected (≥5 required for a P0/critical-path auth+data path).

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| M1 | `src/app/(app)/layout.tsx:21-22` | Restores fail-open: `if (!usuario \|\| roles.length===0) redirect` → `if (!usuario) redirect` + `usuario.roles[0] ?? 'OPERATOR'` | ✅ Killed (1 failed / 4; rendered `perfil="OPERATOR"`) |
| M2 | `src/app/login/page.tsx:34` | `error.status === 401` → `=== 500` (invalid-credentials branch bypassed) | ✅ Killed (1 failed / 6) |
| M3 | `src/shared/http/api-client.ts:34` | `if (redirectOnUnauthorized)` → `if (false)` (401 redirect disabled) | ✅ Killed (1 failed / 7) |
| M4 | `src/app/(app)/operador/fila/page.tsx:85` | `atividades.length === 0` → `< 0` (empty branch never taken) | ✅ Killed (1 failed / 6) |
| M5 | `src/app/(app)/operador/fila/page.tsx:51` | `.catch(() => setErro(true))` → `setErro(false)` (error branch never set) | ✅ Killed (2 failed / 6) |
| M6 | `src/shared/ui/ocorrencia-form.tsx:84` | `if (exigeMotivo && motivoId === '')` → `if (false && …)` (motivo guard removed) | ✅ Killed (1 failed / 6) |
| M7 | `src/app/(app)/operador/atividades/[id]/page.tsx:67` | `if (numero <= 0)` → `if (numero < 0)` (zero passes validation) | ✅ Killed (1 failed / 7) |

**Sensor depth**: expanded (7 mutations, ≥5 required) — covers the fail-open default, login invalid branch, 401 handling, empty/error branches, motivo guard, numeric-quantity guard.
**Result**: **7/7 killed — PASS ✅**
**Isolation verified**: after restore, `git status --porcelain` shows only `?? .specs/features/frontend-fundacao/validation.md` (the report file), `git diff` is empty, and SHA-256 of all five backed-up files matches the working tree; `atividades/[id]/page.tsx` (mutated via reverse-edit, not backed up) is byte-identical to HEAD. Matches the pre-sensor baseline (clean tree at `dafc1e3` + untracked report).

---

## Flagged Deviations

### D1 — Role resolution in `src/app/(app)/layout.tsx` (Resolved)
- Iteration 1 flagged `const perfil = usuario?.roles[0] ?? 'OPERATOR'` as a fail-open (Major).
- **Fixed in `dafc1e3` (T9)**: `layout.tsx:21` now redirects when the user is missing **or** has no roles; no default role remains. Covered by `layout.test.tsx:49-62` and sensor M1. ✅

### D2 — 401 hard redirect lint warning (Minor, open)
- `api-client.ts:24` `window.location.assign('/login')` triggers `@next/next/no-location-assign-relative-destination` (lint **warning**, not error; `lint` exits 0).
- Full-page navigation on session expiry is functionally acceptable (clears client state); `useRouter().push` is not available inside the module-level client. Non-blocking.

### D3 — React 19 lint fixes bundled into T7 (Minor / process, open)
- `907f1a7` (T7) also modified `fila/page.tsx` (T6) and `ocorrencia-form.tsx` (T8) to satisfy `react-hooks/set-state-in-effect` at the phase Build gate. Commit message documents this.
- Behavior preserved; sensor M4/M5/M6 confirm the refactored branches are still covered. Violates "one atomic commit per task / only touch files required for task" (`validate.md` §6). Process-only.

### D4 — T9 "Done when" checkboxes not marked (Minor / process, new)
- `tasks.md:302-304` lists T9's `Done when` items as `[ ]` (unchecked), though the implementation + tests + commit `dafc1e3` exist and pass. The `tlc-spec-driven` rule says mark the task complete in `tasks.md` before the commit. Bookkeeping-only; no functional impact. Non-blocking.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ (T9 = +1 line net, removes fallback) |
| Surgical changes | ⚠️ T7 touched T6/T8 files (D3) |
| No scope creep | ⚠️ D3 only; no unrelated features |
| Matches patterns | ✅ (server layout uses existing repository; components use `cn`) |
| Spec-anchored outcome check (asserted values match spec) | ✅ (payloads asserted by value) |
| Per-layer Coverage Expectation met (UI happy+edge+error; client branches) | ✅ (fila/execução cobrem carregando/vazio/erro; api-client cobre 401/erro/network; layout cobre sessão/perfil) |
| Every test maps to a spec AC / edge / Done-when — no unclaimed tests | ✅ (53 feature tests mapeados) |
| Documented guidelines followed | ✅ `docs/frontend.md`, `docs/testes.md`, `AGENTS.md`, `eslint.config.mjs` |

---

## Gate Check

- **Gate command**: `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`
- **Result**: **6 passed, 0 failed**
  - `prisma:generate` → exit 0 (Prisma Client 7.10.0)
  - `lint` → exit 0 (3 warnings: 2 pré-existentes em `postcss/prettier.config.mjs` + 1 em `api-client.ts:24`)
  - `typecheck` → exit 0
  - `typecheck:connector` → exit 0
  - `test:coverage` → exit 0 — **73 test files, 482 tests passed, 0 failed, 0 skipped**; cobertura 96.62% stmts / 93.84% branches / 98.41% funcs / 98.8% lines (acima dos limites 80/75/80/80)
  - `build` → exit 0 (Next.js 16.3.5; rotas `/login`, `/operador/fila`, `/operador/atividades/[id]` compiladas)
- **Test count before feature**: ~429 (derived: 482 total − 53 testes dos 8 arquivos de teste da feature)
- **Test count after feature**: 482
- **Delta**: +53 testes (T2=10, T3=7, T4=6, T5=7, T6=6, T7=7, T8=6, T9=4)
- **Skipped tests**: none
- **Failures**: none

---

## Requirement Traceability Update

Não editado neste relatório (escopo de escrita restrito a `validation.md`). Recomenda-se atualizar `spec.md` de `Done` → `✅ Verified` para FE-01..FE-14 após aceite; FE-03/FE-06 mantêm o flag de precisão/ambiente.

---

## Ranked Gaps

1. **FE-06 não verificável sem navegador** — geométrico (360–1440 px). Evidência atual = guarda estrutural (`overflow-x-hidden`). Fechar com teste Playwright de viewport (feature de qualidade). Não bloqueia.
2. **FE-03 "funcionar por teclado" sem teste direto** — rótulos/tipos/`aria-describedby` cobertos, mas nenhum teste de Tab/Enter ou ordem de foco. Spec-precision gap.
3. **D3 T7 alterou arquivos de T6/T8** — desvio de commit atômico; funcionalmente coberto. Minor.
4. **D4 T9 "Done when" não marcado em `tasks.md`** — bookkeeping. Minor.
5. **D2 aviso de lint em `window.location.assign`** — `lint` exit 0; minor.

---

## Summary

**Overall**: ✅ **PASS — Ready** (gaps ranqueados acima; nenhum bloqueia a fatia)

**Spec-anchored check**: 12/14 ACs batem com o resultado definido na spec; 1 spec-precision gap (FE-03 teclado); 1 browser-unverifiable (FE-06 geometria)
**Fail-open**: closed — `layout.tsx:21` redireciona sem usuário/sem perfis; `layout.test.tsx:49-55` asserta `redirect('/login')`; sensor M1 mata a regressão
**Sensor**: 7/7 mutações mortas (M1–M7), isolamento confirmado (porcelain/diff limpos, hashes conferidos)
**Gate**: 6 passed, 0 failed; 482 testes, 73 arquivos

**What works**: login válido/inválido + erro acessível, navegação por perfil e menu mobile, fila com carregando/vazio/erro/retry, execução com validação de quantidade e recarga de saldo, ocorrência com motivo obrigatório vindo da API, redirecionamento em 401, tratamento de falha de API com retry, e resolução de perfil no servidor sem fail-open.
