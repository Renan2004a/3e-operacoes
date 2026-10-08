# frontend-prototipo Validation

**Date**: 2026-10-07
**Spec**: `.specs/features/frontend-prototipo/spec.md`
**Diff range**: `bac838f~1..d3588c5` (T1 `bac838f`, T2 `f086d58`, T3 `4bc79ea`, T4 `e65081e`, T5 `e07c09d`, T6 `bc91c41`, T7 `d3588c5`)
**Verifier**: independent sub-agent (author ≠ verifier)
**Verdict**: ✅ PASS (all 9 ACs match spec outcome; 1 minor spec-precision gap flagged, no AC failure)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `detalharPedido` enriched additively; existing fields/routes unchanged |
| T2   | ✅ Done | Login hero + box, 780 px breakpoint, no demo text |
| T3   | ✅ Done | Topbar + teal sidebar, mobile menu, `aria-current` active link |
| T4   | ✅ Done | Fila card (prioridade/setor), atividade progress |
| T5   | ✅ Done | Painel metrics + progress; pedidos table + filters; detail specs |
| T6   | ✅ Done | Vendedor/expedicao/admin in prototype pattern (tables, metrics, badges) |
| T7   | ✅ Done | E2E demo-text + responsiveness across 360–1440 |

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| PROT-01 WHEN login opens THEN replica prototype layout (hero + box), no demo text | Hero panel with product pitch + access box with brand/title | `src/app/login/page.test.tsx:157` - `expect(getByText(/pedidos, produção e expedição/i)).toBeInTheDocument()`; `:191` - `expect(getByRole('heading',{level:2,name:'Entrar'}))`; `:192` - `expect(getByText('Acesso ao sistema'))`; code `src/app/login/page.tsx:58-136` | ✅ PASS |
| PROT-02 WHEN < 780 px THEN only the box, keeping labels/focus/error | Hero hidden below 780 px; inputs labeled; error `role="alert"` | `src/app/login/page.test.tsx:164` - `expect(hero).toHaveClass('hidden')`; `:165` - `toHaveClass('min-[780px]:flex')`; `:65-66` labels/types; `:178` focus-visible; `:117-118` `findByRole('alert')` + `/inválidos/i`; browser: `tests/e2e/responsividade.spec.ts:19,22,25` (hidden 768/360, visible 780) | ✅ PASS |
| PROT-03 WHEN ≥ 768 px THEN topbar + sidebar (teal) like prototype | Sidebar visible ≥768 px, topbar with brand/profile | `src/shared/ui/app-shell.test.tsx:168` - `expect(nav).toHaveClass('md:block')`; `:169` - `toHaveClass('hidden')`; `:175-177` `banner` + `'3E Operações'` + profile label; `:183` - `toHaveClass('md:w-60')`; color `src/shared/ui/app-shell.tsx:85` `bg-brand-900` = `#102a33` = prototype `.sidebar` token (`design/inspiracoes/frontend-v4/assets/css/styles.css:34`) | ✅ PASS (see spec-precision note below) |
| PROT-04 WHEN < 768 px THEN accessible menu; no horizontal scroll | Menu button toggles nav; nav labeled; root clips x-overflow | `src/shared/ui/app-shell.test.tsx:77-80` - `getByRole('button',{name:'Abrir menu'})` + `aria-expanded='false'` + `toHaveClass('hidden')`; `:84-86` - `'Fechar menu'` + `aria-expanded='true'` + nav not hidden; `:92` - `getByRole('navigation',{name:'Navegação principal'})`; `:117` - `toHaveClass('overflow-x-hidden')` | ✅ PASS |
| PROT-05 WHEN panel loads THEN metrics, tables/alerts in prototype pattern | Metric cards, progress bars, badges on panel/queue/screens | `src/app/(app)/gerente/painel/page.test.tsx:114` - `findByText('Concluídas')`; `:117` - `getByRole('progressbar',{name:'Produção do setor setor-corte'})`; `src/app/(app)/operador/fila/page.test.tsx:113-114` prioridade/setor; `src/app/(app)/operador/atividades/[id]/page.test.tsx:177-178` `progressbar` + `value='20'`; `src/app/(app)/expedicao/entregas/page.test.tsx:195-198` `'Disponíveis'`/`'Pendentes'` | ✅ PASS |
| PROT-06 WHEN lists load THEN table with filters (toolbar) | `<table>` + filter form + submit | `src/app/(app)/gerente/pedidos/page.test.tsx:76` - `findByRole('table',{name:'Pedidos'})`; `:77` - `getByLabelText('Cliente')`; `:78` - `getByRole('button',{name:'Filtrar'})`; `src/app/(app)/vendedor/pedidos/page.test.tsx:146-148`; `src/app/(app)/admin/usuarios/page.test.tsx:87` - `findByRole('table',{name:'Usuários'})`; code `src/shared/ui/pedidos-lista.tsx:193,108-177` | ✅ PASS |
| PROT-07 Itens SHALL show descrição, código, unidade e vendedor (código) | Detail item: description, productCode, unit; order: seller code | `src/modules/indicadores/consulta-pedidos.test.ts:313-315` - `description`/`productCode`/`unit`; `:331-332` - `customerName`/`sellerLegacyCode`; `:347-349` null/empty fallback; `src/app/api/pedidos/[orderId]/route.test.ts:138-140,129-130`; UI `src/app/(app)/gerente/pedidos/[orderId]/page.test.tsx:155-158` - `'Chapa dobrada'`, `/PRD-77/`, `'Unidade: peca'`, `/V-77/` | ✅ PASS |
| PROT-08 System SHALL NOT display "Protótipo visual"/"dados demonstrativos" or equivalent | No demo text rendered anywhere | `src/app/login/page.test.tsx:184` - `queryByText(/demonstrativ/i)` not in document; `:185` - `queryByText(/protótipo visual/i)`; E2E `tests/e2e/prototipo.spec.ts:34-36` - `getByText(/demonstrativ/i)`/`/protótipo visual/i`/`/perfil para demonstra/i` count 0; repo grep (see below) 0 rendered matches | ✅ PASS |
| PROT-09 WHEN 360/768/1024/1440 px THEN usable without horizontal scroll | `scrollWidth <= innerWidth` at each width | `tests/e2e/prototipo.spec.ts:57` - `expect(scrollWidth).toBeLessThanOrEqual(innerWidth)` (4 widths, `:13-18`); `tests/e2e/login.spec.ts:90`; shell proxy `src/shared/ui/app-shell.test.tsx:117,183-184` | ✅ PASS (public surface browser-measured; authenticated shell proxy only) |

