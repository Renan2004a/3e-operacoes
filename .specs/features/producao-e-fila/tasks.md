# Produção e Fila de Atividades — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/producao-e-fila/design.md`
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
| Build | Após tasks de repositório/config e no fim de fase | `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build` |

---

## Execution Plan

### Phase 1: Domain

```
T1 -> T2
T1 -> T3
T2 -> T3
T2 -> T6
T4
T5
```

### Phase 2: Adapter

```
T7
```

### Phase 3: Routes

```
T8
T9
T10
T11
```

---

## Task Breakdown

### Phase 1: Domain

#### T1: Validação de unidades e casas decimais

**What**: Validar e formatar quantidade conforme a unidade (peça inteira, metro 2 casas).
**Where**: `src/modules/producao/unidades.ts`
**Depends on**: None
**Reuses**: `Decimal` do Prisma.
**Requirement**: PROD-05, PROD-10

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `dominio-3e`

**Done when**:

- [x] Peça rejeita fração e aceita inteiro
- [x] Metro aceita decimal com 2 casas
- [x] Quantidade zero/negativa rejeitada
- [x] Test count: 9 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(producao): valida unidades e casas decimais`

---

#### T2: Cálculo de saldo pendente

**What**: Calcular solicitado, executado e pendente.
**Where**: `src/modules/producao/saldo.ts`
**Depends on**: T1
**Reuses**: `unidades` (T1).
**Requirement**: PROD-08, PROD-09

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `dominio-3e`

**Done when**:

- [x] Pendente = solicitado − executado
- [x] Executado acima do solicitado resulta em pendente zero
- [x] Test count: 6 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(producao): calcula saldo pendente`

---

#### T3: Registro de execução

**What**: Persistir execução, validar unidade e atualizar a situação da atividade.
**Where**: `src/modules/producao/registrar-execucao.ts`
**Depends on**: T1, T2
**Reuses**: `unidades` (T1), `saldo` (T2).
**Requirement**: PROD-04, PROD-05, PROD-06, PROD-07, PROD-14, PROD-15

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `tdd-3e`, `dominio-3e`

**Done when**:

- [x] Execução persiste com usuário e data/hora
- [x] Quantidade inválida rejeitada
- [x] Atingir o solicitado marca `COMPLETED`
- [x] Ultrapassar o solicitado marca `DIVERGENT`
- [x] Test count: 9 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(producao): registra execucao`

---

#### T4: Fila de atividades por setor

**What**: Listar atividades dos setores do usuário, ordenadas por prioridade.
**Where**: `src/modules/producao/fila.ts`
**Depends on**: None
**Reuses**: Porta `ProducaoRepository`.
**Requirement**: PROD-01, PROD-02, PROD-03

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `dominio-3e`

**Done when**:

- [ ] Só retorna atividades dos setores do usuário
- [ ] Ordena por prioridade decrescente e criação
- [ ] Usuário sem setor retorna lista vazia
- [ ] Test count: 6 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(producao): lista fila por setor`

---

#### T5: Definição de prioridade

**What**: Persistir a prioridade de uma atividade.
**Where**: `src/modules/producao/prioridade.ts`
**Depends on**: None
**Reuses**: Porta `ProducaoRepository`.
**Requirement**: PROD-11

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Prioridade persistida e refletida na ordenação
- [ ] Atividade inexistente rejeitada
- [ ] Test count: 4 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(producao): define prioridade de atividade`

---

#### T6: Ordem de produção

**What**: Montar os dados de impressão da ordem de produção.
**Where**: `src/modules/producao/ordem-producao.ts`
**Depends on**: T2
**Reuses**: `saldo` (T2).
**Requirement**: PROD-12, PROD-13

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `dominio-3e`

**Done when**:

- [ ] Retorna pedido, item, setor, solicitado, executado e pendente
- [ ] Atividade inexistente rejeitada
- [ ] Test count: 5 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(producao): monta ordem de producao`

---

### Phase 2: Adapter

#### T7: Repositório Prisma de produção

