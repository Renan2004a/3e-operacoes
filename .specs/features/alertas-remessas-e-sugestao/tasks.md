# Alertas, Remessas e Sugestão de Setor — Tasks

**Design**: `.specs/features/alertas-remessas-e-sugestao/design.md`
**Status**: Done

---

## Test Coverage Matrix

| Code Layer | Required Test Type | Location Pattern | Run Command |
| --- | --- | --- | --- |
| Domain (`src/modules/**`) | unit | `src/modules/**/*.test.ts` | `npm test` |
| Route handler (`src/app/api/**`) | integration | `src/app/api/**/*.test.ts` | `npm test` |
| Page (`src/app/(app)/**`) | unit (Testing Library + jsdom) | `src/**/*.test.tsx` | `npm test` |

## Gate Check Commands

| Gate | Command |
| --- | --- |
| Full | `npm run lint && npm run typecheck && npm test` |
| Build | `npm run build` |

---

## Execution Plan

```
T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8
```

---

## Task Breakdown

#### T1: Modelos Prisma (remessa e regra produto→setor)

**Where**: `prisma/schema.prisma`, `prisma/migrations/**`
**Requirement**: ENT-01, LAC-14
**Done when**:

- [x] `ScheduledDelivery` com `@@unique([orderItemId, remessa])`
- [x] `ProductSectorRule` com `matchType`, `matchValue`, `priority`, `active`
- [x] Migration aplicada; cliente regenerado

#### T2: Domínio de remessas

**Where**: `src/modules/expedicao/remessas.ts`
**Requirement**: ENT-01, ENT-02, ENT-03
**Done when**:

- [x] `programarRemessa` valida e rejeita duplicidade
- [x] `confirmarRemessa` e `removerRemessa` com erro de não encontrado
- [x] 8 testes unitários passam

#### T3: Adapter Prisma de remessas

**Where**: `src/modules/expedicao/adapters/prisma-remessa-repository.ts`
**Requirement**: ENT-01, ENT-02, ENT-03

#### T4: Domínio de alertas

**Where**: `src/modules/indicadores/alertas.ts`
**Requirement**: IND-11
**Done when**:

- [x] Atrasados, parados e não encaminhados classificados
- [x] Limiar de "parado" configurável (`ALERTA_PARADO_DIAS`)
- [x] 8 testes unitários passam

#### T5: Endpoint de alertas + adapter

**Where**: `src/app/api/indicadores/alertas/route.ts`, `prisma-indicadores-repository.ts`
**Requirement**: IND-11, IND-12
**Done when**:

- [x] 200 com os três grupos; 401 sem sessão
- [x] 2 testes de rota passam

#### T6: Endpoints de remessa

**Where**: `src/app/api/pedidos/itens/[itemId]/remessas/route.ts`, `src/app/api/pedidos/remessas/[id]/route.ts`
**Requirement**: ENT-01, ENT-02, ENT-03, ENT-05
**Done when**:

- [x] POST 201/409/400/403; PATCH 200/404/403; DELETE 204/404
- [x] 11 testes de rota passam

#### T7: Sugestão de setor no domínio e no detalhe

**Where**: `src/modules/setores/sugerir-setor.ts`, `consulta-pedidos.ts`, `prisma-indicadores-repository.ts`, `prisma/seed.ts`
**Requirement**: LAC-14
**Done when**:

- [x] `sugerirSetor` por prioridade; 4 testes unitários passam
- [x] `detalharPedido` inclui `suggestedSectorId` (só pendentes) e `remessas`
- [x] 14 regras semeadas no banco

#### T8: Frontend (alertas + remessas + pré-seleção)

**Where**: `src/app/(app)/gerente/painel/page.tsx`, `src/shared/ui/pedido-detalhe.tsx`
**Requirement**: IND-11, ENT-04, LAC-15
**Done when**:

- [x] Card "Alertas operacionais" com os três grupos
- [x] Seção de remessa por item (programar/confirmar/remover)
- [x] Setor sugerido pré-selecionado no desmembramento
- [x] Testes de painel passam

---

## Phase Execution Map

```
T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8
```

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | schema + migration | ✅ |
| T2 | 1 domínio | ✅ |
| T3 | 1 adapter | ✅ |
| T4 | 1 domínio | ✅ |
| T5 | 1 rota + adapter | ✅ |
| T6 | 2 rotas | ✅ |
| T7 | domínio + consulta + seed | ✅ |
| T8 | 2 telas | ✅ |
