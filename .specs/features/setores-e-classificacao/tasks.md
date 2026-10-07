# Setores e Classificação de Itens — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/setores-e-classificacao/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `docs/testes.md`, `AGENTS.md`, `vitest.config.ts` (cobertura 80% em `src/modules/**`), `.github/workflows/ci.yml`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain / use case (`src/modules/**`) | unit | Todos os ramos; 1:1 com os ACs; todos os edge cases | `src/modules/**/*.test.ts` | `npm test` |
| Shared utility (`src/shared/**`) | unit | Ramos + caminhos de erro | `src/shared/**/*.test.ts` | `npm test` |
| Route handler (`src/app/api/**`) | integration | Cada rota: happy + edge + erro | `src/app/api/**/*.test.ts` | `npm test` |
| Repository adapter (Prisma) | none | Build gate only; o domínio é testado com fakes (AD-002) | - | build gate only |
| Entity / schema / config | none | Build gate only | - | build gate only |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Após tasks só com testes unitários | `npm test` |
| Full | Após tasks com testes de integração (rotas) | `npm run lint && npm run typecheck && npm test` |
| Build | Após tasks de repositório/config e no fim de fase | `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Domain

```
T1
T2 -> T3 -> T4
```

### Phase 2: Adapters

```
T5
T6
```

### Phase 3: Routes

```
T7
T8
T9
```

---

## Task Breakdown

### Phase 1: Domain

#### T1: Casos de uso de setores

**What**: Criar, listar e inativar setores, com a porta `SectorRepository`.
**Where**: `src/modules/setores/gerenciar-setores.ts`
**Depends on**: None
**Reuses**: Padrão de casos de uso da feature 1.
**Requirement**: SET-01, SET-02, SET-03, SET-04, SET-18

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `dominio-3e`

**Done when**:

- [ ] Código vazio é rejeitado
- [ ] Código duplicado é rejeitado com conflito
- [ ] Inativar não apaga o setor
- [ ] Listagem padrão só traz ativos
- [ ] Test count: 7 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(setores): adiciona casos de uso de setores`

---

#### T2: Casos de uso de mapeamento categoria → setor

**What**: Criar, alterar e inativar mapeamentos, com auditoria e porta `MapeamentoRepository`.
**Where**: `src/modules/setores/mapeamento.ts`
**Depends on**: None
**Reuses**: `AuditLog` via porta.
**Requirement**: SET-05, SET-06, SET-07, SET-08, SET-17

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `dominio-3e`

**Done when**:

- [ ] Criação grava auditoria
- [ ] Alteração grava antes/depois
- [ ] Categoria duplicada é rejeitada com conflito
- [ ] Test count: 7 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(setores): adiciona mapeamento categoria-setor`

---

#### T3: Caso de uso de classificação de item

**What**: Classificar item pendente, criar `Activity` e, quando houver categoria, o mapeamento.
**Where**: `src/modules/setores/classificar-item.ts`
**Depends on**: T2
**Reuses**: Porta `MapeamentoRepository` (T2).
**Requirement**: SET-09, SET-10, SET-11, SET-12, SET-13, SET-15, SET-16

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `dominio-3e`

**Done when**:

- [ ] Item com categoria mapeada é classificado e ganha `Activity`
- [ ] Item sem mapeamento permanece `PENDING_CLASSIFICATION`
- [ ] Item já classificado é rejeitado com conflito
- [ ] Setor inativo/inexistente é rejeitado
- [ ] Test count: 9 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(setores): classifica item e cria atividade`

---

#### T4: Auto-classificação na importação

**What**: Classificar automaticamente itens cuja categoria tenha mapeamento ativo, via porta injetada.
**Where**: `src/modules/pedidos/importar-pedido.ts` (modify)
**Depends on**: T3
**Reuses**: `importarPedido` da feature 1; porta de classificação (T3).
**Requirement**: SET-09

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `dominio-3e`, `tdd-3e`

**Done when**:

- [ ] Item com categoria mapeada sai `CLASSIFIED` e ganha `Activity`
- [ ] Item sem mapeamento permanece pendente
- [ ] Comportamento da feature 1 preservado (sem porta, nada muda)
- [ ] Test count: 6 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(pedidos): classifica itens mapeados na importacao`

---

### Phase 2: Adapters

#### T5: Repositório Prisma de setores e mapeamento

**What**: Implementar `SectorRepository` e `MapeamentoRepository` com Prisma e `AuditLog`.
**Where**: `src/modules/setores/adapters/prisma-setores-repository.ts`
**Depends on**: T1, T2
**Reuses**: `src/shared/db/prisma.ts`.
**Requirement**: SET-01, SET-05, SET-06, SET-14

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] CRUD de setor e de mapeamento implementados
- [ ] Auditoria gravada em `AuditLog`
- [ ] Gate check passa: `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `feat(setores): repositorio prisma de setores e mapeamento`