**What**: Implementar `ProducaoRepository` (atividades, execuções, setores do usuário, saldo em transação).
**Where**: `src/modules/producao/adapters/prisma-producao-repository.ts`
**Depends on**: T3, T4, T5, T6
**Reuses**: `src/shared/db/prisma.ts`.
**Requirement**: PROD-01, PROD-04, PROD-08, PROD-11

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Consulta de atividades por setor do usuário
- [ ] Soma de execuções em transação
- [ ] Gate check passa: `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `feat(producao): repositorio prisma de producao`

---

### Phase 3: Routes

#### T8: Rota da fila de atividades

**What**: Expor `GET /api/producao/atividades`.
**Where**: `src/app/api/producao/atividades/route.ts`
**Depends on**: T4, T7
**Reuses**: Caso de uso (T4), repositório (T7), guarda de token.
**Requirement**: PROD-01, PROD-02, PROD-03

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Retorna `200` com a fila do usuário
- [ ] Usuário sem setor retorna lista vazia
- [ ] Token ausente responde `401`
- [ ] Test count: 5 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): rota da fila de producao`

---

#### T9: Rota de registro de execução

**What**: Expor `POST /api/producao/atividades/[id]/execucoes`.
**Where**: `src/app/api/producao/atividades/[id]/execucoes/route.ts`
**Depends on**: T3, T7
**Reuses**: Caso de uso (T3), repositório (T7).
**Requirement**: PROD-04, PROD-05, PROD-06, PROD-07, PROD-14, PROD-15

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `tdd-3e`

**Done when**:

- [ ] Execução válida responde `201`
- [ ] Quantidade inválida responde `400`
- [ ] Operador fora do setor responde `403`
- [ ] Atividade inexistente responde `404`
- [ ] Test count: 6 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): rota de registro de execucao`

---

#### T10: Rota de prioridade

**What**: Expor `PATCH /api/producao/atividades/[id]/prioridade`.
**Where**: `src/app/api/producao/atividades/[id]/prioridade/route.ts`
**Depends on**: T5, T7
**Reuses**: Caso de uso (T5), repositório (T7).
**Requirement**: PROD-11

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Prioridade válida responde `200`
- [ ] Atividade inexistente responde `404`
- [ ] Token ausente responde `401`
- [ ] Test count: 5 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): rota de prioridade de atividade`

---

#### T11: Rota da ordem de produção

**What**: Expor `GET /api/producao/atividades/[id]/ordem`.
**Where**: `src/app/api/producao/atividades/[id]/ordem/route.ts`
**Depends on**: T6, T7
**Reuses**: Caso de uso (T6), repositório (T7).
**Requirement**: PROD-12, PROD-13

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Retorna `200` com os dados da ordem
- [ ] Atividade inexistente responde `404`
- [ ] Token ausente responde `401`
- [ ] Test count: 5 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): rota da ordem de producao`

---

## Phase Execution Map

```
Phase 1: T1 -> T2
Phase 1: T1 -> T3
Phase 1: T2 -> T3
Phase 1: T2 -> T6
Phase 1: T4
Phase 1: T5
Phase 2: T7
Phase 3: T8
Phase 3: T9
Phase 3: T10
Phase 3: T11
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: unidades | 1 módulo | ✅ Granular |
| T2: saldo | 1 função | ✅ Granular |
| T3: execução | 1 caso de uso | ✅ Granular |
| T4: fila | 1 caso de uso | ✅ Granular |
| T5: prioridade | 1 caso de uso | ✅ Granular |
| T6: ordem | 1 caso de uso | ✅ Granular |
| T7: repo | 1 adapter | ✅ Granular |
| T8–T11: rotas | 1 rota cada | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T2 | T1 | T1 -> T2 | ✅ Match |
| T3 | T1, T2 | T1 -> T3, T2 -> T3 | ✅ Match |
| T6 | T2 | T2 -> T6 | ✅ Match |
| T7 | T3, T4, T5, T6 | (cross-phase) | ✅ Match |
| T8 | T4, T7 | (cross-phase) | ✅ Match |
| T9 | T3, T7 | (cross-phase) | ✅ Match |
| T10 | T5, T7 | (cross-phase) | ✅ Match |
| T11 | T6, T7 | (cross-phase) | ✅ Match |

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1–T6 | Domain | unit | unit | ✅ OK |
| T7 | Repository adapter | none | none | ✅ OK |
| T8–T11 | Route handler | integration | integration | ✅ OK |

---

## Task Verification Standards

Every task follows `Done when` + `Tests` + `Gate`. Each `Done when` entry is specific, binary, and references the gate command. Test counts prevent silent deletions.