**Status**: ✅ All 9 ACs covered and matched to spec outcome / ⚠️ 1 spec-precision gap (PROT-03 badge/color tone not asserted; see Fix 1)

---

## PROT-08 — No demonstration text (independent grep)

Searched all non-test source under `src/` (case-insensitive) for `demonstr`, `protótipo visual`, `dados fict`, `fictíci`, `mock data`, `perfil-demo`, `lorem ipsum`:

```
=== demo-ish terms in non-test src (case-insensitive) ===
=== done ===
```

- Zero matches rendered to users. The only occurrence of the word "protótipo" is a JSDoc comment in `src/shared/ui/app-shell.tsx:29` (not rendered).
- Test/E2E files contain the terms only as negative assertions.
- Runtime negative assertion exists only on the public `/login` surface (E2E cannot reach authenticated pages without session+DB); authenticated screens are covered by the source grep above plus unit renders.

**Result**: none found → ✅

---

## PROT-07 — Additive contract & redundancy

- `src/app/api/pedidos/[orderId]/route.ts` is **unchanged** by the feature (`git diff` name-only is empty) and returns `{ pedido }`; `detalharPedido` spreads `...cabecalho` and `...item`, so all pre-existing fields (`id`, `numero`, `cliente`, `solicitado`, `executado`, `disponivel`, `entregue`, `pendente`) remain. New fields (`description`, `productCode`, `unit`, `customerName`, `sellerLegacyCode`) are additive. Existing regression tests (`consulta-pedidos.test.ts:268-296`, `route.test.ts:120-142`) still pass. ✅
- The repository port gained a required method `buscarEspecificacoesDosItens` (`consulta-pedidos.ts:87`). This is additive to the data contract but source-breaking for any out-of-repo implementer; only the Prisma adapter and test mocks implement it in this repo (grep confirmed). No external implementers.
- ⚠️ **Redundancy flag**: `CabecalhoPedido` carries both `cliente` and `customerName`, both assigned from the same `row.customerName` (`prisma-indicadores-repository.ts:56-58`; test mock `consulta-pedidos.test.ts:57`). `customerName` is never consumed by the UI (`pedido-detalhe.tsx` reads `pedido.cliente`). Duplicate field — minor cleanup, not a defect.

