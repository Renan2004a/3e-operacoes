import { prisma } from '@/shared/db/prisma'
import type { ItemParaClassificar } from '../classificar-item'
import type { Sector } from '../gerenciar-setores'
import type { AtividadeDoItem, CorrecaoSetorRepository, TrocaSetorInput } from '../corrigir-setor'

/** A classificação agora é derivada do setor de destino do item. */
function situacaoClassificacao(sectorId: string | null): ItemParaClassificar['classificationStatus'] {
  return sectorId ? 'CLASSIFIED' : 'PENDING_CLASSIFICATION'
}

/** Implementação Prisma da porta `CorrecaoSetorRepository`. */
export const prismaCorrecaoSetorRepository: CorrecaoSetorRepository = {
  async findItemById(itemId): Promise<ItemParaClassificar | null> {
    const row = await prisma.orderItem.findUnique({ where: { id: itemId } })
    if (!row) return null
    return {
      id: row.id,
      legacyCategory: row.legacyCategory,
      classificationStatus: situacaoClassificacao(row.sectorId),
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
    const row = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: {
        sector: { select: { code: true, name: true } },
        _count: { select: { executions: true, occurrences: true, deliveries: true } },
      },
    })
    if (!row || !row.sectorId || !row.sector) return null
    return {
      id: row.id,
      itemId: row.id,
      sectorId: row.sectorId,
      sectorCode: row.sector.code,
      sectorName: row.sector.name,
      status: row.status,
      execucoes: row._count.executions,
      ocorrencias: row._count.occurrences,
      entregas: row._count.deliveries,
    }
  },

  async trocarSetorDaAtividade(input: TrocaSetorInput): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const { count } = await tx.orderItem.updateMany({
        where: {
          id: input.itemId,
          sectorId: input.setorAnterior.id,
          status: 'PENDING',
          executions: { none: {} },
          occurrences: { none: {} },
          deliveries: { none: {} },
        },
        data: {
          sectorId: input.setorNovo.id,
          classifiedAt: new Date(),
          classifiedByUserId: input.userId,
        },
      })
      if (count === 0) return false

      await tx.auditLog.create({
        data: {
          userId: input.userId,
          action: 'SECTOR_CORRECTION',
          entityType: 'OrderItem',
          entityId: input.itemId,
          beforeJson: {
            activityId: input.atividadeId,
            sectorId: input.setorAnterior.id,
            sectorCode: input.setorAnterior.code,
            sectorName: input.setorAnterior.name,
          },
          afterJson: {
            activityId: input.atividadeId,
            sectorId: input.setorNovo.id,
            sectorCode: input.setorNovo.code,
            sectorName: input.setorNovo.name,
          },
          reason: input.motivo,
        },
      })
      return true
    })
  },
}
