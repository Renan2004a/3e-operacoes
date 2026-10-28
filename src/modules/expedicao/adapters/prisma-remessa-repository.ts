import { prisma } from '@/shared/db/prisma'
import { RemessaDuplicadaError, RemessaInvalidaError, type RemessaRepository } from '../remessas'

function codigoDoErro(erro: unknown): string | null {
  if (typeof erro === 'object' && erro !== null && 'code' in erro) {
    const codigo = (erro as { code?: unknown }).code
    return typeof codigo === 'string' ? codigo : null
  }
  return null
}

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
    try {
      return await prisma.scheduledDelivery.create({ data: input })
    } catch (erro) {
      // Duas pessoas programando ao mesmo tempo calculam o mesmo próximo
      // número; a violação da chave única vira erro de domínio (409 na API).
      if (codigoDoErro(erro) === 'P2002') throw new RemessaDuplicadaError(input.remessa)
      if (codigoDoErro(erro) === 'P2003') {
        throw new RemessaInvalidaError('Item do pedido não encontrado')
      }
      throw erro
    }
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
