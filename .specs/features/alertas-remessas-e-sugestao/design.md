# Alertas, Remessas e Sugestão de Setor — Design

**Spec**: `.specs/features/alertas-remessas-e-sugestao/spec.md`
**Status**: Implemented

---

## Arquitetura

Domínio puro + porta (interface) + adapter Prisma, como no restante do projeto (AD-002). Rotas finas: autorizam, validam a entrada e delegam ao domínio.

```
UI (painel / pedido-detalhe)
  └─ HTTP
       ├─ GET  /api/indicadores/alertas        → listarAlertas → AlertasRepository
       ├─ POST /api/pedidos/itens/:id/remessas → programarRemessa → RemessaRepository
       ├─ PATCH/DELETE /api/pedidos/remessas/:id → confirmar/removerRemessa → RemessaRepository
       └─ GET  /api/pedidos/:id                 → detalharPedido (inclui sugestão + remessas)
```

## Modelo de dados (Prisma)

- `ScheduledDelivery` (Remessa): `orderItemId`, `remessa` (int), `scheduledAt`, `confirmedAt?`, `note?`.
  - `@@unique([orderItemId, remessa])` impede número repetido no mesmo item.
- `ProductSectorRule`: `matchType` (`CONTAINS`/`PREFIX`), `matchValue`, `sectorId`, `priority`, `active`.
  - Avaliadas por prioridade decrescente.

Migration: `prisma/migrations/20261015193341_alertas_remessas_regras`.

## Domínio

### Alertas (`src/modules/indicadores/alertas.ts`)

`montarAlertas(itens, agora, diasParado)` classifica cada item em **um** grupo primário:

- **Não encaminhado**: `classificationStatus = PENDING_CLASSIFICATION` **ou** sem atividade.
- Caso contrário, se não concluída:
  - **Atrasado**: `deadlineAt < agora`.
  - **Parado**: `(lastExecutionAt ?? activityCreatedAt) < agora − diasParado`.
- Um item não concluído pode ser atrasado **e** parado.

`diasParado` vem de `ALERTA_PARADO_DIAS` (padrão `5`, `DIAS_PARADO_PADRAO`).

### Remessas (`src/modules/expedicao/remessas.ts`)

- `programarRemessa`: valida número inteiro positivo e data; rejeita duplicidade (`RemessaDuplicadaError`).
- `interpretarDataPrevista`: ancora datas "somente dia" (`YYYY-MM-DD`) ao meio-dia de São Paulo, evitando que a data "volte um dia" ao exibir em `America/Sao_Paulo`.
- `confirmarRemessa`: marca `confirmedAt`; erro se não existir.
- `removerRemessa`: remove; erro se não existir.

### Sugestão de setor (`src/modules/setores/sugerir-setor.ts`)

`sugerirSetor({ productCode, description }, regras)`: casa `CONTAINS`/`PREFIX` sobre código e descrição, por prioridade. Retorna `sectorId` ou `null`. É apenas sugestão.

## Integração no detalhe do pedido

`detalharPedido` (consulta-pedidos) passou a:
- carregar as regras (`listarRegrasProdutoSetor`) e calcular `suggestedSectorId` **apenas** para itens não classificados;
- incluir `remessas` de cada item.

## Permissões

- `consultar_pedidos`: acessa os alertas (todos os perfis autenticados).
- `programar_remessa` (nova): `PRODUCTION_MANAGER` e `SELLER` (vendedor programa remessa, alinhado ao papel).

## Seed

`prisma/seed.ts` semeia 14 regras produto→setor (telha→Telhas, perfil/chapa/dobra→Corte e Dobra, insumos→Revenda), idempotentes.

## Frontend

- **Painel do gerente**: card "Alertas operacionais" com três colunas, contagem e links para o pedido.
- **Detalhe do pedido**: por item, seção "Entrega programada (remessa)" (programar/confirmar/remover) e pré-seleção do setor sugerido no desmembramento.
