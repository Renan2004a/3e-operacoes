# Lacunas Operacionais — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/lacunas-operacionais/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `docs/testes.md`, `docs/frontend.md`, `AGENTS.md`, `vitest.config.ts`, `playwright.config.ts`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain / use case (`src/modules/**`) | unit | Ramos + erros | `src/modules/**/*.test.ts` | `npm test` |
| Route handler (`src/app/api/**`) | integration | happy + edge + erro | `src/app/api/**/*.test.ts` | `npm test` |
| Page (`src/app/(app)/**`) | unit (Testing Library + jsdom) | estados + a11y | `src/**/*.test.tsx` | `npm test` |
| E2E | e2e (Playwright) | fluxos públicos | `tests/e2e/**/*.spec.ts` | `npm run test:e2e` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks só com unit | `npm test` |
| Full | Tasks com integração (rotas) | `npm run lint && npm run typecheck && npm test` |
| E2E | Tasks com navegador | `npm run test:e2e` |
| Build | Fim de fase | `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build` |

---

## Execution Plan

### Phase 1: Backend

```
T1
T2
T3
```

### Phase 2: Telas

```
T4
T5
T6
T7
```

### Phase 3: Qualidade

```
T8
```

---

## Task Breakdown

### Phase 1: Backend

#### T1: Retry com backoff no despacho

**What**: Repetir o despacho em falha transitória antes de marcar `FAILED`.
**Where**: `src/app/api/integracao/despacho.ts`
**Depends on**: None
**Reuses**: `ConectorLegadoError`.
**Requirement**: LAC-11, LAC-12, LAC-13

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `integracao-top-gerente`

**Done when**:

- [x] Erros transitórios são repetidos até o limite (env `CONNECTOR_MAX_ATTEMPTS`)
- [x] Erro definitivo (`ORDER_NOT_FOUND`) não repete
- [x] Tentativas registradas em evento
- [x] Test count: 11 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(integracao): adiciona retry com backoff no despacho`

---

#### T2: Rota de lista de jobs de integração

**What**: `GET /api/integracao/jobs` para o responsável técnico.
**Where**: `src/app/api/integracao/jobs/route.ts`
**Depends on**: None
**Reuses**: `prismaIntegracaoRepository`.
**Requirement**: LAC-09

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `integracao-top-gerente`, `seguranca-3e`

**Done when**:

- [x] Lista jobs com status/erros; sem sessão `401`; sem perfil `403`
- [x] Test count: 5 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): lista jobs de integracao`

---

#### T3: Leitura de setores para classificação

**What**: `GET /api/setores` passa a exigir `consultar_pedidos` (leitura), mantendo POST/PATCH restritos.
**Where**: `src/app/api/setores/route.ts`
**Depends on**: None
**Reuses**: `autorizar`.
**Requirement**: LAC-04

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `seguranca-3e`

**Done when**:

- [x] `GET` liberado para `consultar_pedidos`; `POST` segue `gerenciar_setores`
- [x] Test count: 9 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): permite leitura de setores para classificar`

---

### Phase 2: Telas

#### T4: Tela de importar pedido

**What**: Página com número do pedido e status do job.
**Where**: `src/app/(app)/integracao/page.tsx`
**Depends on**: None
**Reuses**: Cliente de API, componentes.
**Requirement**: LAC-01, LAC-02, LAC-03

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `frontend-blueprint`, `accessibility`

**Done when**:

- [ ] Número válido importa e mostra o status; inválido mostra erro
- [ ] Test count: 6 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): tela de importar pedido`

---

#### T5: Classificar item no detalhe do pedido

**What**: No detalhe, classificar item pendente escolhendo o setor.
**Where**: `src/app/(app)/gerente/pedidos/[orderId]/page.tsx`
**Depends on**: T3
**Reuses**: `GET /api/setores`, `POST .../classificar`.
**Requirement**: LAC-04, LAC-05, LAC-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `frontend-blueprint`, `accessibility`

**Done when**:

- [ ] Item pendente pode ser classificado; já classificado é indicado
- [ ] Lista reflete a classificação
- [ ] Test count: 6 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): classifica item no detalhe do pedido`

---

#### T6: Ordem de produção com impressão

**What**: Página da ordem com dados e botão de imprimir.
**Where**: `src/app/(app)/producao/atividades/[id]/ordem/page.tsx`
**Depends on**: None
**Reuses**: `GET .../ordem`, CSS de impressão.
**Requirement**: LAC-07, LAC-08

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `frontend-blueprint`, `accessibility`

**Done when**:

- [ ] Mostra pedido, item, setor, solicitado, executado e pendente
- [ ] Imprime sem menu (media print)
- [ ] Test count: 5 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): ordem de producao com impressao`

---

#### T7: Tela do Responsável Técnico

**What**: Lista jobs de integração com status/erros e eventos.
**Where**: `src/app/(app)/tecnico/integracao/page.tsx`
**Depends on**: T2
**Reuses**: `GET /api/integracao/jobs`.
**Requirement**: LAC-09, LAC-10

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `integracao-top-gerente`, `frontend-blueprint`

**Done when**:

- [ ] Lista jobs e mostra eventos do selecionado
- [ ] Estado vazio quando não há jobs
- [ ] Test count: 6 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): tela do responsavel tecnico`

---

### Phase 3: Qualidade

#### T8: E2E e navegação das novas telas

**What**: Cobrir as novas telas com E2E (superfície pública) e ajustar a navegação.
**Where**: `tests/e2e/`
**Depends on**: T4, T5, T6, T7
**Reuses**: `playwright.config.ts`.
**Requirement**: LAC-01, LAC-07, LAC-09

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `playwright-skill`, `accessibility`

**Done when**:

- [ ] Navegação inclui as novas telas nos perfis certos
- [ ] E2E verde
- [ ] Test count: 5 testes E2E passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm run test:e2e`

**Tests**: e2e
**Gate**: e2e

**Commit**: `test(frontend): cobre as novas telas`

---

## Phase Execution Map

```
Phase 1: T1
Phase 1: T2
Phase 1: T3
Phase 2: T4
Phase 2: T5
Phase 2: T6
Phase 2: T7
Phase 3: T8
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: retry | 1 arquivo | ✅ Granular |
| T2: rota jobs | 1 rota | ✅ Granular |
| T3: setores | 1 rota | ✅ Granular |
| T4–T7: telas | 1 página cada | ✅ Granular |
| T8: E2E | 1 spec | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T5 | T3 | (cross-phase) | ✅ Match |
| T7 | T2 | (cross-phase) | ✅ Match |
| T8 | T4, T5, T6, T7 | (cross-phase) | ✅ Match |

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Domain | unit | unit | ✅ OK |
| T2, T3 | Route handler | integration | integration | ✅ OK |
| T4–T7 | Page | unit | unit | ✅ OK |
| T8 | E2E | e2e | e2e | ✅ OK |

---

## Task Verification Standards

Every task follows `Done when` + `Tests` + `Gate`. Each `Done when` entry is specific, binary, and references the gate command. Test counts prevent silent deletions.
