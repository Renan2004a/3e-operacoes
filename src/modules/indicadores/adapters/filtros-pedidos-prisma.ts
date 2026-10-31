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

/** Item concluído: classificado (tem setor) e com situação COMPLETED. */
const ITEM_CONCLUIDO: Prisma.OrderItemWhereInput = {
  sectorId: { not: null },
  status: 'COMPLETED',
}

/**
 * Condição do status derivado (IND-01, A1, AD-013):
 * - PENDING: todos os itens com situação PENDING (inclui não classificado);
 * - COMPLETED: existe ao menos um item e todos estão concluídos;
 * - IN_PROGRESS: qualquer outro caso, inclusive PAUSED e DIVERGENT.
 */
function whereDoStatus(status: StatusPedido): Prisma.OrderWhereInput {
  const todosNaoIniciados: Prisma.OrderWhereInput = {
    items: { every: { status: 'PENDING' } },
  }
  const todosConcluidos: Prisma.OrderWhereInput = {
    items: { some: {}, every: ITEM_CONCLUIDO },
  }

  switch (status) {
    case 'PENDING':
      return todosNaoIniciados
    case 'COMPLETED':
      return todosConcluidos
    case 'IN_PROGRESS':
      return { AND: [{ NOT: todosNaoIniciados }, { NOT: todosConcluidos }] }
  }
}

/**
 * Traduz os filtros da consulta de pedidos para o `where` do Prisma.
 */
export function montarWherePedidos(criterios: FiltrosPedido): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {}

  const numero = criterios.numero?.trim()
  if (numero) where.legacyNumber = { contains: escaparCuringasLike(numero) }

  const cliente = criterios.cliente?.trim()
  if (cliente) where.customerName = { contains: escaparCuringasLike(cliente) }

  if (criterios.setor) {
    where.items = { some: { sector: { code: criterios.setor } } }
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