---

## Behavior Preserved

- Pages keep the same API calls/props/states: `apiPost('/api/auth/login')` + `apiGet('/api/auth/sessao')` (login); `apiGet('/api/indicadores')` (painel); `apiGet('/api/producao/atividades')` (fila); `apiGet('/api/producao/atividades/:id/ordem')` (atividade); `apiGet('/api/pedidos')` + `apiGet('/api/pedidos/:id')` + `apiPost('/api/pedidos/itens/:id/entregas')` (entregas); `apiGet`/`apiPatch` (pedido-detalhe). None altered.
- Test adjustments were presentation-only: `admin/usuarios/page.test.tsx` changed `findByRole('list')` → `findByRole('table')` while retaining every inner assertion, and added a new test. No assertions were weakened or removed.
- Diff audit: **16 added** `it`/`test` declarations, **0 removed**.
- Test count: unit **598 → 612 (+14)**; E2E **24 → 34 (+10, = 5 cases × 2 projects)**.

---

## Browser-Unverifiable Caveat

The authenticated shell and role screens require a session cookie + database, which are unavailable to Playwright without external dependencies. Consequently:

- PROT-03/PROT-04/PROT-09 for the **authenticated shell** are not browser-measured. They are proxied by unit tests asserting the responsive classes (`md:block`, `hidden`, `md:w-60`, `min-w-0`, `overflow-x-hidden`) and by `responsividade.spec.ts:57-72`, which confirms a real 360 px browser has no horizontal scroll on the login redirect.
- PROT-08 has a runtime negative assertion only on `/login`; authenticated screens rely on the source grep + jsdom renders.
- PROT-01/PROT-02/PROT-09 for **login** ARE browser-verified across 360/768/780/1024/1440 px.

**Assessment**: adequate. The public-surface E2E measures the actual responsive outcome where a browser is reachable; the authenticated-shell ACs are visual/structural and are fully exercised by unit tests (jsdom) plus the documented proxy. The alternative (seeding a DB and authenticating in E2E) is out of scope for a presentation-only feature and was explicitly accepted in `tests/e2e/prototipo.spec.ts:3-11`.

---

## Discrimination Sensor

Scratch method: per-mutation file backup via `[System.IO.File]::Copy` + guaranteed `try/finally` restore (no `git stash`, no worktree). Real-tree `git status --porcelain` was clean before and after (empty). Each mutation ran the full `npx vitest run` suite.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| M1 | `src/modules/indicadores/consulta-pedidos.ts:188` | Detail mapping fallback `description ?? null` → `?? 'Item'` | ✅ Killed (2 tests: `consulta-pedidos.test.ts:347`, `route.test.ts:138`) |
| M2 | `src/modules/indicadores/consulta-pedidos.ts:189` | `productCode: especificacao?.productCode ?? null` → `productCode: null` | ✅ Killed (1 test: `consulta-pedidos.test.ts:314`) |
| M3 | `src/shared/ui/app-shell.tsx:85` | Sidebar breakpoint `md:w-60` → `w-60` (drop responsive prefix) | ✅ Killed (1 test: `app-shell.test.tsx:183`) |
| M4 | `src/shared/ui/app-shell.tsx:73` | Mobile menu toggle `!aberto` → `false` (never opens) | ✅ Killed (1 test: `app-shell.test.tsx:74-87`) |
| M5 | `src/app/(app)/expedicao/entregas/page.tsx:310` | Badge tone `'success':'neutral'` → `'neutral':'success'` | ❌ Survived → Fix 1 (minor) |
| M6 | `src/app/(app)/operador/atividades/[id]/page.tsx:33` | Progress ratio `executado/solicitado` → `solicitado/executado` | ✅ Killed (1 test: `atividades/[id]/page.test.tsx:178`) |

