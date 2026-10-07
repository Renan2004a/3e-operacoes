# frontend-perfis Validation

**Date**: 2026-10-07
**Spec**: `.specs/features/frontend-perfis/spec.md`
**Diff range**: `6605d7c..b345f54` (10 feature commits: T1 `24ecf73`, T2 `a0add4b`, T3 `6ee0ace`, T4 `b8b4b5c`, T5 `334c66b`, T6 `cc90ab0` + fix `4cc999f`, T7 `4cdfdf3`, T8 `c381eba`, T9 `f04b509`, T10 `b345f54`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1   | ✅ Done | Painel gerente + 6 tests |
| T2   | ✅ Done | `pedidos-lista` compartilhada + 6 tests |
| T3   | ✅ Done | Página pedidos gerente + 5 tests |
| T4   | ✅ Done | `pedido-detalhe` + página detalhe + 6 tests |
| T5   | ✅ Done | Vendedor + 5 tests |
| T6   | ✅ Done | Expedição/entregas + 7 tests (+ fix `4cc999f` setState síncrono) |
| T7   | ✅ Done | Admin usuários + 6 tests |
| T8   | ✅ Done | Admin setores/mapeamentos + 6 tests |
| T9   | ✅ Done | Navegação por perfil no shell + 15 tests |
| T10  | ✅ Done | Pós-login por perfil + sessão expõe `roles` + 11 tests |

All 10 tasks marked done in `tasks.md`; every commit present in history; tree clean at `b345f54`.

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| FEP-01 — painel mostra contagem por setor/status e pendências | Counts per sector/status + pendências value | `src/app/(app)/gerente/painel/page.test.tsx:56` – `findByText('setor-corte: 3')`, `getByText('setor-telhas: 1')`, `getByText('Pendente')`, `getByText('Total: 2')`, heading `Pendências` closest `div.rounded-card` `toHaveTextContent('2')`, `apiGet` called with `/api/indicadores` | ✅ PASS |
| FEP-02 — indicadores mostram produção por setor e cumprimento de prazo | Produção value + % no prazo | `src/app/(app)/gerente/painel/page.test.tsx:70` – `findByText('setor-corte: 12.5')`, `getByText('75%')`, `getByText('3 de 4 no prazo.')` | ✅ PASS |
| FEP-03 — consulta lista pedidos com filtros cliente/setor/status/período | URL with all five query params | `src/shared/ui/pedidos-lista.test.tsx:68` – `toHaveBeenLastCalledWith('/api/pedidos?cliente=Ana&setor=setor-corte&status=PENDING&de=2026-01-01&ate=2026-01-31')`; list/empty/loading at `:38/:49/:31`; page wiring `gerente/pedidos/page.test.tsx:40` → `/gerente/pedidos/p1`, `vendedor/pedidos/page.test.tsx:71` | ✅ PASS |
| FEP-04 — pedido aberto mostra solicitado/executado/disponível/entregue/pendente | Five per-item values rendered | `src/app/(app)/gerente/pedidos/[orderId]/page.test.tsx:80` – `Solicitado: 10`, `Executado: 8`, `Disponível: 5`, `Entregue: 3`, `Pendente: 2`; also `vendedor/pedidos/page.test.tsx:79` (five values) | ✅ PASS |
| FEP-05 — gerente/vendedor define prazo, salva e reflete status | PATCH payload + reflected status | `[orderId]/page.test.tsx:101` – `apiPatch('/api/pedidos/itens/item_1/prazo', { prazo: '2026-02-01' })`; `:118` – `findByText('Prazo definido: 2026-02-01')`; `vendedor/pedidos/page.test.tsx:92` | ✅ PASS |
| FEP-06 — entrega dentro do disponível registra e atualiza saldo | POST payload + saldo refreshed | `src/app/(app)/expedicao/entregas/page.test.tsx:95` – `apiPost('/api/pedidos/itens/item_1/entregas', { quantidade: '3', excecao: false, motivoExcecao: undefined })` then `findByText('Disponível: 2')` | ✅ PASS |
| FEP-07 — entrega acima do disponível exige gerente + motivo | Blocked without auth; blocked without reason; sent with reason | `entregas/page.test.tsx:115` – alert `/autorização de gerente com motivo/i` and `apiPost` not called; `:131` – `/informe o motivo/i`; `:146` – POST `{ quantidade: '9', excecao: true, motivoExcecao: 'Cliente pediu urgente' }` | ✅ PASS |
| FEP-08 — responsável cria usuário com perfis e setores | POST payload with `roles` + `sectorIds`; list shows them | `src/app/(app)/admin/usuarios/page.test.tsx:84` – `apiPost('/api/usuarios', { name, email, senha, roles: ['SELLER'], sectorIds: ['s1'] })`; `:73` list shows `Vendedor` + `Setores: Corte e Dobra` | ✅ PASS |
| FEP-09 — responsável mantém setores e mapeamentos (salvar + listar) | List + create + update payloads | `src/app/(app)/admin/setores/page.test.tsx:62` list, `:71` create `{ code, name }`, `:88` create mapping `{ legacyCategory, sectorId }`, `:108` update mapping `{ id, sectorId }` | ✅ PASS |
| FEP-10 — shell mostra navegação correspondente ao perfil | Per-profile link set (exact) | `src/shared/ui/app-shell.test.tsx:106` – `it.each(PERFIS)` asserts link count and hrefs for all 6 profiles; `:128` gerente excludes Fila/Entregas/Usuários; `:55` SELLER has no Fila | ✅ PASS |
| FEP-11 — pós-login navega para tela inicial do perfil | `router.push` to profile's first route | `src/app/login/page.test.tsx:98` – `it.each(DESTINOS)` → `/gerente/painel`, `/vendedor/pedidos`, `/expedicao/entregas`, `/admin/usuarios`; `:84` resolves via `apiGet('/api/auth/sessao', { redirectOnUnauthorized: false })` | ✅ PASS |
| FEP-12 — IF API responde 401 THEN redireciona ao login | 401 → `location.assign('/login')` | `src/shared/http/api-client.test.ts:37` – `apiGet` rejects `{ status: 401, code: 'unauthorized' }` and `assign` called with `/login`. Inherited client behavior (feature 9); feature pages use the default (`redirectOnUnauthorized` unset) and the login page explicitly opts out (`login/page.test.tsx:149`). | ✅ PASS (inherited, see note) |
| FEP-13 — IF API falha THEN erro acessível + tentar de novo | `role="alert"` + retry button refetches | `painel/page.test.tsx:87` & `:96`; `pedidos-lista.test.tsx:56`; `gerente/pedidos/page.test.tsx:56`; `[orderId]/page.test.tsx:92` (404 → `/pedido não encontrado/i` at `:131`); `vendedor/pedidos/page.test.tsx:122`; `entregas/page.test.tsx:169`; `usuarios/page.test.tsx:130`; `setores/page.test.tsx:132` | ✅ PASS |

**Status**: ✅ All 13 ACs matched spec outcome — 0 hard gaps.

### Notes / spec-precision observations (non-blocking)

1. **FEP-12 is not independently re-asserted inside the feature pages.** The page tests mock `apiGet`/`apiPost`, so the 401→redirect path is verified only in the inherited shared client (`api-client.test.ts:37`). This is correct layering (redirect is a client-layer concern) and the pages do rely on the default, but there is no page-level test proving a page's 401 surfaces the redirect. Acceptable; flagged for awareness.
2. **FEP-07 UI "autorização de gerente" is a self-attestation checkbox.** The screen requires the exception flag + reason, but the *manager identity* is enforced server-side (`src/modules/expedicao/registrar-entrega.ts:164` → `PapelSemPermissaoError` → 403; `entregas/route.ts:66-68`). The page maps 403 to `Apenas o gerente pode autorizar...` (`page.tsx:96-97`) but no test exercises the 403 branch. Behavior is safe; only the client 403 branch is untested.

---

## Flagged Items Investigated

### T10 — `GET /api/auth/sessao` now returns `roles` (`src/app/api/auth/sessao/route.ts:17-23`)

**Verdict: SAFE.** 
- Session-guarded: `obterUsuario(request)` (`route.ts:12`) validates the signed httpOnly cookie; without a valid session it returns `401` **before** any repository read (`route.ts:13-15`). Verified by `route.test.ts:53-58` (401 without session) and `:60-64` (`findById` not called on adulterated token) and `:66-71` (401 adulterated).
- No data leak: the only new field is the *caller's own* `roles`, resolved by `findById(usuario.userId)` from the session user id. No cross-user access; the cookie is httpOnly/SameSite=Lax (`auth-context.ts:41-43`). Payload asserted at `route.test.ts:41-51`.
- Consistent with the existing `(app)/layout.tsx:20-22` which already reads the same repository the same way. No new privilege surface.

### Gerente navigation change: `/operador/fila` → `/gerente/painel` + `/gerente/pedidos`

**Verdict: NOT a spec/AC gap — but a latent product observation.**
- The spec (FEP-10) only requires "a navegação correspondente ao perfil"; `design.md:14-18,44-46` explicitly assigns the gerente `/gerente/painel` + `/gerente/pedidos`. The nav map in `navegacao-perfil.ts:15-18` matches design exactly and is asserted by `app-shell.test.tsx:30-35,106`.
- However, the permission matrix grants `PRODUCTION_MANAGER` the `registrar_execucao` action (`src/modules/usuarios/permissoes.ts:29`), and the fila API accepts them (`api/producao/atividades/route.ts:10`). So a gerente is *authorized* to execute production but now has **no navigation entry** to `/operador/fila`. Feature 9's shell had exposed it (`app-shell.tsx` before this diff). This is a behavior regression relative to feature 9, but feature 9's gerente→fila link was a placeholder; the new mapping is design-sanctioned. Recommend a product decision (add a gerente entry to the fila, or confirm the gerente is not expected to execute). **Severity: Minor / product decision — not an FEP-10 failure.**

### T4 — `src/shared/ui/pedido-detalhe.tsx` component outside the page

**Verdict: JUSTIFIED.** 
- Reused by two callers: `gerente/pedidos/[orderId]/page.tsx:10` and `vendedor/pedidos/page.tsx:26`. This avoids duplicating the five-value + prazo UI between gerente and vendedor, matching `design.md:37,82` ("Lista compartilhada ... evita duplicação") and the spec Assumption "Reuso". Not a single-use abstraction; `basePath` prop is the only parameterization and is used by both. No scope creep.

---

## Discrimination Sensor

**Method**: isolated file-copy scratch (backup → mutate real file → run targeted vitest → restore from backup), never `git stash`. Baseline `git status --porcelain` = empty; after all mutations `git status --porcelain` and `git diff --stat` = empty (isolation confirmed).

| # | Mutation | File:line | Description | Killed? |
| - | -------- | --------- | ----------- | ------- |
| 1 | role-nav filter | `src/shared/ui/app-shell.tsx:23` | `NAV_POR_PERFIL[perfil]` → `NAV_POR_PERFIL.OPERATOR` (ignore profile) | ✅ Killed (exit 1) |
| 2 | post-login redirect map | `src/shared/ui/navegacao-perfil.ts:33` | `rotaInicialDoPerfil` → always `'/'` | ✅ Killed (exit 1) |
| 3 | delivery over-available guard | `src/app/(app)/expedicao/entregas/page.tsx:72` | `valor > disponivel && !excecao` → `... && excecao` (invert guard) | ✅ Killed (exit 1) |
| 4 | order filter predicate | `src/shared/ui/pedidos-lista.tsx:56` | disable `status` param (`if (false && filtros.status)`) | ✅ Killed (exit 1) |
| 5 | panel pendências definition | `src/modules/indicadores/painel.ts:53` | `status !== 'COMPLETED'` → `status === 'COMPLETED'` | ✅ Killed (exit 1) |
| 6 | sessão roles payload (T10) | `src/app/api/auth/sessao/route.ts:18` | `registro?.roles ?? []` → `[]` | ✅ Killed (exit 1) |

**Sensor depth**: expanded (6 mutations, ≥5 required) — covers all AC-critical branches named in the brief.
**Result**: 6/6 killed — PASS ✅. No surviving mutants.

---

## Browser-Unverifiable (jsdom cannot measure geometry)

Reported as not browser-verifiable; no automated evidence claims them:
- Responsive breakpoints: `hidden md:flex` mobile menu, `md:flex-row`/`md:w-56` sidebar, `sm:grid-cols-*`/`lg:grid-cols-5` form grids — classes are asserted in tests but CSS media-query behavior is not computed by jsdom.
- `overflow-x-hidden` on the shell root (`app-shell.test.tsx:88-92` asserts the class) — actual absence of horizontal scroll is not measured.
- Touch-target sizing (`min-h-11`, `min-w-11`) and WCAG 2.5.8 target size — not measured.
- Focus visibility/order and keyboard traversal of the mobile menu — not asserted.
- Color contrast of Badge variants / status colors — not measured; mitigated by textual status labels (`ROTULO_STATUS`, asserted in tests).
- Sticky header behavior (`sticky top-0 z-20`) — not measured.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ (feature files only; `sessao/route.ts` + `login/page.tsx` changed as required) |
| No scope creep | ✅ |
| Matches patterns | ✅ (mirrors feature-9 page/component/error patterns) |
| Spec-anchored outcome check (asserted values match spec) | ✅ |
| Per-layer Coverage Expectation met (UI pages: happy + loading/error/empty; routes happy+edge+error) | ✅ |
| Every test maps to a spec AC / listed edge case / Done-when (no unclaimed tests) | ✅ (FE-* tests are inherited feature-9 regression, retained) |
| Documented guidelines followed: `docs/testes.md`, `docs/frontend.md`, `AGENTS.md`, `vitest.config.ts` | ✅ |
| No `SPEC_DEVIATION` / `TODO` / `FIXME` markers introduced by this feature | ✅ |

---

## Edge Cases

- [x] API `401` → redirect to login — handled by shared client (`api-client.ts:33-35`), asserted `api-client.test.ts:37`; login opts out (`login/page.tsx:33,38`). Inherited; not re-tested per page.
- [x] API failure → accessible error + retry — all 8 page/component test suites assert `role="alert"` and a working "Tentar de novo".
- [x] `404` on order detail → "Pedido não encontrado" (`[orderId]/page.test.tsx:131`).
- [x] `409` email conflict (`usuarios/page.test.tsx:106`) and `403` no-permission (`:118`); `409` sector exists (`setores`); `409` mapping conflict (`page.tsx:142-143`).

---

## Gate Check

- **Gate command**: `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`
- **Result**: **6 passed, 0 failed** (all exit 0)

| Step | Exit | Detail |
| ---- | ---- | ------ |
| `prisma:generate` | 0 | Client generated to `src/generated/prisma` |
| `lint` | 0 | 0 errors, 3 pre-existing warnings (postcss/prettier config, `api-client.ts` location.assign) |
| `typecheck` | 0 | `tsc --noEmit` clean |
| `typecheck:connector` | 0 | connector-local clean |
| `test:coverage` | 0 | **81 files, 543 tests passed, 0 failed, 0 skipped**; 96.62% stmts / 93.84% branch / 98.41% funcs / 98.8% lines (thresholds 80/75/80/80) |
| `build` | 0 | 24 routes compiled; all new routes present (`/gerente/painel`, `/gerente/pedidos`, `/gerente/pedidos/[orderId]`, `/vendedor/pedidos`, `/expedicao/entregas`, `/admin/usuarios`, `/admin/setores`) |

- **Test count before feature** (`6605d7c`, per `frontend-fundacao/validation.md:163`): 482
- **Test count after feature**: 543
- **Delta**: **+61 tests** (net additions only; `git diff --numstat` shows no test file deletions, only 2/1 replaced lines in `sessao/route.test.ts` and `login/page.test.tsx`)
- **Skipped tests**: none
- **Failures**: none

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| FEP-01..FEP-13 | Verified (spec table) | ✅ Verified |

All 13 requirements independently confirmed against tests. (Spec already listed them as "Verified"; no status change required.)

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 13/13 ACs matched spec outcome | 0 hard gaps | 2 spec-precision observations (FEP-12 inherited coverage; FEP-07 client 403 branch untested)
**Sensor**: 6/6 mutations killed
**Gate**: 6/6 steps passed; 543 tests, 0 failed

**What works**: Panel counts/pendências/indicators (FEP-01/02); shared order list with all filters (FEP-03); five per-item values for gerente and vendedor (FEP-04); prazo save + reflection (FEP-05); delivery within available updating balance (FEP-06); over-available guard requiring manager + reason with server-side role enforcement (FEP-07); user creation with roles/sectors (FEP-08); sectors + mappings CRUD (FEP-09); per-profile nav (FEP-10); role-based post-login redirect via the session endpoint (FEP-11); 401 redirect + accessible error/retry (FEP-12/13). T10's `roles` extension is session-guarded and leak-free; T4's `pedido-detalhe` is justified by dual reuse.

**Issues found**: none blocking. Two observations for the product/author: (1) gerente lost the `/operador/fila` nav entry despite retaining `registrar_execucao` authorization — decide whether the gerente should execute production; (2) the FEP-07 client 403 branch and FEP-12 per-page 401 are not independently tested (server/client layers cover them).

**Next steps**: Feature is done. Optional follow-ups above are product decisions, not validation failures. No code/tests were modified by this verification.
