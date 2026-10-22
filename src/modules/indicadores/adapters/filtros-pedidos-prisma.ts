import { Prisma } from '@/generated/prisma/client'
import type { StatusPedido } from '../consulta-pedidos'
import type { FiltrosPedido } from '../consulta-pedidos'

/**
 * Escapa os curingas do `LIKE` para que `%` e `_` sejam tratados como texto
 * literal na pesquisa (A1, D4). A barra invertida é o caractere de escape
 * padrão do MySQL.
 */
export function escaparCuringasLike(valor: string): string {
  return valor.replace(/[\\%_]/g, (caractere) => `\\${caractere}`)
}

/**
 * Condição do status derivado (IND-01, A1, D7). Reproduz exatamente
 * `statusDoPedido`, sem incorporar regras pendentes da AD-013:
 * - PENDING: sem atividades ou todas PENDING;
 * - COMPLETED: existe ao menos uma atividade e todas COMPLETED;
 * - IN_PROGRESS: qualquer outro caso, inclusive PAUSED e DIVERGENT.
 */
function whereDoStatus(status: StatusPedido): Prisma.OrderWhereInput {
  const todasPendentes: Prisma.OrderWhereInput = {
    items: { every: { activities: { every: { status: 'PENDING' } } } },
  }
  const todasConcluidas: Prisma.OrderWhereInput = {
    AND: [
      { items: { some: { activities: { some: {} } } } },
      { items: { every: { activities: { every: { status: 'COMPLETED' } } } } },
    ],
  }

  switch (status) {
    case 'PENDING':
      return todasPendentes
    case 'COMPLETED':
      return todasConcluidas
    case 'IN_PROGRESS':
      return { AND: [{ NOT: todasPendentes }, { NOT: todasConcluidas }] }
  }
}

/**
 * Traduz os filtros da consulta de pedidos para o `where` do Prisma, com
 * relation filters (`some`/`every`/`NOT`), que geram `EXISTS`/`NOT EXISTS` e
 * não duplicam pedidos com vários setores (A1). O filtro de setor continua
 * sendo o código (`SectorCode`) da AD-018 e o período continua sobre
 * `createdAt` (AD-014).
 */
export function montarWherePedidos(criterios: FiltrosPedido): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {}

  const numero = criterios.numero?.trim()
  if (numero) where.legacyNumber = { contains: escaparCuringasLike(numero) }

  const cliente = criterios.cliente?.trim()
  if (cliente) where.customerName = { contains: escaparCuringasLike(cliente) }

  if (criterios.setor) {
    where.items = { some: { activities: { some: { sector: { code: criterios.setor } } } } }
  }

  if (criterios.de && criterios.ate) {
    where.createdAt = { gte: criterios.de, lt: criterios.ate }
  } else if (criterios.de) {
    where.createdAt = { gte: criterios.de }
  } else if (criterios.ate) {
    where.createdAt = { lt: criterios.ate }
  }

  if (!criterios.status) return where

  const status = whereDoStatus(criterios.status)
  return Object.keys(where).length === 0 ? status : { AND: [where, status] }
}
