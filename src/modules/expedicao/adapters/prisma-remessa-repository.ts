import { prisma } from '@/shared/db/prisma'
import type { RemessaRepository } from '../remessas'

/** Implementação Prisma da porta `RemessaRepository`. */
export const prismaRemessaRepository: RemessaRepository = {
  async listarPorItem(orderItemId) {
    return prisma.scheduledDelivery.findMany({
      where: { orderItemId },
      orderBy: { remessa: 'asc' },
    })
  },

  async listarPorPedido(orderId) {
    return prisma.scheduledDelivery.findMany({
      where: { orderItem: { orderId } },
      orderBy: [{ scheduledAt: 'asc' }, { remessa: 'asc' }],
    })
  },

  async buscar(id) {
    return prisma.scheduledDelivery.findUnique({ where: { id } })
  },

  async buscarPorNumero(orderItemId, remessa) {
    return prisma.scheduledDelivery.findUnique({
      where: { orderItemId_remessa: { orderItemId, remessa } },
    })
  },

  async criar(input) {
    return prisma.scheduledDelivery.create({ data: input })
  },

  async confirmar(id, now) {
    try {
      return await prisma.scheduledDelivery.update({
        where: { id },
        data: { confirmedAt: now },
      })
    } catch {
      return null
    }
  },

  async remover(id) {
    try {
      await prisma.scheduledDelivery.delete({ where: { id } })
      return true
    } catch {
      return false
    }
  },
}