**Sensor depth**: lightweight + (≥5 mutations, per task requirement)
**Result**: **5/6 killed** — ✅ PASS with one minor survivor (badge tone is not a spec-defined outcome; see Fix 1).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ (login/shell/screens presentation only; data change additive) |
| No scope creep | ✅ |
| Matches patterns | ✅ (reuses `Metric`, `Badge`, `Card`, `PedidosLista`, `PedidoDetalhe`) |
| Spec-anchored outcome check (asserted values match spec) | ✅ (except PROT-03 color tone → spec-precision gap) |
| Per-layer Coverage Expectation met (domain 1:1 ACs; pages render/states) | ✅ |
| Every test maps to a spec requirement — no unclaimed tests | ✅ (PROT-01..09, IND-04, VIS-*/FEP-* regressions) |
| Documented guidelines followed: `docs/frontend.md`, `docs/testes.md`, `AGENTS.md` | ✅ |
| No unnecessary abstractions | ✅ |
| Did not "improve" unrelated code | ✅ (spec.md/tasks.md checkbox updates are traceability, not code) |

---

## Edge Cases

- [x] Empty list → prototype empty state: `pedidos-lista.tsx:189-190` (`EmptyState "Sem pedidos"`), tested `gerente/pedidos/page.test.tsx:69`. ✅
- [x] API failure → standard alert: `pedidos-lista.tsx:181-188`, `painel/page.tsx:103-112`; tested in each screen's error test. ✅
- [x] Item without specification → null/empty fallback (`consulta-pedidos.test.ts:335-350`). ✅

---

## Gate Check

- **Gate command**: `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`, then `npm run test:e2e`
- **Result**: **all passed, 0 failed**
  - `prisma:generate` ✅
  - `lint` ✅ (0 errors; 3 pre-existing warnings in `postcss.config.mjs`, `prettier.config.mjs`, `src/shared/http/api-client.ts` — outside feature diff)
  - `typecheck` ✅
  - `typecheck:connector` ✅
  - `test:coverage` ✅ — **85 files, 612 tests passed**; coverage 96.69% stmts / 94.01% branch
  - `build` ✅ (Next.js 16.3.5, 24/24 static pages generated)
  - `test:e2e` ✅ — **34 passed** (chromium-desktop + mobile-chromium)
- **Test count before feature**: ~598 unit / ~24 E2E
- **Test count after feature**: 612 unit / 34 E2E
- **Delta**: +14 unit, +10 E2E
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans (if issues found)

### Fix 1 (Minor / optional): Assert page-level badge tone

- **Root cause**: The feature flips badge variants on screen state (e.g., `entregas/page.tsx:310` `'success'` when `disponivel > 0`), but tests assert only the badge **text** (`'Disponível'`/`'Sem saldo'`, `'Ativo'`), not its tone. The `Badge` component itself is tone-tested in `visual-components.test.tsx:59-63`, so the risk is cosmetic.
- **Fix task**: In `src/app/(app)/expedicao/entregas/page.test.tsx` (and/or `admin/usuarios/page.test.tsx`), assert the rendered badge carries the expected variant class (`bg-success-bg`/`bg-line/60`) for the active state.
- **Priority**: Cosmetic (spec does not define a precise badge-tone outcome; PROT-05/06 say "padrão do protótipo").
- **Blocking?** No — does not fail any AC.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| PROT-01 | Done (T2) | ✅ Verified |
| PROT-02 | Done (T2) | ✅ Verified |
| PROT-03 | Done (T3) | ✅ Verified |
| PROT-04 | Done (T3) | ✅ Verified |
| PROT-05 | Done (T4, T5, T6) | ✅ Verified |
| PROT-06 | Done (T4, T5, T6) | ✅ Verified |
| PROT-07 | Done (T1, T5) | ✅ Verified |
| PROT-08 | Done (T2, T7) | ✅ Verified |
| PROT-09 | Done (T7) | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready (1 minor, non-blocking spec-precision gap)

**Spec-anchored check**: 9/9 ACs matched spec outcome | 1 spec-precision gap flagged (PROT-03 badge/color tone)
**Sensor**: 5/6 mutations killed (1 survived — badge tone)
**Gate**: 6/6 build gates + E2E passed (612 unit, 34 E2E, 0 failed)

**What works**: Login hero/box at the exact 780 px prototype breakpoint; teal topbar+sidebar with accessible mobile menu and active-link marking; panel metrics/progress; table+filters on pedidos and usuários; enriched detail showing description/code/unit/seller additively; no demonstration text; no horizontal scroll on the public surface across 360–1440 px.

**Issues found**: Fix 1 (minor) — page-level badge tone not asserted; optional.

**Next steps**: Optionally apply Fix 1; otherwise feature is verified and ready. No code/test changes were made by this Verifier.
