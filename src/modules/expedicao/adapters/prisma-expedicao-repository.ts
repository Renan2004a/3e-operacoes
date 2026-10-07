import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/shared/db/prisma'
import type {
  EntregaHistorico,
  HistoricoEntregasRepository,
} from '../historico-entregas'
import type {
  Entrega,
  EntregaRepository,
  ItemParaEntrega,
  PapelUsuario,
  RegistrarEntregaPortResult,
} from '../registrar-entrega'
import type { ItemDoPedido, SaldoPedidoRepository } from '../saldo-pedido'

/** Porta única de expedição, composta pelas portas de cada caso de uso. */
export interface ExpedicaoRepository
  extends EntregaRepository,
    SaldoPedidoRepository,
    HistoricoEntregasRepository {}

interface EntregaRow {
  id: string
  orderItemId: string
  userId: string
  quantity: Prisma.Decimal
  managerOverride: boolean
  overrideReason: string | null
  authorizedByUserId: string | null
  availableBefore: Prisma.Decimal | null
  occurredAt: Date
}

interface EntregaHistoricoRow {
  id: string
  quantity: Prisma.Decimal
  userId: string
  occurredAt: Date
  managerOverride: boolean
  recordedBy: { name: string }
}

interface ItemComQuantidadesRow {
  id: string
  unit: string
  requestedQuantity: Prisma.Decimal
  activities: { executions: { quantity: Prisma.Decimal }[] }[]
  deliveries: { quantity: Prisma.Decimal }[]
}

const INCLUDE_ITEM_QUANTIDADES = {
  activities: { select: { executions: { select: { quantity: true } } } },
  deliveries: { select: { quantity: true } },
} as const

function somar(quantidades: Prisma.Decimal[]): Prisma.Decimal {
  return quantidades.reduce((total, valor) => total.plus(valor), new Prisma.Decimal(0))
}

function executadoDoItem(row: Pick<ItemComQuantidadesRow, 'activities'>): Prisma.Decimal {
  return somar(row.activities.flatMap((activity) => activity.executions.map((execution) => execution.quantity)))
}

function entregueDoItem(row: Pick<ItemComQuantidadesRow, 'deliveries'>): Prisma.Decimal {
  return somar(row.deliveries.map((delivery) => delivery.quantity))
}

function toEntrega(row: EntregaRow): Entrega {
  return {
    id: row.id,
    orderItemId: row.orderItemId,
    userId: row.userId,
    quantidade: row.quantity,
    managerOverride: row.managerOverride,
    overrideReason: row.overrideReason,
    authorizedByUserId: row.authorizedByUserId,
    availableBefore: row.availableBefore,
    occurredAt: row.occurredAt,
  }
}

function toEntregaHistorico(row: EntregaHistoricoRow): EntregaHistorico {
  return {
    id: row.id,
    quantidade: row.quantity,
    usuarioId: row.userId,
    usuarioNome: row.recordedBy.name,
    occurredAt: row.occurredAt,
    excecao: row.managerOverride,
  }
}

/** Implementação Prisma da porta `ExpedicaoRepository`. */
export const prismaExpedicaoRepository: ExpedicaoRepository = {
  async buscarItemParaEntrega(itemId): Promise<ItemParaEntrega | null> {
    const row = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: INCLUDE_ITEM_QUANTIDADES,
    })
    if (!row) return null
    return {
      id: row.id,
      unidade: row.unit,
      executado: executadoDoItem(row),
      entregue: entregueDoItem(row),
    }
  },

  async papeisDoUsuario(usuarioId): Promise<PapelUsuario[]> {
    const rows = await prisma.userRole.findMany({
      where: { userId: usuarioId },
      select: { role: true },
    })
    return rows.map((row) => row.role as PapelUsuario)
  },

  async registrarEntrega(input): Promise<RegistrarEntregaPortResult> {
    return prisma.$transaction(async (tx) => {
      const entregaRow = await tx.delivery.create({
        data: {
          orderItemId: input.itemId,
          userId: input.usuarioId,
          quantity: input.quantidade,
          managerOverride: input.managerOverride,
          overrideReason: input.overrideReason,
          authorizedByUserId: input.authorizedByUserId,
          availableBefore: input.availableBefore,
          occurredAt: input.occurredAt,
        },
      })

      if (input.auditoria) {
        await tx.auditLog.create({
          data: {
            userId: input.auditoria.gerenteId,
            action: 'DELIVERY_MANAGER_OVERRIDE',
            entityType: 'OrderItem',
            entityId: input.itemId,
            beforeJson: { availableBefore: input.auditoria.disponivelAntes.toString() },
            afterJson: {
              deliveryId: entregaRow.id,
              quantity: input.auditoria.quantidade.toString(),
              managerOverride: true,
            },
            reason: input.overrideReason,
            createdAt: input.auditoria.occurredAt,
          },
        })
      }

      const agregado = await tx.delivery.aggregate({
        where: { orderItemId: input.itemId },
        _sum: { quantity: true },
      })
      const entregueTotal = agregado._sum.quantity ?? new Prisma.Decimal(0)
      const status = input.resolverStatus(entregueTotal)
      return { entrega: toEntrega(entregaRow), entregueTotal, status }
    })
  },

  async buscarItensDoPedido(orderId): Promise<ItemDoPedido[] | null> {
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true } })
    if (!order) return null
    const rows = await prisma.orderItem.findMany({
      where: { orderId },
      include: INCLUDE_ITEM_QUANTIDADES,
      orderBy: { createdAt: 'asc' },
    })
    return rows.map((row) => ({
      id: row.id,
      solicitado: row.requestedQuantity,
      executado: executadoDoItem(row),
      entregue: entregueDoItem(row),
    }))
  },

  async buscarItemParaHistorico(itemId) {
    const row = await prisma.orderItem.findUnique({ where: { id: itemId }, select: { id: true } })
    return row ? { id: row.id } : null
  },

  async listarEntregas(itemId): Promise<EntregaHistorico[]> {
    const rows = await prisma.delivery.findMany({
      where: { orderItemId: itemId },
      include: { recordedBy: { select: { name: true } } },
      orderBy: { occurredAt: 'asc' },
    })
    return rows.map(toEntregaHistorico)
  },
}
