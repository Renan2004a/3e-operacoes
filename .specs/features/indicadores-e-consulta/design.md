# Indicadores e Consulta — Design

**Spec**: `.specs/features/indicadores-e-consulta/spec.md`
**Status**: Draft

---

## Architecture Overview

Domínio novo em `src/modules/indicadores/` (consulta de pedidos, painel, PCP) com porta `IndicadoresRepository` e adapter Prisma. Tudo somente leitura; reusa o cálculo de saldo da expedição.

```mermaid
graph TD
    VE[Vendedor] -->|GET /api/pedidos| CP[Consulta de pedidos]
    GE[Gerente] -->|GET /api/pedidos/:id| DE[Detalhe do pedido]
    GE -->|GET /api/indicadores| PA[Painel + PCP]
    CP --> DI[Domínio indicadores]
    DE --> DI
    PA --> DI
    DI --> DB[(MySQL do app)]
```

---

## Code Reuse Analysis

| Component | Location | How to Use |
| --- | --- | --- |
| Saldo do pedido | `src/modules/expedicao/saldo-pedido.ts` | Reusar no detalhe. |
| Contexto de auth | `src/shared/http/autorizacao.ts` | Proteger as rotas (`consultar_pedidos`). |
| Cliente Prisma | `src/shared/db/prisma.ts` | Repositório. |
| Schema Prisma | `prisma/schema.prisma` | `Order`, `OrderItem`, `Activity`, `Execution`, `Sector`. |

---

## Components

### `consulta-pedidos`

- **Purpose**: Listar pedidos com filtros e detalhar um pedido.
- **Location**: `src/modules/indicadores/consulta-pedidos.ts`
- **Interfaces**: `listarPedidos({ numero?, cliente?, setor?, status?, de?, ate?, limite, offset })` devolve `{ pedidos, paginacao }`; `detalharPedido(orderId)`; porta `IndicadoresRepository`.
- **A1 (paginação)**: o domínio normaliza `limite` (1..100, padrão 20) e `offset` (≥ 0), delega filtros/ordenação/paginação ao repositório e calcula `pagina`/`totalPaginas`. O status exibido continua derivado por `statusDoPedido`. Nenhum pedido é carregado fora da página.
- **A1 (filtros)**: `src/modules/indicadores/adapters/filtros-pedidos-prisma.ts` traduz os filtros para `Prisma.OrderWhereInput` com `some`/`every`/`NOT` (EXISTS, sem duplicar pedidos com vários setores), escapa `%` e `_` e reproduz exatamente os critérios atuais de status.
- **A1 (consulta)**: o adapter usa `prisma.$transaction([findMany, count])` com `orderBy: [{ createdAt: 'desc' }, { id: 'asc' }]`, `skip` e `take`, garantindo total e página no mesmo snapshot.

### `painel`

- **Purpose**: Contagem de atividades por setor/status e pendências.
- **Location**: `src/modules/indicadores/painel.ts`
- **Interfaces**: `montarPainel()`.

### `pcp`

- **Purpose**: Produção por setor e cumprimento de prazo.
- **Location**: `src/modules/indicadores/pcp.ts`
- **Interfaces**: `montarPcp(agora)`.

### Adapter e rotas

- `src/modules/indicadores/adapters/prisma-indicadores-repository.ts`.
- `src/app/api/pedidos/route.ts` — `GET`.
- `src/app/api/pedidos/[orderId]/route.ts` — `GET`.
- `src/app/api/indicadores/route.ts` — `GET`.

---

## Data Models

Sem mudança de schema. Leitura de `Order`, `OrderItem`, `Activity`, `Execution`, `Sector`.

Indicadores: produção por setor = soma de `Execution.quantity`; cumprimento de prazo = concluídas dentro do prazo ÷ concluídas com prazo.

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| --- | --- | --- |
| Pedido inexistente | `404` | Não encontrado. |
| Sem sessão | `401` | Precisa logar. |
| Filtro inválido | `400` | Validação. |

---

## Risks & Concerns

| Concern | Location | Impact | Mitigation |
| --- | --- | --- | --- |
| Consultas pesadas | `Order`/`Activity` | Lentidão | Paginação no banco; sem índice novo nesta etapa (D6). |
| Deslocamento entre páginas | Importação concorrente | Pedido pode migrar de página | Voltar à página 1 após importar; ordenação determinística (D5). |
| Indicador de prazo ambíguo | `Activity` | Número enganoso | Contar só atividades com prazo. |
| Vendedor com escrita | rotas | Violação de permissão | Rotas são só `GET`. |

---

## Tech Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Somente leitura | Rotas `GET` | RF008; vendedor só consulta. |
| Paginação | Limite/offset no banco + `total` | Consulta previsível, sem carregar todos os pedidos (A1). |
| Ordenação | `createdAt` desc, `id` asc | Determinística entre páginas (A1). |
| Filtro de status | Tradução SQL de `statusDoPedido` com `every`/`NOT` | Filtra antes de paginar sem persistir status (A1, D7). |
| Busca | `contains` com `%`/`_` escapados | Parcial, literal e case-insensitive pela collation (A1, D3/D4). |
| Indicadores | Só banco do app | Não sobrecarregar o legado. |
| Cumprimento de prazo | Só atividades com prazo | RN de prazos. |
