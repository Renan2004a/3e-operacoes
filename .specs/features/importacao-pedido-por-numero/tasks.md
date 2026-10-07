# Importação de Pedido por Número — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/importacao-pedido-por-numero/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `docs/testes.md`, `AGENTS.md`, `vitest.config.ts` (cobertura 80% em `src/modules/**`), `.github/workflows/ci.yml`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain / use case (`src/modules/**`) | unit | Todos os ramos; 1:1 com os ACs da spec; todos os edge cases listados | `src/modules/**/*.test.ts` | `npm test` |
| Shared utility (`src/shared/**`) | unit | Ramos + caminhos de erro | `src/shared/**/*.test.ts` | `npm test` |
| Route handler (`src/app/api/**`) | integration | Cada rota: happy + edge + erro | `src/app/api/**/*.test.ts` | `npm test` |
| Connector logic (`connector-local/src/**`) | unit | Normalização, autenticação e erros | `connector-local/src/**/*.test.ts` | `npm test` |
| Repository adapter (Prisma) | none | Build gate only; o domínio é testado com fakes (AD-002) | - | build gate only |
| Entity / schema / config | none | Build gate only | - | build gate only |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Após tasks só com testes unitários | `npm test` |
| Full | Após tasks com testes de integração (rotas) | `npm run lint && npm run typecheck && npm test` |
| Build | Após tasks de schema/config/repositório e no fim de fase | `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Foundation

```
T1
T2
T3
```

### Phase 2: Domain

```
T4
T5
T6 -> T7
T8
```

### Phase 3: Adapters

```
T9
T10
T11
```

### Phase 4: HTTP

```
T12
T13
T14
```

### Phase 5: Connector

```
T15 -> T16
```

### Phase 6: Config

```
T17
```

---

## Task Breakdown

### Phase 1: Foundation

#### T1: Adicionar `sellerLegacyCode` ao modelo Order

**What**: Adicionar a coluna `sellerLegacyCode String?` ao model `Order`.
**Where**: `prisma/schema.prisma`
**Depends on**: None
**Reuses**: Model `Order` existente.
**Requirement**: INTG-02

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `dominio-3e`

**Done when**:

- [x] Coluna `sellerLegacyCode String?` adicionada a `Order`
- [x] `npm run prisma:generate` executa sem erro
- [x] Gate check passa: `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `feat(pedidos): adiciona codigo legado do vendedor ao pedido`

---

#### T2: Guarda de token interno das rotas

**What**: Criar um helper que valida o token interno temporário das rotas de integração.
**Where**: `src/shared/http/internal-auth.ts`
**Depends on**: None
**Reuses**: `src/shared/time/timezone.ts` (padrão de módulo).
**Requirement**: INTG-05, INTG-20

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `seguranca-3e`

**Done when**:

- [x] `requireInternalToken(request): boolean` compara com `APP_INTERNAL_TOKEN`
- [x] Retorna falso quando o token falta ou diverge
- [x] Test count: 4 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(shared): adiciona guarda de token interno`

---

#### T3: Contratos e portas da integração

**What**: Definir os schemas Zod (despacho e callback) e as portas `IntegracaoRepository` e `ConectorLegadoPort`.
**Where**: `src/modules/integracao/contratos.ts`
**Depends on**: None
**Reuses**: `zod` já instalado.
**Requirement**: INTG-01, INTG-03

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `integracao-top-gerente`

**Done when**:

- [x] Schema de despacho `{ jobId, orderNumber }` definido
- [x] Schema de callback com `order` e `items` definido
- [x] Portas `IntegracaoRepository` e `ConectorLegadoPort` exportadas
- [x] Test count: 8 testes passam (payload válido, inválido e campos obrigatórios)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(integracao): define contratos e portas`

---

### Phase 2: Domain

#### T4: Caso de uso `solicitarImportacao`

**What**: Criar o job idempotente e agendar o despacho, retornando o `jobId`.
**Where**: `src/modules/integracao/solicitar-importacao.ts`
**Depends on**: T3
**Reuses**: Porta `IntegracaoRepository` (T3).
**Requirement**: INTG-01, INTG-02, INTG-16, INTG-23

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `tdd-3e`, `integracao-top-gerente`

**Done when**:

