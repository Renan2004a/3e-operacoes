# Indicadores e Consulta — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/indicadores-e-consulta/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `docs/testes.md`, `AGENTS.md`, `vitest.config.ts`, `.github/workflows/ci.yml`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain / use case (`src/modules/**`) | unit | Todos os ramos; 1:1 com os ACs; todos os edge cases | `src/modules/**/*.test.ts` | `npm test` |
| Route handler (`src/app/api/**`) | integration | Cada rota: happy + edge + erro | `src/app/api/**/*.test.ts` | `npm test` |
| Repository adapter (Prisma) | none | Build gate only; domínio com fakes (AD-002) | - | build gate only |
| Entity / schema / config | none | Build gate only | - | build gate only |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Após tasks só com testes unitários | `npm test` |
| Full | Após tasks com testes de integração (rotas) | `npm run lint && npm run typecheck && npm test` |
| Build | Após tasks de repositório e no fim de fase | `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build` |

---

## Execution Plan

### Phase 1: Domain

```
T1
T2 -> T3
```

### Phase 2: Adapter

```
T4
```

### Phase 3: Routes

```
T5
T6
T7
```

---

## Task Breakdown

### Phase 1: Domain

#### T1: Consulta de pedidos

**What**: Listar pedidos com filtros e detalhar um pedido com saldo.
**Where**: `src/modules/indicadores/consulta-pedidos.ts`
**Depends on**: None
**Reuses**: `saldo-pedido` da expedição.
**Requirement**: IND-01, IND-02, IND-03, IND-04, IND-10

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `dominio-3e`

**Done when**:

- [x] Lista com filtros de cliente, setor, status e período
- [x] Detalhe traz os cinco valores por item
- [x] Pedido inexistente rejeitado
- [x] Test count: 8 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(indicadores): consulta pedidos com filtros`

---

#### T2: Painel consolidado

**What**: Contagem de atividades por setor/status e pendências.
**Where**: `src/modules/indicadores/painel.ts`
**Depends on**: None
**Reuses**: Porta `IndicadoresRepository`.
**Requirement**: IND-05, IND-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `dominio-3e`

**Done when**:

- [x] Contagem por setor e por status
- [x] Pendências = atividades não concluídas
- [x] Test count: 5 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(indicadores): monta painel por setor`

---

#### T3: Indicadores de PCP

**What**: Produção por setor e cumprimento de prazo.
**Where**: `src/modules/indicadores/pcp.ts`
**Depends on**: T2
**Reuses**: Agregação do painel (T2).
**Requirement**: IND-07, IND-08, IND-09

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `dominio-3e`

**Done when**:

- [x] Produção por setor (soma de execuções)
- [x] Cumprimento de prazo só sobre atividades com prazo
- [x] Test count: 6 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(indicadores): calcula indicadores de pcp`

---

### Phase 2: Adapter

#### T4: Repositório Prisma de indicadores

**What**: Implementar `IndicadoresRepository` (pedidos, atividades, execuções).
**Where**: `src/modules/indicadores/adapters/prisma-indicadores-repository.ts`
**Depends on**: T1, T2, T3
**Reuses**: `src/shared/db/prisma.ts`.
**Requirement**: IND-01, IND-05, IND-07

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Consultas de pedidos, atividades e execuções
- [x] Gate check passa: `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `feat(indicadores): repositorio prisma de indicadores`

---

### Phase 3: Routes

#### T5: Rota de lista de pedidos

**What**: Expor `GET /api/pedidos`.
**Where**: `src/app/api/pedidos/route.ts`
**Depends on**: T1, T4
**Reuses**: Caso de uso (T1), repositório (T4), sessão (`consultar_pedidos`).
**Requirement**: IND-01, IND-02, IND-03, IND-11

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Retorna `200` com a lista filtrada
- [x] Sem sessão `401`
- [x] Test count: 6 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): rota de lista de pedidos`

---

#### T6: Rota de detalhe do pedido

**What**: Expor `GET /api/pedidos/[orderId]`.
**Where**: `src/app/api/pedidos/[orderId]/route.ts`
**Depends on**: T1, T4
**Reuses**: Caso de uso (T1), repositório (T4).
**Requirement**: IND-04, IND-10, IND-11

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Retorna `200` com os cinco valores por item
- [ ] Pedido inexistente `404`; sem sessão `401`
- [ ] Test count: 5 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): rota de detalhe do pedido`

---

#### T7: Rota de indicadores

**What**: Expor `GET /api/indicadores` (painel + PCP).
**Where**: `src/app/api/indicadores/route.ts`
**Depends on**: T2, T3, T4
**Reuses**: Casos de uso (T2, T3), repositório (T4).
**Requirement**: IND-05, IND-06, IND-07, IND-08

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Retorna `200` com painel e PCP
- [ ] Sem sessão `401`
- [ ] Test count: 5 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): rota de indicadores`

---

## Phase Execution Map

```
Phase 1: T1
Phase 1: T2 -> T3
Phase 2: T4
Phase 3: T5
Phase 3: T6
Phase 3: T7
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: consulta | 1 caso de uso | ✅ Granular |
| T2: painel | 1 caso de uso | ✅ Granular |
| T3: PCP | 1 caso de uso | ✅ Granular |
| T4: repo | 1 adapter | ✅ Granular |
| T5–T7: rotas | 1 rota cada | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T3 | T2 | T2 -> T3 | ✅ Match |
| T4 | T1, T2, T3 | (cross-phase) | ✅ Match |
| T5 | T1, T4 | (cross-phase) | ✅ Match |
| T6 | T1, T4 | (cross-phase) | ✅ Match |
| T7 | T2, T3, T4 | (cross-phase) | ✅ Match |

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1–T3 | Domain | unit | unit | ✅ OK |
| T4 | Repository adapter | none | none | ✅ OK |
| T5–T7 | Route handler | integration | integration | ✅ OK |

---

## Task Verification Standards

Every task follows `Done when` + `Tests` + `Gate`. Each `Done when` entry is specific, binary, and references the gate command. Test counts prevent silent deletions.
