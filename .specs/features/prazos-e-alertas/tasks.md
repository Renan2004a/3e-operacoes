# Prazos e Alertas — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/prazos-e-alertas/design.md`
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
T1 -> T2 -> T3
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

#### T1: Definir prazo

**What**: Definir e validar o prazo de item e de atividade.
**Where**: `src/modules/prazos/prazo.ts`
**Depends on**: None
**Reuses**: `PrazosRepository`.
**Requirement**: PRAZO-01, PRAZO-02, PRAZO-03, PRAZO-04, PRAZO-11, PRAZO-12

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `dominio-3e`

**Done when**:

- [x] Prazo de item e de atividade persistido
- [x] Data inválida rejeitada
- [x] Item/atividade inexistente rejeitado
- [x] Test count: 7 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(prazos): define prazo de item e atividade`

---

#### T2: Status de prazo e atraso

**What**: Calcular `SEM_PRAZO`, `EM_DIA` e `ATRASADO`.
**Where**: `src/modules/prazos/atraso.ts`
**Depends on**: T1
**Reuses**: `prazo` (T1).
**Requirement**: PRAZO-05, PRAZO-06, PRAZO-07, PRAZO-08, PRAZO-09

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `tdd-3e`, `dominio-3e`

**Done when**:

- [x] Sem prazo → `SEM_PRAZO`
- [x] Prazo futuro → `EM_DIA`
- [x] Prazo passado e não concluído → `ATRASADO`
- [x] Prazo passado e concluído → não atrasado
- [x] Test count: 6 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(prazos): calcula status de atraso`

---

#### T3: Alertas de atraso

**What**: Listar as atividades atrasadas.
**Where**: `src/modules/prazos/alertas.ts`
**Depends on**: T2
**Reuses**: `atraso` (T2).
**Requirement**: PRAZO-10

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `dominio-3e`

**Done when**:

- [x] Só atividades com prazo ultrapassado e não concluídas
- [x] Test count: 4 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(prazos): lista atividades atrasadas`

---

### Phase 2: Adapter

#### T4: Repositório Prisma de prazos

**What**: Implementar `PrazosRepository` (itens, atividades, alertas).
**Where**: `src/modules/prazos/adapters/prisma-prazos-repository.ts`
**Depends on**: T1, T2, T3
**Reuses**: `src/shared/db/prisma.ts`.
**Requirement**: PRAZO-01, PRAZO-02, PRAZO-10

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Persistência de prazo e consulta de atrasadas
- [x] Gate check passa: `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `feat(prazos): repositorio prisma de prazos`

---

### Phase 3: Routes

#### T5: Rota de prazo do item

**What**: Expor `PATCH /api/pedidos/itens/[itemId]/prazo`.
**Where**: `src/app/api/pedidos/itens/[itemId]/prazo/route.ts`
**Depends on**: T1, T4
**Reuses**: Caso de uso (T1), repositório (T4), sessão (`definir_prazo`).
**Requirement**: PRAZO-01, PRAZO-03, PRAZO-04, PRAZO-12

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `dominio-3e`

**Done when**:

- [ ] Prazo válido responde `200`
- [ ] Sem perfil responde `403`; data inválida `400`; item inexistente `404`
- [ ] Test count: 6 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): rota de prazo do item`

---

#### T6: Rota de prazo da atividade

**What**: Expor `PATCH /api/producao/atividades/[id]/prazo`.
**Where**: `src/app/api/producao/atividades/[id]/prazo/route.ts`
**Depends on**: T1, T4
**Reuses**: Caso de uso (T1), repositório (T4), sessão.
**Requirement**: PRAZO-02, PRAZO-03, PRAZO-04, PRAZO-11

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `dominio-3e`

**Done when**:

- [ ] Prazo válido responde `200`
- [ ] Sem perfil `403`; data inválida `400`; atividade inexistente `404`
- [ ] Test count: 6 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): rota de prazo da atividade`

---

#### T7: Rota de alertas

**What**: Expor `GET /api/producao/alertas`.
**Where**: `src/app/api/producao/alertas/route.ts`
**Depends on**: T3, T4
**Reuses**: Caso de uso (T3), repositório (T4), sessão (`consultar_pedidos`).
**Requirement**: PRAZO-10

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Retorna `200` com as atividades atrasadas
- [ ] Sem sessão `401`
- [ ] Test count: 5 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): rota de alertas de atraso`

---

## Phase Execution Map

```
Phase 1: T1 -> T2 -> T3
Phase 2: T4
Phase 3: T5
Phase 3: T6
Phase 3: T7
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: prazo | 1 módulo | ✅ Granular |
| T2: atraso | 1 função | ✅ Granular |
| T3: alertas | 1 caso de uso | ✅ Granular |
| T4: repo | 1 adapter | ✅ Granular |
| T5–T7: rotas | 1 rota cada | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T2 | T1 | T1 -> T2 | ✅ Match |
| T3 | T2 | T2 -> T3 | ✅ Match |
| T4 | T1, T2, T3 | (cross-phase) | ✅ Match |
| T5 | T1, T4 | (cross-phase) | ✅ Match |
| T6 | T1, T4 | (cross-phase) | ✅ Match |
| T7 | T3, T4 | (cross-phase) | ✅ Match |

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1–T3 | Domain | unit | unit | ✅ OK |
| T4 | Repository adapter | none | none | ✅ OK |
| T5–T7 | Route handler | integration | integration | ✅ OK |

---

## Task Verification Standards

Every task follows `Done when` + `Tests` + `Gate`. Each `Done when` entry is specific, binary, and references the gate command. Test counts prevent silent deletions.