- [ ] Número inválido retorna erro sem criar job
- [ ] Mesmo número dentro de 60 s reutiliza o job existente
- [ ] Dois pedidos concorrentes do mesmo número criam um único job
- [ ] Test count: 7 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(integracao): cria job de importacao idempotente`

---

#### T5: Caso de uso `consultarStatus`

**What**: Retornar o status atual e os eventos do job.
**Where**: `src/modules/integracao/consultar-status.ts`
**Depends on**: T3
**Reuses**: Porta `IntegracaoRepository` (T3).
**Requirement**: INTG-08, INTG-09, INTG-10, INTG-11

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `tdd-3e`

**Done when**:

- [ ] Job inexistente retorna erro de não encontrado
- [ ] Estado final e estado não final são distinguidos
- [ ] Test count: 4 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(integracao): consulta status do job`

---

#### T6: Caso de uso `importarPedido`

**What**: Fazer upsert transacional de pedido e itens e detectar divergência de quantidade.
**Where**: `src/modules/pedidos/importar-pedido.ts`
**Depends on**: None
**Reuses**: Modelos `Order`/`OrderItem` (Prisma).
**Requirement**: INTG-03, INTG-07, INTG-12, INTG-13, INTG-14, INTG-15, INTG-22

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `tdd-3e`, `dominio-3e`

**Done when**:

- [ ] Porta `PedidosRepository` definida no mesmo arquivo
- [ ] Mesma chave de negócio não cria segundo pedido
- [ ] Itens cancelados são excluídos
- [ ] Nova quantidade menor que executado/entregue sinaliza divergência
- [ ] Test count: 9 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(pedidos): importa pedido e itens com upsert`

---

#### T7: Caso de uso `processarCallback`

**What**: Validar o payload do callback e orquestrar o upsert, atualizando o job.
**Where**: `src/modules/integracao/processar-callback.ts`
**Depends on**: T3, T6
**Reuses**: `importarPedido` (T6), contratos (T3).
**Requirement**: INTG-03, INTG-04, INTG-21

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `tdd-3e`, `integracao-top-gerente`

**Done when**:

- [ ] Payload inválido não persiste dados
- [ ] Callback duplicado não repete o upsert
- [ ] Job termina `SUCCEEDED` e registra evento
- [ ] Test count: 7 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(integracao): processa callback e conclui job`

---

#### T8: Caso de uso `reprocessar`

**What**: Criar novo despacho para um job `FAILED`, preservando o histórico.
**Where**: `src/modules/integracao/reprocessar.ts`
**Depends on**: T3
**Reuses**: Porta `IntegracaoRepository` (T3).
**Requirement**: INTG-17, INTG-18

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `tdd-3e`

**Done when**:

- [ ] Job não finalizado é rejeitado com conflito
- [ ] Job `FAILED` gera novo despacho mantendo os eventos antigos
- [ ] Test count: 4 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(integracao): reprocessa job com falha`

---

### Phase 3: Adapters

#### T9: Repositório Prisma da integração

**What**: Implementar `IntegracaoRepository` com Prisma.
**Where**: `src/modules/integracao/adapters/prisma-integracao-repository.ts`
**Depends on**: T3
**Reuses**: `src/shared/db/prisma.ts`.
**Requirement**: INTG-01, INTG-08, INTG-17

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Criar, buscar por idempotência, buscar por id e atualizar status implementados
- [ ] Eventos do job são persistidos
- [ ] Gate check passa: `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `feat(integracao): repositorio prisma do job`

---

#### T10: Repositório Prisma de pedidos

**What**: Implementar `PedidosRepository` com Prisma.
**Where**: `src/modules/pedidos/adapters/prisma-pedidos-repository.ts`
**Depends on**: T6
**Reuses**: `src/shared/db/prisma.ts`.
**Requirement**: INTG-03, INTG-12

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `dominio-3e`

**Done when**:

