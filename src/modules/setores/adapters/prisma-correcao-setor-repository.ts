import { prisma } from '@/shared/db/prisma'
import type { ItemParaClassificar } from '../classificar-item'
import type { Sector } from '../gerenciar-setores'
import type { AtividadeDoItem, CorrecaoSetorRepository, TrocaSetorInput } from '../corrigir-setor'

/** Implementação Prisma da porta `CorrecaoSetorRepository`. */
export const prismaCorrecaoSetorRepository: CorrecaoSetorRepository = {
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

  async findActivityByItemId(itemId): Promise<AtividadeDoItem | null> {
    const row = await prisma.activity.findFirst({
      where: { orderItemId: itemId },
      include: {
        _count: { select: { executions: true, occurrences: true } },
        orderItem: { select: { _count: { select: { deliveries: true } } } },
      },
    })
    if (!row) return null
    return {
      id: row.id,
      itemId: row.orderItemId,
      sectorId: row.sectorId,
      status: row.status,
      execucoes: row._count.executions,
      ocorrencias: row._count.occurrences,
      entregas: row.orderItem._count.deliveries,
    }
  },

  async trocarSetorDaAtividade(input: TrocaSetorInput): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const { count } = await tx.activity.updateMany({
        where: {
          id: input.atividadeId,
          orderItemId: input.itemId,
          sectorId: input.setorAnteriorId,
          status: 'PENDING',
          executions: { none: {} },
          occurrences: { none: {} },
          orderItem: { deliveries: { none: {} } },
        },
        data: { sectorId: input.sectorId },
      })
      if (count === 0) return false

      await tx.auditLog.create({
        data: {
          userId: input.userId,
          action: 'SECTOR_CORRECTION',
          entityType: 'OrderItem',
          entityId: input.itemId,
          beforeJson: { sectorId: input.setorAnteriorId },
          afterJson: { sectorId: input.sectorId },
          reason: input.motivo,
        },
      })
      return true
    })
  },
}
