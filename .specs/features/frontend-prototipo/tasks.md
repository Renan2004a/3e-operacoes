# Frontend fiel ao protótipo — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/frontend-prototipo/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `docs/frontend.md`, `docs/testes.md`, `AGENTS.md`, `vitest.config.ts`, `playwright.config.ts`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain / use case (`src/modules/**`) | unit | Ramos + contrato aditivo | `src/modules/**/*.test.ts` | `npm test` |
| UI component / page (`src/shared/ui/**`, `src/app/**`) | unit (Testing Library + jsdom) | Render, estados, rótulos | `src/**/*.test.tsx` | `npm test` |
| E2E (responsividade) | e2e (Playwright) | Sem rolagem horizontal 360–1440 | `tests/e2e/**/*.spec.ts` | `npm run test:e2e` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Após tasks só com testes unitários | `npm test` |
| E2E | Após tasks com testes de navegador | `npm run test:e2e` |
| Build | No fim de fase | `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build` |

---

## Execution Plan

### Phase 1: Dados

```
T1
```

### Phase 2: Login e shell

```
T2
T3
```

### Phase 3: Telas

```
T4
T5
T6
```

### Phase 4: Qualidade

```
T7
```

---

## Task Breakdown

### Phase 1: Dados

#### T1: Enriquecer a consulta de pedidos

**What**: Incluir descrição, código e unidade por item e cliente/vendedor no pedido (aditivo).
**Where**: `src/modules/indicadores/consulta-pedidos.ts`
**Depends on**: None
**Reuses**: `IndicadoresRepository`.
**Requirement**: PROT-07

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `dominio-3e`

**Done when**:

- [x] Detalhe traz `description`, `productCode`, `unit` por item
- [x] Detalhe traz `customerName` e `sellerLegacyCode`
- [x] Contrato anterior preservado (campos adicionais)
- [x] Test count: 6 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(indicadores): enriquece o detalhe do pedido`

---

### Phase 2: Login e shell

#### T2: Login fiel ao protótipo

**What**: Replicar o layout do protótipo (hero + caixa), sem texto de demonstração.
**Where**: `src/app/login/page.tsx`
**Depends on**: None
**Reuses**: Componentes base.
**Requirement**: PROT-01, PROT-02, PROT-08

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `frontend-blueprint`, `accessibility`

**Done when**:

- [x] Hero em ≥ 780 px; só a caixa abaixo disso
- [x] Sem textos de demonstração
- [x] Test count: 6 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): login fiel ao prototipo`

---

#### T3: Shell fiel ao protótipo

**What**: Ajustar topbar + sidebar para a estrutura do protótipo.
**Where**: `src/shared/ui/app-shell.tsx`
**Depends on**: None
**Reuses**: `navegacao-perfil`.
**Requirement**: PROT-03, PROT-04

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `frontend-blueprint`, `accessibility`

**Done when**:

- [x] Topbar + sidebar como o protótipo; menu no celular
- [x] Sem rolagem horizontal 360–1440 px
- [x] Test count: 7 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): shell fiel ao prototipo`

---

### Phase 3: Telas

#### T4: Telas do operador fiéis

**What**: Fila e atividade no padrão do protótipo (cards, badges, progresso).
**Where**: `src/app/(app)/operador/`
**Depends on**: T1, T3
**Reuses**: Componentes e dados (T1).
**Requirement**: PROT-05, PROT-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `frontend-blueprint`, `accessibility`

**Done when**:

- [x] Fila/atividade no padrão; estados mantidos
- [x] Test count: 6 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): telas do operador fieis ao prototipo`

---

#### T5: Telas do gerente fiéis

**What**: Painel com métricas e pedidos em tabela com filtros; detalhe com especificações.
**Where**: `src/app/(app)/gerente/`
**Depends on**: T1, T3
**Reuses**: Componentes e dados (T1).
**Requirement**: PROT-05, PROT-06, PROT-07

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `frontend-blueprint`, `accessibility`

**Done when**:

- [x] Painel com métricas/alertas; pedidos em tabela com filtros
- [x] Detalhe mostra descrição, código, unidade e vendedor (código)
- [x] Test count: 6 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): telas do gerente fieis ao prototipo`

---

#### T6: Telas de vendedor, expedição e admin fiéis

**What**: Aplicar o padrão do protótipo nessas telas.
**Where**: `src/app/(app)/vendedor/`
**Depends on**: T1, T3
**Reuses**: Componentes e dados (T1).
**Requirement**: PROT-05, PROT-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `frontend-blueprint`, `accessibility`

**Done when**:

- [x] Telas no padrão; estados mantidos
- [x] Test count: 6 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): telas de vendedor, expedicao e admin fieis`

---

### Phase 4: Qualidade

#### T7: Sem demonstração, responsividade e a11y

**What**: Conferir ausência de textos de demonstração, responsividade e acessibilidade.
**Where**: `tests/e2e/`
**Depends on**: T4, T5, T6
**Reuses**: `playwright.config.ts`.
**Requirement**: PROT-08, PROT-09

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `playwright-skill`, `accessibility`

**Done when**:

- [x] Nenhum texto de demonstração
- [x] E2E sem rolagem horizontal 360–1440 px
- [x] Test count: 5 testes E2E passam (sem remoções silenciosas)
- [x] Gate check passa: `npm run test:e2e`

**Tests**: e2e
**Gate**: e2e

**Commit**: `test(frontend): confere prototipo, responsividade e a11y`

---

## Phase Execution Map

```
Phase 1: T1
Phase 2: T2
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
| T1: consulta | 1 arquivo | ✅ Granular |
| T2: login | 1 página | ✅ Granular |
| T3: shell | 1 componente | ✅ Granular |
| T4–T6: telas | 1 conjunto coeso | ✅ Granular |
| T7: E2E/a11y | 1 spec | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T4 | T1, T3 | (cross-phase) | ✅ Match |
| T5 | T1, T3 | (cross-phase) | ✅ Match |
| T6 | T1, T3 | (cross-phase) | ✅ Match |
| T7 | T4, T5, T6 | (cross-phase) | ✅ Match |

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Domain | unit | unit | ✅ OK |
| T2–T6 | UI component / page | unit | unit | ✅ OK |
| T7 | E2E | e2e | e2e | ✅ OK |

---

## Task Verification Standards

Every task follows `Done when` + `Tests` + `Gate`. Each `Done when` entry is specific, binary, and references the gate command. Test counts prevent silent deletions.
