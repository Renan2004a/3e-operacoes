import { prisma } from '@/shared/db/prisma'
import type { ClassificacaoAutomaticaPort } from '@/modules/pedidos/importar-pedido'
import { classificarPorMapeamento } from '../classificar-item'
import { prismaClassificacaoRepository } from './prisma-classificacao-repository'
import { prismaMapeamentoRepository } from './prisma-setores-repository'

/**
 * Implementação Prisma da porta de auto-classificação usada na importação.
 * Resolve os itens do pedido pela chave do legado e classifica os pendentes
 * cuja categoria tenha mapeamento ativo. Itens já classificados são ignorados.
 */
export const prismaClassificacaoAutomatica: ClassificacaoAutomaticaPort = {
  async classificarItens({ orderId, items }) {
    const orderItems = await prisma.orderItem.findMany({
      where: { orderId },
      select: { id: true, legacyItemKey: true, classificationStatus: true },
    })
    const pendingByKey = new Map(
      orderItems
        .filter((item) => item.classificationStatus === 'PENDING_CLASSIFICATION')
        .map((item) => [item.legacyItemKey, item.id]),
    )

    for (const item of items) {
      const itemId = pendingByKey.get(item.legacyItemKey)
      if (!itemId) continue
      await classificarPorMapeamento(itemId, {
        classificacao: prismaClassificacaoRepository,
        mapeamento: prismaMapeamentoRepository,
      })
    }
  },
}
