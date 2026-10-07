import type { Sector } from './gerenciar-setores'
import { garantirMapeamento, type MapeamentoRepository } from './mapeamento'

export type ItemClassificationStatus = 'CLASSIFIED' | 'PENDING_CLASSIFICATION'

export interface ItemParaClassificar {
  id: string
  legacyCategory: string | null
  classificationStatus: ItemClassificationStatus
}

export interface ActivityCriada {
  id: string
  orderItemId: string
  sectorId: string
}

export interface ClassificacaoRepository {
  /** Item do pedido, ou null se não existir. */
  findItemById(itemId: string): Promise<ItemParaClassificar | null>
  /** Setor pelo id, ativo ou inativo, ou null se não existir. */
  findSectorById(sectorId: string): Promise<Sector | null>
  /** Marca o item como CLASSIFIED e cria a Activity (item × setor) na mesma transação. */
  markClassified(input: { itemId: string; sectorId: string }): Promise<ActivityCriada>
}

export interface ClassificacaoDeps {
  classificacao: ClassificacaoRepository
  mapeamento: MapeamentoRepository
}

export class ItemNaoEncontradoError extends Error {
  constructor(itemId: string) {
    super(`Item não encontrado: ${itemId}`)
    this.name = 'ItemNaoEncontradoError'
  }
}

export class ItemJaClassificadoError extends Error {
  constructor(itemId: string) {
    super(`Item já classificado: ${itemId}`)
    this.name = 'ItemJaClassificadoError'
  }
}

export class SetorInvalidoError extends Error {
  constructor(sectorId: string) {
    super(`Setor inexistente ou inativo: ${sectorId}`)
    this.name = 'SetorInvalidoError'
  }
}

export interface ClassificacaoResult {
  status: ItemClassificationStatus
  sectorId: string | null
  activityId: string | null
}

const PENDENTE: ClassificacaoResult = {
  status: 'PENDING_CLASSIFICATION',
  sectorId: null,
  activityId: null,
}

/**
 * Classifica um item pela categoria: se a categoria tiver mapeamento ativo, o
 * item vira CLASSIFIED no setor do mapeamento; senão permanece pendente.
 */
export async function classificarPorMapeamento(
  itemId: string,
  deps: ClassificacaoDeps,
): Promise<ClassificacaoResult> {
  const item = await deps.classificacao.findItemById(itemId)
  if (!item) throw new ItemNaoEncontradoError(itemId)
  if (item.classificationStatus === 'CLASSIFIED') throw new ItemJaClassificadoError(itemId)

  const category = item.legacyCategory?.trim()
  if (!category) return PENDENTE

  const mapping = await deps.mapeamento.findByCategory(category)
  if (!mapping || mapping.status !== 'ACTIVE') return PENDENTE

  const activity = await deps.classificacao.markClassified({ itemId, sectorId: mapping.sectorId })
  return { status: 'CLASSIFIED', sectorId: mapping.sectorId, activityId: activity.id }
}

export interface ClassificarItemInput {
  itemId: string
  sectorId: string
  legacyCategory?: string | null
  userId?: string | null
}

/**
 * Classificação manual: valida o setor informado, garante o mapeamento quando
 * há categoria e marca o item como CLASSIFIED no setor informado.
 */
export async function classificarItem(
  input: ClassificarItemInput,
  deps: ClassificacaoDeps,
): Promise<ClassificacaoResult> {
  const item = await deps.classificacao.findItemById(input.itemId)
  if (!item) throw new ItemNaoEncontradoError(input.itemId)
  if (item.classificationStatus === 'CLASSIFIED') throw new ItemJaClassificadoError(input.itemId)

  const sector = await deps.classificacao.findSectorById(input.sectorId)
  if (!sector || !sector.active) throw new SetorInvalidoError(input.sectorId)

  if (input.legacyCategory) {
    await garantirMapeamento(
      { legacyCategory: input.legacyCategory, sectorId: input.sectorId, userId: input.userId },
      deps.mapeamento,
    )
  }

  const activity = await deps.classificacao.markClassified({
    itemId: input.itemId,
    sectorId: input.sectorId,
  })
  return { status: 'CLASSIFIED', sectorId: input.sectorId, activityId: activity.id }
}
