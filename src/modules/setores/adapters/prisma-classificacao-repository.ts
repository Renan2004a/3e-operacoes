import { prisma } from '@/shared/db/prisma'
import type { Sector } from '../gerenciar-setores'
import type {
  ActivityCriada,
  ClassificacaoRepository,
  ItemParaClassificar,
} from '../classificar-item'

/** Implementação Prisma da porta `ClassificacaoRepository`. */
export const prismaClassificacaoRepository: ClassificacaoRepository = {
  async findItemById(itemId): Promise<ItemParaClassificar | null> {
    const row = await prisma.orderItem.findUnique({ where: { id: itemId } })
    if (!row) return null
    return {
      id: row.id,
      legacyCategory: row.legacyCategory,
      classificationStatus: row.classificationStatus,
    }
  },

  async findSectorById(sectorId): Promise<Sector | null> {
    const row = await prisma.sector.findUnique({ where: { id: sectorId } })
    if (!row) return null
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      active: row.active,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  },

  async markClassified({ itemId, sectorId }): Promise<ActivityCriada> {
    return prisma.$transaction(async (tx) => {
      await tx.orderItem.update({
        where: { id: itemId },
        data: { classificationStatus: 'CLASSIFIED' },
      })
      const activity = await tx.activity.create({ data: { orderItemId: itemId, sectorId } })
      return { id: activity.id, orderItemId: activity.orderItemId, sectorId: activity.sectorId }
    })
  },
}
