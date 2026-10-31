import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/shared/db/prisma'
import type {
  DivergenciaUnidade,
  OrderSnapshot,
  PedidosRepository,
} from '../importar-pedido'
import { avaliarMudancaUnidade } from '../mudanca-unidade'
import { chaveUnidade } from '../../producao/totais-por-unidade'

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
            executions: true,
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
        executedQuantity: sumDecimal(item.executions.map((execution) => execution.quantity)),
        deliveredQuantity: sumDecimal(item.deliveries.map((delivery) => delivery.quantity)),
      })),
    }
  },

  async upsertOrder(input) {
    const now = new Date()

    // Pedido, itens e auditoria na mesma transação: uma falha inesperada não
    // deixa o pedido ou parte dos itens atualizados sem resultado explícito.
    return prisma.$transaction(
      async (tx) => {
        const order = await tx.order.upsert({
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

        const existentes = await tx.orderItem.findMany({
          where: {
            orderId: order.id,
            legacyItemKey: { in: input.items.map((item) => item.legacyItemKey) },
          },
          select: {
            id: true,
            legacyItemKey: true,
            description: true,
            unit: true,
            requestedQuantity: true,
            sectorId: true,
            status: true,
            executions: { select: { id: true } },
            occurrences: { select: { id: true } },
            _count: { select: { deliveries: true, scheduledDeliveries: true } },
          },
        })
        const porChave = new Map(existentes.map((item) => [item.legacyItemKey, item]))
        const divergenciasUnidade: DivergenciaUnidade[] = []

        async function registrarDivergencia(
          existente: (typeof existentes)[number],
          item: (typeof input.items)[number],
        ) {
          divergenciasUnidade.push({
            legacyItemKey: existente.legacyItemKey,
            description: item.description ?? existente.description,
            unidadeAnterior: existente.unit,
            unidadeNova: item.unit,
            motivo: 'REGISTROS_OPERACIONAIS',
          })
          await tx.auditLog.create({
            data: {
              action: 'UNIT_DIVERGENCE',
              entityType: 'OrderItem',
              entityId: `${input.legacyOrderKey}:${existente.legacyItemKey}`,
              beforeJson: {
                unit: existente.unit,
                requestedQuantity: existente.requestedQuantity.toString(),
              },
              afterJson: {
                unit: item.unit,
                requestedQuantity: item.requestedQuantity,
                motivo: 'REGISTROS_OPERACIONAIS',
              },
              reason: 'Mudança de unidade bloqueada por registros operacionais',
            },
          })
        }

        for (const item of input.items) {
          const existente = porChave.get(item.legacyItemKey)
          if (!existente) {
            await tx.orderItem.create({
              data: {
                orderId: order.id,
                legacyItemKey: item.legacyItemKey,
                productCode: item.productCode,
                description: item.description,
                unit: item.unit,
                requestedQuantity: item.requestedQuantity,
                legacyCategory: item.legacyCategory,
                status: 'PENDING',
              },
            })
            continue
          }

          const decisao = avaliarMudancaUnidade({
            unidadeAtual: existente.unit,
            unidadeNova: item.unit,
            registros: {
              // A "atividade" agora é o próprio item: um item classificado
              // equivale a uma atividade no setor; sem setor, não há atividade.
              atividades: existente.sectorId
                ? [
                    {
                      status: existente.status,
                      execucoes: existente.executions.length,
                      ocorrencias: existente.occurrences.length,
                    },
                  ]
                : [],
              entregas: existente._count.deliveries,
              remessas: existente._count.scheduledDeliveries,
            },
          })

          if (decisao.tipo === 'BLOQUEAR') {
            await registrarDivergencia(existente, item)
            continue
          }

          const dados = {
            productCode: item.productCode,
            description: item.description,
            // Em SEM_MUDANCA, não reescreve a unidade: apenas diferença de
            // escrita não deve reverter uma alteração concorrente.
            ...(decisao.tipo === 'ATUALIZAR' ? { unit: item.unit } : {}),
            requestedQuantity: item.requestedQuantity,
            legacyCategory: item.legacyCategory,
          }

          if (decisao.tipo === 'ATUALIZAR') {
            // Condição atômica: se uma execução/ocorrência/entrega/atividade
            // iniciada surgir entre a leitura e a gravação, a unidade não muda.
            const atualizados = await tx.orderItem.updateMany({
              where: {
                id: existente.id,
                unit: existente.unit,
                deliveries: { none: {} },
                scheduledDeliveries: { none: {} },
                executions: { none: {} },
                occurrences: { none: {} },
                OR: [{ sectorId: null }, { status: 'PENDING' }],
              },
              data: dados,
            })
            if (atualizados.count !== 1) {
              const atual = await tx.orderItem.findUnique({
                where: { id: existente.id },
                select: { unit: true },
              })
              // Outra execução pode ter aplicado a mesma unidade (ou removido
              // o item); nesses casos não há divergência a apresentar.
              if (atual && chaveUnidade(atual.unit) !== chaveUnidade(item.unit)) {
                await registrarDivergencia(existente, item)
              }
            }
            continue
          }

          await tx.orderItem.update({ where: { id: existente.id }, data: dados })
        }

        return { orderId: order.id, divergenciasUnidade }
      },
      { timeout: 30000, maxWait: 10000 },
    )
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