- [ ] Upsert de pedido por `legacyOrderKey` implementado
- [ ] Upsert de itens por `(orderId, legacyItemKey)` implementado
- [ ] Gate check passa: `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `feat(pedidos): repositorio prisma de pedidos`

---

#### T11: Adapter HTTP do conector

**What**: Implementar `ConectorLegadoPort` chamando o conector com token e timeout.
**Where**: `src/modules/integracao/adapters/http-conector-legado.ts`
**Depends on**: T3, T2
**Reuses**: `LOCAL_CONNECTOR_BASE_URL`, `LOCAL_CONNECTOR_TOKEN`.
**Requirement**: INTG-02, INTG-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `integracao-top-gerente`, `seguranca-3e`

**Done when**:

- [ ] Envia `{ jobId, orderNumber }` com header de autorização
- [ ] Timeout gera erro tratável `CONNECTOR_TIMEOUT`
- [ ] Test count: 5 testes passam (sucesso, 401, timeout, 500, corpo inválido)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(integracao): adapter http do conector local`

---

### Phase 4: HTTP

#### T12: Rota POST de criação do job

**What**: Expor `POST /api/integracao/pedidos` que valida o token, cria o job e responde `202`.
**Where**: `src/app/api/integracao/pedidos/route.ts`
**Depends on**: T4, T9, T11, T2
**Reuses**: Caso de uso (T4), repositório (T9), adapter (T11).
**Requirement**: INTG-01, INTG-02, INTG-05

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `seguranca-3e`

**Done when**:

- [ ] Número válido responde `202` com `jobId`
- [ ] Número inválido responde `400`
- [ ] Token ausente responde `401`
- [ ] Test count: 6 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): rota de importacao de pedido`

---

#### T13: Rota GET de status

**What**: Expor `GET /api/integracao/pedidos/[jobId]` com status e eventos.
**Where**: `src/app/api/integracao/pedidos/[jobId]/route.ts`
**Depends on**: T5, T9, T2
**Reuses**: Caso de uso (T5), repositório (T9).
**Requirement**: INTG-08, INTG-09, INTG-10, INTG-11

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Job inexistente responde `404`
- [ ] Estado não final responde `202`; estado final responde `200`
- [ ] Token ausente responde `401`
- [ ] Test count: 5 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): rota de status da importacao`

---

#### T14: Rota POST de callback

**What**: Expor `POST /api/integracao/callback` que valida o token e processa o payload.
**Where**: `src/app/api/integracao/callback/route.ts`
**Depends on**: T7, T9, T10, T2
**Reuses**: Caso de uso (T7), repositórios (T9, T10).
**Requirement**: INTG-03, INTG-04, INTG-20, INTG-21

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `seguranca-3e`, `integracao-top-gerente`

**Done when**:

- [ ] Payload válido responde `200` e conclui o job
- [ ] Token inválido responde `401` sem persistir
- [ ] Callback duplicado responde `200` sem repetir upsert
- [ ] Test count: 5 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): rota de callback da integracao`

---

### Phase 5: Connector

#### T15: Consulta e normalização do Top Gerente

**What**: Consultar `orcamento` + `orcamento_itens` e normalizar o payload.
**Where**: `connector-local/src/topgerente.ts`
**Depends on**: None
**Reuses**: `mysql2` e schema em `docs/legado/`.
**Requirement**: INTG-02, INTG-03, INTG-22

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `integracao-top-gerente`, `seguranca-3e`

**Done when**:

- [ ] Join `orcamento` + `orcamento_itens` parametrizado por `Emp`/`Orc`
- [ ] Itens com `cancelado = 'S'` são excluídos
- [ ] Pedido inexistente retorna `not_found`
- [ ] Test count: 7 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(conector): consulta e normaliza pedido do top gerente`

---

#### T16: Handler `/jobs/import-order` do conector

**What**: Implementar autenticação, consulta e callback no handler do conector.
**Where**: `connector-local/src/index.ts`
**Depends on**: T15
**Reuses**: Esqueleto existente em `connector-local/src/index.ts`.
**Requirement**: INTG-02, INTG-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `integracao-top-gerente`, `seguranca-3e`

**Done when**:

- [ ] Token inválido responde `401`
- [ ] Corpo inválido responde `400`
- [ ] Sucesso dispara o callback autenticado e responde `202`
- [ ] Test count: 6 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(conector): handler de importacao com callback`

---

### Phase 6: Config

#### T17: Variáveis de ambiente e documentação

**What**: Documentar as variáveis novas em `.env.example` e no README do conector.
**Where**: `.env.example`
**Depends on**: None
**Reuses**: `.env.example` existente.
**Requirement**: INTG-05

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `seguranca-3e`

**Done when**:

- [ ] `APP_INTERNAL_TOKEN` documentado
- [ ] `LOCAL_CONNECTOR_BASE_URL`, `LOCAL_CONNECTOR_TOKEN`, `CONNECTOR_CALLBACK_TOKEN` mantidos
- [ ] Nenhuma credencial do Top Gerente no `.env.example`
- [ ] Gate check passa: `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `docs(config): documenta variaveis da integracao`

