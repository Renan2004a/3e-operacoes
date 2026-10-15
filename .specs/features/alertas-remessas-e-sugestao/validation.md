# Alertas, Remessas e Sugestão de Setor — Validation

**Spec**: `.specs/features/alertas-remessas-e-sugestao/spec.md`
**Date**: 2026-10-15
**Verifier**: autor + evidência de execução (código, testes, banco real)

---

## Gates executados

| Gate | Comando | Resultado |
| --- | --- | --- |
| Lint | `npm run lint` | 0 erros (5 avisos pré-existentes) |
| Typecheck | `npm run typecheck` | OK |
| Testes | `npm test` | **694 passam**, 96 arquivos, 0 falhas |
| Build | `npm run build` | OK (rotas novas listadas) |
| Migration | `prisma migrate dev` | `20261015193341_alertas_remessas_regras` aplicada |
| Seed | `npm run prisma:seed` | 14 regras produto→setor gravadas |

## Testes novos/ajustados (42)

| Arquivo | Foco |
| --- | --- |
| `src/modules/indicadores/alertas.test.ts` | atrasado/parado/não encaminhado, limiar, acúmulo |
| `src/modules/expedicao/remessas.test.ts` | programar/confirmar/remover, duplicidade, validação |
| `src/modules/setores/sugerir-setor.test.ts` | CONTAINS/PREFIX, prioridade, sem correspondência |
| `src/app/api/indicadores/alertas/route.test.ts` | 200 com grupos, 401 |
| `src/app/api/pedidos/itens/[itemId]/remessas/route.test.ts` | 201/409/400/403/401 |
| `src/app/api/pedidos/remessas/[id]/route.test.ts` | PATCH 200/404/403, DELETE 204/404 |
| `src/app/(app)/gerente/painel/page.test.tsx` | card de alertas + fetch por rota |

## Evidência contra o banco AWS real

Sessão de vendedor (`vendedor@3e.local`), servidor local:

```
login vendedor OK
alertas status: 200
  atrasados=0 parados=1 naoEncaminhados=52
pedidos status: 200
  total pedidos: 7
  primeiro pedido: 82250
detalhe status: 200
  itens: 8
  item1: Painel sob medida | setor=null | suggestedSectorId=...REVENDA | remessas=0
  programar remessa status: 201
  confirmar status: 200 "2026-10-15T20:07:54.564Z"
  remessas no detalhe: [{"remessa":1,"scheduledAt":"2026-12-01T00:00:00.000Z","confirmedAt":"2026-10-15T20:07:54.564Z"}]
  remover status: 204
```

- **Sugestão**: "Painel sob medida" → REVENDA (regra `painel`), como esperado.
- **Remessa**: ciclo programar → confirmar → aparece no detalhe → remover, tudo persistido.
- **Alertas**: 52 itens não encaminhados e 1 parado refletem o estado real do banco importado.

## Requisitos cobertos

| ID | Evidência |
| --- | --- |
| IND-11 | `alertas.ts` + card no painel + `alertas.test.ts` + `page.test.tsx` |
| IND-12 | `route.ts` + `route.test.ts` |
| ENT-01/02/03 | `remessas.ts` + `prisma-remessa-repository.ts` + rotas + testes |
| ENT-04 | `pedido-detalhe.tsx` (seção de remessa) + `detalhe` com `remessas` |
| ENT-05 | `programar_remessa` em `permissoes.ts` + testes 403 |
| LAC-14 | `sugerir-setor.ts` + seed + `suggestedSectorId` no detalhe |
| LAC-15 | pré-seleção no desmembramento em `pedido-detalhe.tsx` |

## Lacunas remanescentes

- Tela de administração das regras produto→setor (edição em runtime).
- Vínculo automático remessa ↔ entrega registrada na expedição.
- E2E autenticado com banco real (Playwright) para as novas telas.
