import type { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/shared/db/prisma'
import type { Sector } from '../gerenciar-setores'
import {
  ItemJaClassificadoError,
  ItemNaoEncontradoError,
  type ActivityCriada,
  type ClassificacaoEmTransacao,
  type ClassificacaoRepository,
  type ItemParaClassificar,
} from '../classificar-item'

function situacaoClassificacao(sectorId: string | null): ItemParaClassificar['classificationStatus'] {
  return sectorId ? 'CLASSIFIED' : 'PENDING_CLASSIFICATION'
}

/**
 * A classificação é a própria definição do setor do item. A atualização
 * condicional (`setor_id IS NULL`) é o árbitro da concorrência: apenas uma
 * transação vence; a perdedora recebe `ItemJaClassificadoError`.
 */
export async function transicionarPendenteNoEscopo(
  cliente: Prisma.TransactionClient,
  itemId: string,
): Promise<void> {
  const { count } = await cliente.orderItem.updateMany({
    where: { id: itemId, sectorId: null },
    data: { classifiedAt: new Date() },
  })
  if (count > 0) return

  const existe = await cliente.orderItem.findUnique({ where: { id: itemId }, select: { id: true } })
  if (!existe) throw new ItemNaoEncontradoError(itemId)
  throw new ItemJaClassificadoError(itemId)
}

export async function criarAtividadeNoEscopo(
  cliente: Prisma.TransactionClient,
  itemId: string,
  sectorId: string,
  userId?: string | null,
): Promise<ActivityCriada> {
  const { count } = await cliente.orderItem.updateMany({
    where: { id: itemId, sectorId: null },
    data: {
      sectorId,
      classifiedAt: new Date(),
      classifiedByUserId: userId ?? null,
    },
  })

  if (count === 1) {
    return { id: itemId, orderItemId: itemId, sectorId }
  }

  const existe = await cliente.orderItem.findUnique({ where: { id: itemId }, select: { id: true } })
  if (!existe) throw new ItemNaoEncontradoError(itemId)
  throw new ItemJaClassificadoError(itemId)
}

async function lerItemNoEscopo(
  cliente: Prisma.TransactionClient,
  itemId: string,
): Promise<ItemParaClassificar | null> {
  const row = await cliente.orderItem.findUnique({ where: { id: itemId } })
  if (!row) return null
  return {
    id: row.id,
    legacyCategory: row.legacyCategory,
    classificationStatus: situacaoClassificacao(row.sectorId),
  }
}

async function lerSetorNoEscopo(
  cliente: Prisma.TransactionClient,
  sectorId: string,
): Promise<Sector | null> {
  const row = await cliente.sector.findUnique({ where: { id: sectorId } })
  if (!row) return null
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    active: row.active,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/** Implementação transacional da classificação (mesmo cliente recebido). */
export function criarClassificacaoEmTransacao(
  cliente: Prisma.TransactionClient,
): ClassificacaoEmTransacao {
  return {
    transicionarPendente: (itemId) => transicionarPendenteNoEscopo(cliente, itemId),
    findItemById: (itemId) => lerItemNoEscopo(cliente, itemId),
    findSectorById: (sectorId) => lerSetorNoEscopo(cliente, sectorId),
    criarAtividade: (itemId, sectorId, userId) =>
      criarAtividadeNoEscopo(cliente, itemId, sectorId, userId),
  }
}

/** Implementação Prisma da porta `ClassificacaoRepository` (fluxo automático). */
export const prismaClassificacaoRepository: ClassificacaoRepository = {
  findItemById: (itemId) => lerItemNoEscopo(prisma, itemId),

  findSectorById: (sectorId) => lerSetorNoEscopo(prisma, sectorId),

  async markClassified({ itemId, sectorId }): Promise<ActivityCriada> {
    try {
      return await prisma.$transaction(async (tx) => {
        return criarAtividadeNoEscopo(tx, itemId, sectorId, null)
      })
    } catch (erro) {
      if (erro instanceof ItemJaClassificadoError || erro instanceof ItemNaoEncontradoError) {
        throw erro
      }
      throw erro
    }
  },
}
