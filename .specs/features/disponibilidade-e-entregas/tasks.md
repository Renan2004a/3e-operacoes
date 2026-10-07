# Disponibilidade e Entregas — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/disponibilidade-e-entregas/design.md`
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
T1 -> T2
T1 -> T3
T4
```

### Phase 2: Adapter

```
T5
```

### Phase 3: Routes

```
T6
T7
```

---

## Task Breakdown

### Phase 1: Domain

#### T1: Cálculo de disponibilidade

**What**: Calcular disponível = executado − entregue.
**Where**: `src/modules/expedicao/disponibilidade.ts`
**Depends on**: None
**Reuses**: `Decimal`.
**Requirement**: EXP-01, EXP-02, EXP-14

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `dominio-3e`

**Done when**:

- [x] Disponível = executado − entregue
- [x] Item sem produção tem disponível zero
- [x] Disponível nunca é negativo
- [x] Test count: 5 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(expedicao): calcula disponibilidade`

---

#### T2: Registro de entrega

**What**: Validar papel, bloquear acima do disponível e registrar exceção com auditoria.
**Where**: `src/modules/expedicao/registrar-entrega.ts`
**Depends on**: T1
**Reuses**: `disponibilidade` (T1).
**Requirement**: EXP-03, EXP-04, EXP-05, EXP-06, EXP-07, EXP-08, EXP-09, EXP-13

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `tdd-3e`, `dominio-3e`

**Done when**:

- [x] Expedição/Gerente registram dentro do disponível
- [x] Outro papel é rejeitado
- [x] Acima do disponível é bloqueado sem exceção
- [x] Exceção de gerente com motivo grava auditoria
- [x] Parcial mantém parcial; atingir executado conclui
- [x] Test count: 11 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(expedicao): registra entrega com excecao`

---

#### T3: Saldo consolidado do pedido

**What**: Consolidar solicitado, executado, disponível, entregue e pendente por item.
**Where**: `src/modules/expedicao/saldo-pedido.ts`
**Depends on**: T1
**Reuses**: `disponibilidade` (T1).
**Requirement**: EXP-10

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `dominio-3e`

**Done when**:

- [x] Retorna os cinco valores por item
- [x] Pendente = solicitado − executado
- [x] Test count: 5 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(expedicao): consolida saldo do pedido`

---

#### T4: Histórico de entregas

**What**: Listar entregas de um item.
**Where**: `src/modules/expedicao/historico-entregas.ts`
**Depends on**: None
**Reuses**: Porta `ExpedicaoRepository`.
**Requirement**: EXP-11, EXP-12

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Retorna quantidade, usuário, data/hora e exceção
- [x] Item inexistente é rejeitado
- [x] Test count: 5 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(expedicao): lista historico de entregas`

---

### Phase 2: Adapter

#### T5: Repositório Prisma de expedição

**What**: Implementar `ExpedicaoRepository` (entregas, execuções, papéis, auditoria) em transação.
**Where**: `src/modules/expedicao/adapters/prisma-expedicao-repository.ts`
**Depends on**: T1, T2, T3, T4
**Reuses**: `src/shared/db/prisma.ts`.
**Requirement**: EXP-03, EXP-06, EXP-10, EXP-11

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Entrega e auditoria gravadas em transação
- [x] Consultas de execução, entrega e papéis
- [x] Gate check passa: `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `feat(expedicao): repositorio prisma de expedicao`

---

### Phase 3: Routes

#### T6: Rotas de entregas do item

**What**: Expor `POST`/`GET /api/pedidos/itens/[itemId]/entregas`.
**Where**: `src/app/api/pedidos/itens/[itemId]/entregas/route.ts`
**Depends on**: T2, T4, T5
**Reuses**: Casos de uso (T2, T4), repositório (T5), guarda de token.
**Requirement**: EXP-03, EXP-04, EXP-05, EXP-06, EXP-11

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `dominio-3e`

**Done when**:

- [ ] Entrega válida responde `201`
- [ ] Acima do disponível responde `409`
- [ ] Papel sem permissão responde `403`
- [ ] Histórico responde `200`
- [ ] Test count: 7 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): rotas de entregas do item`

---

#### T7: Rota de saldo do pedido

**What**: Expor `GET /api/pedidos/[orderId]/saldo`.
**Where**: `src/app/api/pedidos/[orderId]/saldo/route.ts`
**Depends on**: T3, T5
**Reuses**: Caso de uso (T3), repositório (T5).
**Requirement**: EXP-10, EXP-12

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Retorna `200` com os cinco valores por item
- [ ] Pedido inexistente responde `404`
- [ ] Token ausente responde `401`
- [ ] Test count: 5 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): rota de saldo do pedido`

---

## Phase Execution Map

```
Phase 1: T1 -> T2
Phase 1: T1 -> T3
Phase 1: T4
Phase 2: T5
Phase 3: T6
Phase 3: T7
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: disponibilidade | 1 função | ✅ Granular |
| T2: entrega | 1 caso de uso | ✅ Granular |
| T3: saldo | 1 caso de uso | ✅ Granular |
| T4: histórico | 1 caso de uso | ✅ Granular |
| T5: repo | 1 adapter | ✅ Granular |
| T6: rota entregas | 1 rota | ✅ Granular |
| T7: rota saldo | 1 rota | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T2 | T1 | T1 -> T2 | ✅ Match |
| T3 | T1 | T1 -> T3 | ✅ Match |
| T5 | T1, T2, T3, T4 | (cross-phase) | ✅ Match |
| T6 | T2, T4, T5 | (cross-phase) | ✅ Match |
| T7 | T3, T5 | (cross-phase) | ✅ Match |

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1–T4 | Domain | unit | unit | ✅ OK |
| T5 | Repository adapter | none | none | ✅ OK |
| T6–T7 | Route handler | integration | integration | ✅ OK |

---

## Task Verification Standards

Every task follows `Done when` + `Tests` + `Gate`. Each `Done when` entry is specific, binary, and references the gate command. Test counts prevent silent deletions.