---

## Phase Execution Map

Phases run in sequence; tasks within a phase run in order.

```
Phase 1: T1
Phase 1: T2
Phase 1: T3
Phase 2: T4
Phase 2: T5
Phase 2: T6 -> T7
Phase 2: T8
Phase 3: T9
Phase 3: T10
Phase 3: T11
Phase 4: T12
Phase 4: T13
Phase 4: T14
Phase 5: T15 -> T16
Phase 6: T17
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: schema | 1 arquivo de schema | ✅ Granular |
| T2: guarda de token | 1 função | ✅ Granular |
| T3: contratos e portas | 1 arquivo, coeso | ✅ Granular |
| T4: solicitarImportacao | 1 caso de uso | ✅ Granular |
| T5: consultarStatus | 1 caso de uso | ✅ Granular |
| T6: importarPedido | 1 caso de uso | ✅ Granular |
| T7: processarCallback | 1 caso de uso | ✅ Granular |
| T8: reprocessar | 1 caso de uso | ✅ Granular |
| T9: repo integração | 1 adapter | ✅ Granular |
| T10: repo pedidos | 1 adapter | ✅ Granular |
| T11: adapter HTTP | 1 adapter | ✅ Granular |
| T12: POST pedidos | 1 rota | ✅ Granular |
| T13: GET status | 1 rota | ✅ Granular |
| T14: POST callback | 1 rota | ✅ Granular |
| T15: consulta legado | 1 arquivo, coeso | ✅ Granular |
| T16: handler conector | 1 handler | ✅ Granular |
| T17: env/docs | 1 arquivo | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T4 | T3 | (sem seta intra-fase) | ✅ Match |
| T5 | T3 | (sem seta intra-fase) | ✅ Match |
| T6 | None | (sem seta) | ✅ Match |
| T7 | T3, T6 | T6 -> T7 | ✅ Match |
| T8 | T3 | (sem seta intra-fase) | ✅ Match |
| T9 | T3 | (sem seta intra-fase) | ✅ Match |
| T10 | T6 | (sem seta intra-fase) | ✅ Match |
| T11 | T3, T2 | (sem seta intra-fase) | ✅ Match |
| T12 | T4, T9, T11, T2 | (sem seta intra-fase) | ✅ Match |
| T13 | T5, T9, T2 | (sem seta intra-fase) | ✅ Match |
| T14 | T7, T9, T10, T2 | (sem seta intra-fase) | ✅ Match |
| T15 | None | (sem seta) | ✅ Match |
| T16 | T15 | T15 -> T16 | ✅ Match |
| T17 | None | (sem seta) | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1: schema | Entity / schema | none | none | ✅ OK |
| T2: guarda de token | Shared utility | unit | unit | ✅ OK |
| T3: contratos | Domain | unit | unit | ✅ OK |
| T4: solicitarImportacao | Domain | unit | unit | ✅ OK |
| T5: consultarStatus | Domain | unit | unit | ✅ OK |
| T6: importarPedido | Domain | unit | unit | ✅ OK |
| T7: processarCallback | Domain | unit | unit | ✅ OK |
| T8: reprocessar | Domain | unit | unit | ✅ OK |
| T9: repo integração | Repository adapter | none | none | ✅ OK |
| T10: repo pedidos | Repository adapter | none | none | ✅ OK |
| T11: adapter HTTP | Domain / adapter | unit | unit | ✅ OK |
| T12: POST pedidos | Route handler | integration | integration | ✅ OK |
| T13: GET status | Route handler | integration | integration | ✅ OK |
| T14: POST callback | Route handler | integration | integration | ✅ OK |
| T15: consulta legado | Connector logic | unit | unit | ✅ OK |
| T16: handler conector | Connector logic | unit | unit | ✅ OK |
| T17: env/docs | Config | none | none | ✅ OK |

---

## Task Verification Standards

Every task follows `Done when` + `Tests` + `Gate`. Each `Done when` entry is specific, binary, and references the gate command. Test counts prevent silent deletions.
