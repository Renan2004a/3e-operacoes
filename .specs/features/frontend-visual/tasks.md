# Frontend — Refino Visual — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/frontend-visual/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `docs/frontend.md`, `docs/testes.md`, `AGENTS.md`, `vitest.config.ts`, `playwright.config.ts`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| UI component (`src/shared/ui/**`) | unit (Testing Library + jsdom) | Render, estados, rótulos acessíveis | `src/**/*.test.tsx` | `npm test` |
| Page (`src/app/**`) | unit (Testing Library + jsdom) | Estados e comportamento preservados | `src/**/*.test.tsx` | `npm test` |
| E2E (responsividade) | e2e (Playwright) | Sem rolagem horizontal 360–1440 | `tests/e2e/**/*.spec.ts` | `npm run test:e2e` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Após tasks só com testes unitários | `npm test` |
| Full | Após tasks com integração | `npm run lint && npm run typecheck && npm test` |
| E2E | Após tasks com testes de navegador | `npm run test:e2e` |
| Build | No fim de fase | `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build` |

---

## Execution Plan

### Phase 1: Design system and shell

```
T1 -> T2
```

### Phase 2: Login

```
T3
```

### Phase 3: Screens

```
T4
T5
T6
```

### Phase 4: Quality

```
T7
```

---

## Task Breakdown

### Phase 1: Design system and shell

#### T1: Componentes visuais reutilizáveis

**What**: Criar `Metric`, `Badge` e `PageHead` (Tailwind) com rótulos acessíveis.
**Where**: `src/shared/ui/`
**Depends on**: None
**Reuses**: `cn`, `Card`.
**Requirement**: VIS-07, VIS-08

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `frontend-blueprint`, `accessibility`

**Done when**:

- [x] `Metric`, `Badge` e `PageHead` exportados
- [x] Badge comunica estado por texto + cor
- [x] Test count: 6 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): adiciona componentes visuais`

---

#### T2: Shell com sidebar e topbar

**What**: Trocar o shell para topbar + sidebar (desktop) com menu acessível no celular.
**Where**: `src/shared/ui/app-shell.tsx`
**Depends on**: T1
**Reuses**: `navegacao-perfil`, `Button`.
**Requirement**: VIS-01, VIS-02, VIS-03

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `frontend-blueprint`, `accessibility`

**Done when**:

- [x] Sidebar visível em ≥ 768 px; menu no celular
- [x] Sem rolagem horizontal 360–1440 px
- [x] Testes existentes do shell continuam verdes
- [x] Test count: 7 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): shell com sidebar e topbar`

---

### Phase 2: Login

#### T3: Login com hero

**What**: Tela de login com painel lateral (hero) e caixa de acesso.
**Where**: `src/app/login/page.tsx`
**Depends on**: T1, T2
**Reuses**: Componentes base (T1).
**Requirement**: VIS-04, VIS-05, VIS-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `frontend-blueprint`, `accessibility`

**Done when**:

- [x] Hero em ≥ 780 px; só a caixa abaixo disso
- [x] Rótulos, foco e erro acessível preservados
- [x] Test count: 6 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): login com hero`

---

### Phase 3: Screens

#### T4: Telas do operador

**What**: Aplicar o padrão visual (PageHead, cards, badges) na fila e na atividade.
**Where**: `src/app/(app)/operador/`
**Depends on**: T1
**Reuses**: Componentes (T1).
**Requirement**: VIS-09, VIS-10, VIS-11

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `frontend-blueprint`, `accessibility`

**Done when**:

- [ ] Fila e atividade usam o padrão visual
- [ ] Estados de carregando/erro/vazio mantidos
- [ ] Comportamento (API) inalterado
- [ ] Test count: 6 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): refina telas do operador`

---

#### T5: Telas do gerente

**What**: Aplicar o padrão visual no painel, pedidos e detalhe.
**Where**: `src/app/(app)/gerente/`
**Depends on**: T1
**Reuses**: Componentes (T1).
**Requirement**: VIS-09, VIS-10, VIS-11

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `frontend-blueprint`, `accessibility`

**Done when**:

- [ ] Painel com métricas; pedidos em tabela
- [ ] Estados mantidos; comportamento inalterado
- [ ] Test count: 6 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): refina telas do gerente`

---

#### T6: Telas de vendedor, expedição e administração

**What**: Aplicar o padrão visual nessas telas.
**Where**: `src/app/(app)/vendedor/`
**Depends on**: T1
**Reuses**: Componentes (T1).
**Requirement**: VIS-09, VIS-10, VIS-11

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `frontend-blueprint`, `accessibility`

**Done when**:

- [ ] Telas de vendedor, expedição e admin com o padrão
- [ ] Estados mantidos; comportamento inalterado
- [ ] Test count: 6 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): refina telas de vendedor, expedicao e admin`

---

### Phase 4: Quality

#### T7: Responsividade e acessibilidade finais

**What**: E2E de responsividade do shell e ajustes de acessibilidade.
**Where**: `tests/e2e/`
**Depends on**: T4, T5, T6
**Reuses**: `playwright.config.ts`.
**Requirement**: VIS-03, VIS-08

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `playwright-skill`, `accessibility`

**Done when**:

- [ ] E2E: login e shell sem rolagem horizontal 360–1440 px
- [ ] Foco visível e rótulos conferidos
- [ ] Test count: 5 testes E2E passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm run test:e2e`

**Tests**: e2e
**Gate**: e2e

**Commit**: `test(frontend): cobre responsividade do refino visual`

---

## Phase Execution Map

```
Phase 1: T1 -> T2
Phase 2: T3
Phase 3: T4
Phase 3: T5
Phase 3: T6
Phase 4: T7
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: componentes | 1 módulo de UI | ✅ Granular |
| T2: shell | 1 componente | ✅ Granular |
| T3: login | 1 página | ✅ Granular |
| T4–T6: telas | 1 conjunto coeso | ✅ Granular |
| T7: E2E/a11y | 1 spec + ajustes | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T2 | T1 | T1 -> T2 | ✅ Match |
| T3 | T1, T2 | (cross-phase) | ✅ Match |
| T4–T6 | T1 | (cross-phase) | ✅ Match |
| T7 | T4, T5, T6 | (cross-phase) | ✅ Match |

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1, T2 | UI component | unit | unit | ✅ OK |
| T3–T6 | Page | unit | unit | ✅ OK |
| T7 | E2E | e2e | e2e | ✅ OK |

---

## Task Verification Standards

Every task follows `Done when` + `Tests` + `Gate`. Each `Done when` entry is specific, binary, and references the gate command. Test counts prevent silent deletions.
