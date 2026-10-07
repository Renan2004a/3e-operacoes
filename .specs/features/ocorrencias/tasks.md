# Ocorrências — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/ocorrencias/design.md`
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
| Build | Após tasks de schema/repositório e no fim de fase | `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build` |

---

## Execution Plan

### Phase 1: Domain

```
T1 -> T2
T3
```

### Phase 2: Schema and Adapter

```
T4 -> T5
```

### Phase 3: Routes

```
T6
T7
```

---

## Task Breakdown

### Phase 1: Domain

#### T1: Motivos de ocorrência

**What**: Listar motivos ativos por tipo, validar vínculo motivo↔tipo e manter as sugestões iniciais.
**Where**: `src/modules/ocorrencias/motivos.ts`
**Depends on**: None
**Reuses**: `docs/backlog/motivos-ocorrencia.md`.
**Requirement**: OCO-08, OCO-09

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `dominio-3e`

**Done when**:

- [x] Lista apenas motivos ativos do tipo
- [x] Rejeita motivo de outro tipo ou inativo
- [x] Sugestões iniciais marcadas como sugestão
- [x] Test count: 6 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(ocorrencias): lista e valida motivos`

---

#### T2: Registro de ocorrência

**What**: Validar e persistir perda, refugo, indisponibilidade, pausa e parada.
**Where**: `src/modules/ocorrencias/registrar-ocorrencia.ts`
**Depends on**: T1
**Reuses**: `motivos` (T1), validação de unidade da produção.
**Requirement**: OCO-01, OCO-02, OCO-03, OCO-04, OCO-05, OCO-06, OCO-11, OCO-13

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `tdd-3e`, `dominio-3e`

**Done when**:

- [x] Perda/refugo/indisponibilidade sem motivo é rejeitada
- [x] Motivo inválido é rejeitado
- [x] Quantidade fora da unidade é rejeitada
- [x] Perda/refugo não alteram o saldo (não chamam produção)
- [x] Test count: 10 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(ocorrencias): registra ocorrencia`

---

#### T3: Listagem de ocorrências

**What**: Listar as ocorrências de uma atividade.
**Where**: `src/modules/ocorrencias/listar-ocorrencias.ts`
**Depends on**: None
**Reuses**: Porta `OcorrenciaRepository`.
**Requirement**: OCO-07, OCO-10

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Retorna tipo, quantidade, motivo, observação e data/hora
- [x] Atividade inexistente é rejeitada
- [x] Test count: 5 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(ocorrencias): lista ocorrencias da atividade`

---

### Phase 2: Schema and Adapter

#### T4: Schema da lista de motivos

**What**: Adicionar `MotivoOcorrencia` e a relação em `Occurrence`.
**Where**: `prisma/schema.prisma`
**Depends on**: T1, T2
**Reuses**: Schema existente.
**Requirement**: OCO-02, OCO-08

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `dominio-3e`

**Done when**:

- [ ] Entidade `MotivoOcorrencia` com `@@unique([tipo, codigo])`
- [ ] `Occurrence.motivoId` com relação; `reasonCode` removido
- [ ] Gate check passa: `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `feat(ocorrencias): adiciona lista de motivos ao schema`

---

#### T5: Repositório Prisma de ocorrências

**What**: Implementar `MotivoRepository` e `OcorrenciaRepository` com Prisma.
**Where**: `src/modules/ocorrencias/adapters/prisma-ocorrencias-repository.ts`
**Depends on**: T1, T2, T3, T4
**Reuses**: `src/shared/db/prisma.ts`.
**Requirement**: OCO-01, OCO-07, OCO-08

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Persistência de ocorrência e consulta de motivos por tipo
- [ ] Gate check passa: `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `feat(ocorrencias): repositorio prisma de ocorrencias`

---

### Phase 3: Routes

#### T6: Rotas de ocorrências da atividade

**What**: Expor `POST`/`GET /api/producao/atividades/[id]/ocorrencias`.
**Where**: `src/app/api/producao/atividades/[id]/ocorrencias/route.ts`
**Depends on**: T2, T3, T5
**Reuses**: Casos de uso (T2, T3), repositório (T5), guarda de token.
**Requirement**: OCO-01, OCO-02, OCO-07, OCO-11

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `dominio-3e`

**Done when**:

- [ ] Registro válido responde `201`
- [ ] Sem motivo responde `400`
- [ ] Operador fora do setor responde `403`
- [ ] Listagem responde `200`
- [ ] Test count: 6 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): rotas de ocorrencias da atividade`

---

#### T7: Rota de motivos

**What**: Expor `GET /api/motivos?tipo=`.
**Where**: `src/app/api/motivos/route.ts`
**Depends on**: T1, T5
**Reuses**: Caso de uso (T1), repositório (T5).
**Requirement**: OCO-08, OCO-09

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Retorna `200` com os motivos ativos do tipo
- [ ] Tipo inválido responde `400`
- [ ] Token ausente responde `401`
- [ ] Test count: 5 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): rota de motivos de ocorrencia`

---

## Phase Execution Map

```
Phase 1: T1 -> T2
Phase 1: T3
Phase 2: T4 -> T5
Phase 3: T6
Phase 3: T7
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: motivos | 1 módulo | ✅ Granular |
| T2: registrar | 1 caso de uso | ✅ Granular |
| T3: listar | 1 caso de uso | ✅ Granular |
| T4: schema | 1 arquivo | ✅ Granular |
| T5: repo | 1 adapter | ✅ Granular |
| T6: rota ocorrências | 1 rota | ✅ Granular |
| T7: rota motivos | 1 rota | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T2 | T1 | T1 -> T2 | ✅ Match |
| T5 | T1, T2, T3, T4 | T4 -> T5 | ✅ Match (intra-fase) |
| T6 | T2, T3, T5 | (cross-phase) | ✅ Match |
| T7 | T1, T5 | (cross-phase) | ✅ Match |

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1–T3 | Domain | unit | unit | ✅ OK |
| T4 | Entity / schema | none | none | ✅ OK |
| T5 | Repository adapter | none | none | ✅ OK |
| T6–T7 | Route handler | integration | integration | ✅ OK |

---

## Task Verification Standards

Every task follows `Done when` + `Tests` + `Gate`. Each `Done when` entry is specific, binary, and references the gate command. Test counts prevent silent deletions.