---

#### T6: Repositório Prisma de classificação

**What**: Implementar `ClassificacaoRepository`: marcar item e criar `Activity` em transação.
**Where**: `src/modules/setores/adapters/prisma-classificacao-repository.ts`
**Depends on**: T3
**Reuses**: `src/shared/db/prisma.ts`.
**Requirement**: SET-09, SET-10, SET-13

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `dominio-3e`

**Done when**:

- [ ] Item marcado `CLASSIFIED` e `Activity` criada na mesma transação
- [ ] Gate check passa: `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `feat(setores): repositorio prisma de classificacao`

---

### Phase 3: Routes

#### T7: Rotas de setores

**What**: Expor `GET`/`POST /api/setores`.
**Where**: `src/app/api/setores/route.ts`
**Depends on**: T1, T5
**Reuses**: Guarda `APP_INTERNAL_TOKEN`, casos de uso (T1), repositório (T5).
**Requirement**: SET-01, SET-02, SET-04

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Criação responde `201`; duplicado responde `409`; código vazio `400`
- [ ] Listagem responde `200` só com ativos
- [ ] Token ausente responde `401`
- [ ] Test count: 6 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): rotas de setores`

---

#### T8: Rotas de mapeamento

**What**: Expor `GET`/`POST`/`PATCH /api/mapeamentos`.
**Where**: `src/app/api/mapeamentos/route.ts`
**Depends on**: T2, T5
**Reuses**: Casos de uso (T2), repositório (T5).
**Requirement**: SET-05, SET-06, SET-07, SET-08

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Criação responde `201`; categoria duplicada `409`
- [ ] Alteração responde `200` e audita
- [ ] Token ausente responde `401`
- [ ] Test count: 6 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): rotas de mapeamento`

---

#### T9: Rota de classificação de item

**What**: Expor `POST /api/pedidos/itens/[itemId]/classificar`.
**Where**: `src/app/api/pedidos/itens/[itemId]/classificar/route.ts`
**Depends on**: T3, T6
**Reuses**: Caso de uso (T3), repositório (T6).
**Requirement**: SET-10, SET-11, SET-12, SET-15

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `dominio-3e`

**Done when**:

- [ ] Classificação válida responde `200`
- [ ] Item já classificado responde `409`
- [ ] Setor inválido responde `400`
- [ ] Token ausente responde `401`
- [ ] Test count: 6 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): rota de classificacao de item`

---

## Phase Execution Map

```
Phase 1: T1
Phase 1: T2 -> T3 -> T4
Phase 2: T5
Phase 2: T6
Phase 3: T7
Phase 3: T8
Phase 3: T9
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: setores | 1 caso de uso | ✅ Granular |
| T2: mapeamento | 1 caso de uso | ✅ Granular |
| T3: classificação | 1 caso de uso | ✅ Granular |
| T4: importação (ajuste) | 1 arquivo | ✅ Granular |
| T5: repo setores | 1 adapter | ✅ Granular |
| T6: repo classificação | 1 adapter | ✅ Granular |
| T7: rota setores | 1 rota | ✅ Granular |
| T8: rota mapeamento | 1 rota | ✅ Granular |
| T9: rota classificação | 1 rota | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T3 | T2 | T2 -> T3 | ✅ Match |
| T4 | T3 | T3 -> T4 | ✅ Match |
| T5 | T1, T2 | (sem seta intra-fase) | ✅ Match |
| T6 | T3 | (sem seta intra-fase) | ✅ Match |
| T7 | T1, T5 | (sem seta intra-fase) | ✅ Match |
| T8 | T2, T5 | (sem seta intra-fase) | ✅ Match |
| T9 | T3, T6 | (sem seta intra-fase) | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1: setores | Domain | unit | unit | ✅ OK |
| T2: mapeamento | Domain | unit | unit | ✅ OK |
| T3: classificação | Domain | unit | unit | ✅ OK |
| T4: importação | Domain | unit | unit | ✅ OK |
| T5: repo setores | Repository adapter | none | none | ✅ OK |
| T6: repo classificação | Repository adapter | none | none | ✅ OK |
| T7: rota setores | Route handler | integration | integration | ✅ OK |
| T8: rota mapeamento | Route handler | integration | integration | ✅ OK |
| T9: rota classificação | Route handler | integration | integration | ✅ OK |

---

## Task Verification Standards

Every task follows `Done when` + `Tests` + `Gate`. Each `Done when` entry is specific, binary, and references the gate command. Test counts prevent silent deletions.
