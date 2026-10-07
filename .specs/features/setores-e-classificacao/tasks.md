# Setores e Classificação de Itens — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/setores-e-classificacao/design.md`
**Status**: Done

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

### Phase 4: Correções de verificação

```
T10
T11
T12
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

- [x] Código vazio é rejeitado
- [x] Código duplicado é rejeitado com conflito
- [x] Inativar não apaga o setor
- [x] Listagem padrão só traz ativos
- [x] Test count: 7 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

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

- [x] Criação grava auditoria
- [x] Alteração grava antes/depois
- [x] Categoria duplicada é rejeitada com conflito
- [x] Test count: 7 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

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

- [x] Item com categoria mapeada é classificado e ganha `Activity`
- [x] Item sem mapeamento permanece `PENDING_CLASSIFICATION`
- [x] Item já classificado é rejeitado com conflito
- [x] Setor inativo/inexistente é rejeitado
- [x] Test count: 9 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

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

- [x] Item com categoria mapeada sai `CLASSIFIED` e ganha `Activity`
- [x] Item sem mapeamento permanece pendente
- [x] Comportamento da feature 1 preservado (sem porta, nada muda)
- [x] Test count: 6 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

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

- [x] CRUD de setor e de mapeamento implementados
- [x] Auditoria gravada em `AuditLog`
- [x] Gate check passa: `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`

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

- [x] Item marcado `CLASSIFIED` e `Activity` criada na mesma transação
- [x] Gate check passa: `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`

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

- [x] Criação responde `201`; duplicado responde `409`; código vazio `400`
- [x] Listagem responde `200` só com ativos
- [x] Token ausente responde `401`
- [x] Test count: 6 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm test`

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

- [x] Criação responde `201`; categoria duplicada `409`
- [x] Alteração responde `200` e audita
- [x] Token ausente responde `401`
- [x] Test count: 6 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm test`

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

- [x] Classificação válida responde `200`
- [x] Item já classificado responde `409`
- [x] Setor inválido responde `400`
- [x] Token ausente responde `401`
- [x] Test count: 6 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): rota de classificacao de item`

---

### Phase 4: Correções de verificação

#### T10: Auto-classificação fim a fim no callback de importação

**What**: Implementar a porta `ClassificacaoAutomaticaPort` com Prisma e injetá-la em `processarCallback` e na rota de callback, para que itens reimportados com categoria mapeada saiam `CLASSIFIED` com `Activity`.
**Where**: `src/modules/setores/adapters/prisma-classificacao-automatica.ts` (novo) + `src/modules/integracao/processar-callback.ts` + `src/app/api/integracao/callback/route.ts` + testes
**Depends on**: T3, T4, T5, T6
**Reuses**: `classificarPorMapeamento` (T3), adaptadores Prisma (T5, T6), porta de importação (T4).
**Requirement**: SET-09

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `dominio-3e`

**Done when**:

- [x] Item com categoria mapeada termina `CLASSIFIED` com uma `Activity` via `processarCallback`
- [x] Callback fim a fim (rota) classifica o item mapeado
- [x] Item já classificado é ignorado (sem erro de reclassificação na reimportação)
- [x] Test count: 143 testes passam na suíte (sem remoções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: unit + integration
**Gate**: full

**Commit**: `feat(setores): auto-classifica itens mapeados no callback`

---

#### T11: Cobre mapeamento inativo na classificação

**What**: Adicionar teste do ramo de mapeamento `INACTIVE`, garantindo que o item permanece `PENDING_CLASSIFICATION` sem criar `Activity`.
**Where**: `src/modules/setores/classificar-item.test.ts`
**Depends on**: T3
**Reuses**: Harness de `classificar-item.test.ts`.
**Requirement**: SET-13, SET-16

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `tdd-3e`

**Done when**:

- [x] Mapeamento `INACTIVE` mantém o item `PENDING_CLASSIFICATION`
- [x] Nenhuma `Activity` é criada
- [x] Test count: 10 testes passam em `classificar-item.test.ts` (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `test(setores): cobre mapeamento inativo na classificacao`

---

#### T12: Documenta e cobre o contrato do GET de mapeamentos

**What**: Documentar no design o contrato de `GET /api/mapeamentos?category=` (resolve por categoria; `400` sem o parâmetro; `404` quando ausente) e cobrir os caminhos de erro na rota.
**Where**: `.specs/features/setores-e-classificacao/design.md` + `src/app/api/mapeamentos/route.test.ts`
**Depends on**: T8
**Reuses**: Testes de rota existentes (T8).
**Requirement**: N/A (precisão de contrato de leitura)

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Contrato do GET documentado no design
- [x] `400` sem `category` e `404` quando o mapeamento não existe cobertos por teste
- [x] Test count: 9 testes passam em `mapeamentos/route.test.ts` (sem remoções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `test(api): cobre contrato do GET de mapeamentos`

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
Phase 4: T10
Phase 4: T11
Phase 4: T12
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
| T10: auto-classificação fim a fim | 1 porta + fiação | ⚠️ Multi-arquivo (deliverable atômico) |
| T11: mapeamento inativo | 1 teste | ✅ Granular |
| T12: contrato do GET | 1 doc + 1 teste | ✅ Granular |

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
| T10 | T3, T4, T5, T6 | (sem seta intra-fase) | ✅ Match |
| T11 | T3 | (sem seta intra-fase) | ✅ Match |
| T12 | T8 | (sem seta intra-fase) | ✅ Match |

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
| T10: auto-classificação fim a fim | Adapter + domain + route | none/unit/integration | unit + integration | ✅ OK |
| T11: mapeamento inativo | Domain | unit | unit | ✅ OK |
| T12: contrato do GET | Route handler | integration | integration | ✅ OK |

---

## Task Verification Standards

Every task follows `Done when` + `Tests` + `Gate`. Each `Done when` entry is specific, binary, and references the gate command. Test counts prevent silent deletions.
