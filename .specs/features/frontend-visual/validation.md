# Validation: frontend-visual - PASS

**Date**: 2026-10-07
**Spec**: `.specs/features/frontend-visual/spec.md`
**Diff range**: `f25a5dc..4f5fab2` (T1 `dc74255`, T2 `0565322`, T3 `b72a2b4`, T4 `cb2a0ef`, T5 `0274215`, T6 `345dd8d`, T7 `4f5fab2`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `Metric`, `Badge`, `PageHead` criados; 6 testes. |
| T2   | ✅ Done | Shell topbar + sidebar; 21 testes no arquivo. |
| T3   | ✅ Done | Login hero + caixa. |
| T4   | ✅ Done | Telas do operador (fila, atividade). |
| T5   | ✅ Done | Telas do gerente (painel, pedidos, detalhe). |
| T6   | ✅ Done | Vendedor, expedição, administração. |
| T7   | ✅ Done | E2E de responsividade + acessibilidade. |

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| VIS-01: tela em ≥768px mostra navegação lateral | Sidebar visível a partir de 768px (`md`) | `src/shared/ui/app-shell.test.tsx:151` - `expect(nav).toHaveClass('md:block')`; `src/shared/ui/app-shell.tsx:84` - `menuAberto ? 'block' : 'hidden md:block'` | ✅ PASS (classe codifica o breakpoint; ver caveat) |
| VIS-02: tela em <768px esconde lateral + botão de menu acessível | Sidebar oculta; botão com `aria-expanded`/`aria-controls`/`aria-label` abre a navegação | `src/shared/ui/app-shell.test.tsx:68` - `getByRole('button', { name: 'Abrir menu' })` + `toHaveAttribute('aria-expanded','false')` + `expect(nav).toHaveClass('hidden')`; clique → `:78` `getByRole('button',{name:'Fechar menu'})` + `aria-expanded=true`; `:83` `getByRole('navigation',{name:'Navegação principal'})` | ✅ PASS |
| VIS-03: sem rolagem horizontal entre 360 e 1440px | `scrollWidth <= innerWidth` | `src/shared/ui/app-shell.test.tsx:101` - `expect(container.firstElementChild).toHaveClass('overflow-x-hidden')`; `:167` - `expect(nav).toHaveClass('md:w-60')` + `expect(main).toHaveClass('min-w-0')`; `tests/e2e/responsividade.spec.ts:71` - `expect(scrollWidth).toBeLessThanOrEqual(innerWidth)` (360px); `tests/e2e/login.spec.ts:90` - mesmo assert em 360/768/1024/1440 | ⚠️ PASS — shell autenticado sem medição de `scrollWidth` (ver caveat) |
| VIS-04: login em ≥780px mostra hero + caixa | Hero visível e caixa de acesso presente | `src/app/login/page.test.tsx:154` - `getByText(/pedidos, produção e expedição/i)`; `:160` - `expect(hero).toHaveClass('min-[780px]:flex')`; `tests/e2e/responsividade.spec.ts:22` - `expect(hero).toBeVisible()` em 780px; `src/app/login/page.tsx:60` | ✅ PASS |
| VIS-05: login em <780px mostra apenas a caixa | Hero oculto abaixo de 780px | `src/app/login/page.test.tsx:164` - `expect(hero).toHaveClass('hidden')`; `tests/e2e/responsividade.spec.ts:19` - `toBeHidden()` em 768px; `:25` - `toBeHidden()` em 360px | ✅ PASS |
| VIS-06: formulário mantém rótulos, foco visível e erro acessível | `label` associado, `focus-visible:ring-2`, erro em `role=alert` | `src/app/login/page.test.tsx:65` - `getByLabelText('E-mail')`/`('Senha')`; `:178` - `getByRole('button',{name:'Entrar'}).toHaveClass('focus-visible:ring-2')`; `:117` - `findByRole('alert')` + `toHaveTextContent(/inválidos/i)`; `tests/e2e/responsividade.spec.ts:42` - `getByLabel('E-mail')`/`('Senha')` visíveis | ✅ PASS |
| VIS-07: `Metric`, `Badge`, `PageHead`, `Card` reutilizáveis | Componentes exportados e renderizáveis com rótulos acessíveis | `src/shared/ui/metric.tsx:25`, `src/shared/ui/page-head.tsx:14`, `src/shared/ui/badge.tsx:21`, `src/shared/ui/card.tsx:3`; `src/shared/ui/visual-components.test.tsx:13` - `Metric` rótulo/valor/helper; `:37` - `PageHead` `getByRole('heading',{level:1,name:'Pedidos'})`; `src/shared/ui/base-components.test.tsx:103` - `Card` título/conteúdo | ✅ PASS |
| VIS-08: badges comunicam estado por texto + cor | Texto do estado presente e classes de cor do tom | `src/shared/ui/visual-components.test.tsx:61` - `getByText('Concluída')` + `toHaveClass('text-success')` + `toHaveClass('bg-success-bg')`; `src/shared/ui/badge.tsx:5` - `success: 'bg-success-bg text-success'`; `src/shared/ui/pedidos-lista.test.tsx:45` - status textual `Pendente` | ✅ PASS |
| VIS-09: telas usam o padrão (cabeçalho, cards, tabelas) | Cada tela renderiza `PageHead` (h1) e/ou tabela | `src/app/(app)/gerente/painel/page.test.tsx:108` - `getByRole('heading',{level:1,name:'Painel'})`; `src/app/(app)/operador/fila/page.test.tsx:104` - h1 `Minha fila`; `src/app/(app)/admin/usuarios/page.test.tsx:151` - h1 `Usuários`; `src/app/(app)/expedicao/entregas/page.test.tsx:187` - h1 `Entregas`; `src/app/(app)/gerente/pedidos/[orderId]/page.test.tsx:144` - h1 `Pedido 100`; `src/app/(app)/operador/atividades/[id]/page.test.tsx:170` - h1 `Executar atividade`; `src/app/(app)/vendedor/pedidos/page.test.tsx:138` - h1 `Pedidos`; `src/shared/ui/pedidos-lista.test.tsx:42` - `getByRole('table',{name:'Pedidos'})` | ✅ PASS |
| VIS-10: estados de carregando, erro e vazio permanecem | `Spinner` (`role=status`), `Alert` (`role=alert`), `EmptyState` | `src/shared/ui/pedidos-lista.test.tsx:35` - loading; `:53` - `findByText('Sem pedidos')`; `:61` - `findByRole('alert')` + retry; `src/app/(app)/gerente/painel/page.test.tsx:53` - loading; `:90` - erro; `src/app/(app)/operador/fila/page.test.tsx:52` - loading; `:68` - `Sem atividades na fila`; `:76` - erro + `Tentar de novo` | ✅ PASS |
| VIS-11: comportamento (chamadas de API) inalterado | Mesmas URLs/verbos/payloads | `src/shared/ui/pedidos-lista.test.tsx:46` - `apiGet('/api/pedidos')`; `:81` - `'/api/pedidos?cliente=Ana&setor=setor-corte&status=PENDING&de=2026-01-01&ate=2026-01-31'`; `src/app/login/page.test.tsx:77` - `apiPost('/api/auth/login', {email,senha}, {redirectOnUnauthorized:false})`; `:92` - `apiGet('/api/auth/sessao', ...)`; `src/app/(app)/gerente/painel/page.test.tsx:65` - `apiGet('/api/indicadores')`; `src/app/(app)/operador/fila/page.test.tsx:61` - `apiGet('/api/producao/atividades')`. Diff grep: nenhuma linha de `apiGet/apiPost/apiPatch/fetch(` alterada em `src/**` (só adições em testes). | ✅ PASS |

**Status**: ✅ All 11 ACs covered by `file:line` evidence. 1 spec-precision caveat (VIS-03, authenticated shell — see below).

---

## Behavior Unchanged (CRITICAL)

The refresh is presentation-only. Diff review of `src/**/*.tsx` shows only markup/class swaps; no API call, prop contract, data flow or state transition changed.

| Changed test assertion | Before | After | Assessment |
| --- | --- | --- | --- |
| `src/shared/ui/pedidos-lista.test.tsx:42` | `findByRole('list', { name: 'Pedidos' })` | `findByRole('table', { name: 'Pedidos' })` | Presentation: `<ul>` → `<table>`. Behavioral assertions inside the container (`Pedido 100`, `Ana`, `Pendente`, `apiGet('/api/pedidos')`) unchanged. ✅ |
| `src/app/(app)/gerente/painel/page.test.tsx:64` | `getByRole('heading', { name: 'Pendências' }).closest('div.rounded-card')` | `getByText('Pendências').closest('div.rounded-card')` | Presentation: Metric label is a `<p>`, not a heading. `.closest('div.rounded-card')` + `toHaveTextContent('2')` preserved. ✅ |

- No behavior assertion weakened or removed. Test declarations: **+27 added, 0 removed** (diff `*.test.tsx`/`*.spec.ts`).
- All API contracts (`/api/pedidos`, `/api/indicadores`, `/api/auth/login`, `/api/auth/sessao`, `/api/producao/atividades`) assert the same URL/verb/payload as before.
- `PedidoDetalhe` (`src/shared/ui/pedido-detalhe.tsx:132`) swapped the inline `<h1>` for `PageHead` — same title text (`Pedido {numero}`) and description.

---

## Browser-Unverifiable

| Surface | Why not browser-verifiable | Evidence substitute | Adequacy |
| --- | --- | --- | --- |
| Authenticated shell (topbar + sidebar) at 360–1440px | `src/app/(app)/layout.tsx:17-21` requires a signed session cookie **and** a DB row (`prismaUsuariosRepository.findById`); Playwright has no DB. Navigating to `/operador/fila` redirects to `/login` (`tests/e2e/responsividade.spec.ts:64`). | Unit tests assert the responsive class contract (`md:block`, `hidden`, `md:w-60`, `min-w-0`, `overflow-x-hidden`) and the menu toggle behavior. | **Adequate for the class contract; not a measured-pixel guarantee.** The class-encoded breakpoints map 1:1 to the spec, but `scrollWidth <= innerWidth` for the authenticated shell is not empirically measured. VIS-03 is marked PASS with this caveat. |
| Mobile menu open/close in a real browser | Same session/DB gate. | `src/shared/ui/app-shell.test.tsx:68-81` exercises the toggle with `fireEvent` and asserts `aria-expanded` + visibility class. | Adequate for behavior; rendering/positioning under real media queries is unverified. |
| Screen states (loading/error/empty) in a real browser | Authenticated routes. | Unit tests cover each state per screen (VIS-10 evidence above). | Adequate. |
| Public login surface | — | Fully covered by E2E (`tests/e2e/responsividade.spec.ts`, `tests/e2e/login.spec.ts`) at 360/768/1024/1440px. | Adequate. |

**Conclusion**: The public surface is browser-verified; the authenticated shell is not. Unit tests assert the exact responsive class contract and toggle semantics, which is the strongest evidence available without a session+DB fixture. This is a known, documented limitation (E2E header comment `tests/e2e/responsividade.spec.ts:3-11`), not a silent gap.

---

## Discrimination Sensor

Isolated scratch: byte-exact file backups in `%TEMP%\opencode\sensor`; each mutation applied to the real file, targeted vitest run, then restored from backup. No `git stash`.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| M1 | `src/shared/ui/app-shell.tsx:84` | Sidebar breakpoint: `'hidden md:block'` → `'hidden'` | ✅ Killed (1 failed / 21) |
| M2 | `src/shared/ui/app-shell.tsx:71` | Mobile menu toggle: `setMenuAberto((a) => !a)` → `setMenuAberto(false)` | ✅ Killed (1 failed / 21) |
| M3 | `src/shared/ui/badge.tsx:7` | Badge tone: `success: 'bg-success-bg text-success'` → `'bg-danger-bg text-danger'` | ✅ Killed (1 failed / 6) |
| M4 | `src/app/login/page.tsx:60` | Login hero breakpoint: `min-[780px]:flex` → `min-[780px]:grid` | ✅ Killed (1 failed / 15) |
| M5 | `src/shared/ui/pedidos-lista.tsx:189` | Empty state: `!pedidos \|\| pedidos.length === 0` → `!pedidos` | ✅ Killed (5 failed / 12) |

**Sensor depth**: expanded (5 mutations; covers breakpoints, toggle, tone mapping, and screen state).
**Isolation check**: `git status --porcelain` baseline (before) = empty; after cleanup = empty. `git diff --quiet` → clean. ✅
**Result**: 5/5 killed — PASS ✅

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ Presentation-only; no new abstraction beyond the 3 requested primitives. |
| Surgical changes | ✅ Only the files required by the tasks. |
| No scope creep | ✅ No new features/routes/APIs. |
| Matches patterns | ✅ Reuses `cn`, `Card`, `FOCO_VISIVEL`, existing tokens. |
| Spec-anchored outcome check (asserted values match spec) | ✅ (VIS-03 caveat noted) |
| Per-layer Coverage Expectation met (UI unit + E2E responsiveness) | ✅ |
| Every test maps to a spec requirement - no unclaimed tests | ✅ |
| Documented guidelines followed: `docs/frontend.md`, `docs/testes.md` | ✅ |

---

## Edge Cases

- [x] Lista vazia → `EmptyState` — `src/shared/ui/pedidos-lista.tsx:190`; test `src/shared/ui/pedidos-lista.test.tsx:53`.
- [x] Falha de API → `Alert` com `Tentar de novo` — `src/shared/ui/pedidos-lista.tsx:182-188`; test `:61-65`.
- [x] Tabelas com rolagem horizontal interna em telas estreitas — `src/shared/ui/pedidos-lista.tsx:192` `overflow-x-auto`; test `src/shared/ui/pedidos-lista.test.tsx:148` - `expect(tabela.parentElement).toHaveClass('overflow-x-auto')`.

---

## Gate Check

- **Gate command**: `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`, plus `npm run test:e2e`.
- **Result**: 6/6 build-gate steps passed, E2E passed.
  - `prisma:generate` ✅
  - `lint` ✅ (0 errors, 3 pre-existing warnings: `postcss.config.mjs`, `prettier.config.mjs`, `src/shared/http/api-client.ts:24`)
  - `typecheck` ✅ (exit 0)
  - `typecheck:connector` ✅ (exit 0)
  - `test:coverage` ✅ 85 files, **598 passed**, 0 failed, 0 skipped; coverage 96.66% stmts / 93.9% branch / 98.43% funcs / 98.81% lines
  - `build` ✅ (Next.js 16.3.5, 24/24 static pages, compiled successfully)
  - `test:e2e` ✅ **24 passed** (12 tests × 2 projects: chromium-desktop, mobile-chromium), 0 failed
- **Test count delta**: +27 test declarations added, 0 removed (feature diff).
- **Skipped tests**: none.
- **Failures**: none.

---

## Fix Plans

None. All 11 ACs covered, all 5 mutants killed, all gates green.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| VIS-01 | Done | ✅ Verified |
| VIS-02 | Done | ✅ Verified |
| VIS-03 | Done | ✅ Verified (⚠️ authenticated-shell scroll not browser-measured) |
| VIS-04 | Done | ✅ Verified |
| VIS-05 | Done | ✅ Verified |
| VIS-06 | Done | ✅ Verified |
| VIS-07 | Done | ✅ Verified |
| VIS-08 | Done | ✅ Verified |
| VIS-09 | Done | ✅ Verified |
| VIS-10 | Done | ✅ Verified |
| VIS-11 | Done | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 11/11 ACs matched spec outcome; 1 spec-precision caveat (VIS-03 authenticated-shell scrollWidth not browser-measured).
**Behavior unchanged**: Yes — only two presentation assertions changed (list→table role, metric label heading→text); no behavior assertion weakened or removed; no API contract changed.
**Sensor**: 5/5 mutations killed; working tree matches clean baseline.
**Gate**: 598 unit + 24 E2E passed; lint/typecheck/typecheck:connector/build green.

**What works**: Sidebar+topbar shell with accessible mobile menu; login hero at 780px; reusable `Metric`/`Badge`/`PageHead`/`Card`; all screens use `PageHead` and the orders table; loading/error/empty states and API behavior preserved.

**Issues found**: none blocking. Caveat: authenticated-shell horizontal-scroll is verified by class contract, not measured pixels (session+DB unavailable to Playwright).

**Next steps**: None — feature is verified. Optionally add a session+DB E2E fixture in a future feature to close the VIS-03 browser-measurement caveat.
