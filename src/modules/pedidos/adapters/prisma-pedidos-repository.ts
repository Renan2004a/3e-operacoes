import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/shared/db/prisma'
import type { OrderSnapshot, PedidosRepository } from '../importar-pedido'

function sumDecimal(values: Prisma.Decimal[]): string {
  return values.reduce((total, value) => total.plus(value), new Prisma.Decimal(0)).toString()
}

/** Implementação Prisma da porta `PedidosRepository`. */
export const prismaPedidosRepository: PedidosRepository = {
  async findOrderByLegacyKey(legacyOrderKey): Promise<OrderSnapshot | null> {
    const order = await prisma.order.findUnique({
      where: { legacyOrderKey },
      include: {
        items: {
          include: {
            activities: { include: { executions: true } },
            deliveries: true,
          },
        },
      },
    })
    if (!order) return null

    return {
      orderId: order.id,
      items: order.items.map((item) => ({
        legacyItemKey: item.legacyItemKey,
        requestedQuantity: item.requestedQuantity.toString(),
        executedQuantity: sumDecimal(item.activities.flatMap((activity) => activity.executions.map((execution) => execution.quantity))),
        deliveredQuantity: sumDecimal(item.deliveries.map((delivery) => delivery.quantity)),
      })),
    }
  },

  async upsertOrder(input) {
    const now = new Date()

    // O pedido é gravado primeiro (fora da transação) para satisfazer a chave
    // estrangeira dos itens; em seguida os itens são gravados em uma transação
    // em lote. Evita o timeout da transação interativa em bancos com latência.
    const order = await prisma.order.upsert({
      where: { legacyOrderKey: input.legacyOrderKey },
      create: {
        legacyOrderKey: input.legacyOrderKey,
        legacyNumber: input.legacyNumber,
        customerName: input.customerName,
        sellerLegacyCode: input.sellerLegacyCode,
        sourceUpdatedAt: input.sourceUpdatedAt,
        lastSyncedAt: now,
      },
      update: {
        legacyNumber: input.legacyNumber,
        customerName: input.customerName,
        sellerLegacyCode: input.sellerLegacyCode,
        sourceUpdatedAt: input.sourceUpdatedAt,
        lastSyncedAt: now,
      },
    })

    await prisma.$transaction(
      input.items.map((item) =>
        prisma.orderItem.upsert({
          where: {
            orderId_legacyItemKey: { orderId: order.id, legacyItemKey: item.legacyItemKey },
          },
          create: {
            orderId: order.id,
            legacyItemKey: item.legacyItemKey,
            productCode: item.productCode,
            description: item.description,
            unit: item.unit,
            requestedQuantity: item.requestedQuantity,
            legacyCategory: item.legacyCategory,
            classificationStatus: 'PENDING_CLASSIFICATION',
          },
          update: {
            productCode: item.productCode,
            description: item.description,
            unit: item.unit,
            requestedQuantity: item.requestedQuantity,
            legacyCategory: item.legacyCategory,
          },
        }),
      ),
      { timeout: 30000, maxWait: 10000 },
    )

    return { orderId: order.id }
  },

  async registrarDivergencia({ legacyOrderKey, divergencia }) {
    await prisma.auditLog.create({
      data: {
        action: 'QUANTITY_DIVERGENCE',
        entityType: 'OrderItem',
        entityId: `${legacyOrderKey}:${divergencia.legacyItemKey}`,
        beforeJson: {
          executedQuantity: divergencia.executedQuantity,
          deliveredQuantity: divergencia.deliveredQuantity,
        },
        afterJson: { requestedQuantity: divergencia.requestedQuantity },
        reason: 'Nova quantidade solicitada menor que o executado ou entregue',
      },
    })
  },
}
