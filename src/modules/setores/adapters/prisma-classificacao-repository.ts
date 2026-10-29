import { prisma } from '@/shared/db/prisma'
import type { Sector } from '../gerenciar-setores'
import {
  ItemJaClassificadoError,
  ItemNaoEncontradoError,
  type ActivityCriada,
  type ClassificacaoRepository,
  type ItemParaClassificar,
} from '../classificar-item'

/**
 * Identifica a violação da chave única `(orderItemId, sectorId)` de `Activity`.
 * Só traduz a constraint conhecida; outros `P2002` continuam propagando.
 */
function ehViolacaoDaAtividadeUnica(erro: unknown): boolean {
  if (typeof erro !== 'object' || erro === null) return false
  const { code, meta } = erro as { code?: unknown; meta?: { target?: unknown } }
  if (code !== 'P2002') return false

  const target = meta?.target
  if (Array.isArray(target)) {
    return target.includes('orderItemId') && target.includes('sectorId')
  }
  if (typeof target === 'string') {
    return target.includes('orderItemId') && target.includes('sectorId')
  }
  return false
}

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
    try {
      return await prisma.$transaction(async (tx) => {
        // A transição é o árbitro da concorrência: só vence quem ainda encontra
        // o item pendente. A atualização condicional e a criação da atividade
        // ficam na mesma transação; qualquer falha desfaz a classificação.
        const { count } = await tx.orderItem.updateMany({
          where: { id: itemId, classificationStatus: 'PENDING_CLASSIFICATION' },
          data: { classificationStatus: 'CLASSIFIED' },
        })
        if (count === 0) {
          const existe = await tx.orderItem.findUnique({
            where: { id: itemId },
            select: { id: true },
          })
          if (!existe) throw new ItemNaoEncontradoError(itemId)
          throw new ItemJaClassificadoError(itemId)
        }

        // Defesa para dados legados/inconsistentes: um item pendente não deve
        // ganhar uma segunda atividade, mesmo que a existente seja de outro setor.
        const atividadeExistente = await tx.activity.findFirst({
          where: { orderItemId: itemId },
          select: { id: true },
        })
        if (atividadeExistente) throw new ItemJaClassificadoError(itemId)

        const activity = await tx.activity.create({ data: { orderItemId: itemId, sectorId } })
        return { id: activity.id, orderItemId: activity.orderItemId, sectorId: activity.sectorId }
      })
    } catch (erro) {
      if (erro instanceof ItemJaClassificadoError || erro instanceof ItemNaoEncontradoError) {
        throw erro
      }
      // Corrida residual fora do fluxo da aplicação: a constraint de atividade
      // única ainda protege contra duplicação e vira conflito de domínio.
      if (ehViolacaoDaAtividadeUnica(erro)) throw new ItemJaClassificadoError(itemId)
      throw erro
    }
  },
}
