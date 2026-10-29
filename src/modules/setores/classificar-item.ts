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
  /**
   * Marca o item como CLASSIFIED somente se ele ainda estiver pendente e cria a
   * Activity (item × setor) na mesma transação. A transição condicional é o
   * árbitro da concorrência; conflito vira `ItemJaClassificadoError`.
   */
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
  /** Usuário autenticado que executa a classificação manual. */
  userId: string
}

export interface ClassificacaoEmTransacao {
  /**
   * Transição condicional do item pendente para `CLASSIFIED`. Árbitro de
   * concorrência para o mesmo item: quem não vence recebe
   * `ItemJaClassificadoError`, quem não encontra recebe `ItemNaoEncontradoError`.
   */
  transicionarPendente(itemId: string): Promise<void>
  /** Leitura autoritativa do item dentro da transação (categoria persistida). */
  findItemById(itemId: string): Promise<ItemParaClassificar | null>
  /** Leitura do setor, ativo ou inativo, dentro da transação. */
  findSectorById(sectorId: string): Promise<Sector | null>
  /** Cria a atividade defendendo contra duplicidade dentro da transação. */
  criarAtividade(itemId: string, sectorId: string): Promise<ActivityCriada>
}

export interface ClassificacaoEscopoTransacional {
  classificacao: ClassificacaoEmTransacao
  mapeamento: MapeamentoRepository
}

export interface UnidadeTrabalhoClassificacao {
  /**
   * Executa `fn` como uma única unidade transacional: os repositórios entregues
   * ao `fn` estão vinculados ao mesmo cliente transacional, e qualquer falha
   * desfaz todas as alterações do escopo. Uma nova tentativa, quando houver
   * política de retry do adapter, repete a unidade completa com clientes novos.
   */
  transacional<T>(
    fn: (escopo: ClassificacaoEscopoTransacional) => Promise<T>,
  ): Promise<T>
}

export interface ClassificarItemDeps {
  unidade: UnidadeTrabalhoClassificacao
}

/**
 * Classificação manual como única unidade transacional: transição condicional
 * do item pendente, leitura autoritativa da categoria persistida, criação,
 * reativação ou reutilização do mapeamento com a auditoria correspondente,
 * e criação da atividade. Uma falha em qualquer ponto desfaz toda a
 * solicitação; a classificação vencedora é única por item e o vencedor da
 * transição é o único autor das alterações.
 *
 * A categoria e a autoria nunca vêm do corpo da requisição.
 */
export async function classificarItem(
  input: ClassificarItemInput,
  deps: ClassificarItemDeps,
): Promise<ClassificacaoResult> {
  return deps.unidade.transacional(async ({ classificacao, mapeamento }) => {
    await classificacao.transicionarPendente(input.itemId)

    const item = await classificacao.findItemById(input.itemId)
    if (!item) throw new ItemNaoEncontradoError(input.itemId)

    const sector = await classificacao.findSectorById(input.sectorId)
    if (!sector || !sector.active) throw new SetorInvalidoError(input.sectorId)

    const category = item.legacyCategory?.trim()
    if (category) {
      await garantirMapeamento(
        { legacyCategory: category, sectorId: input.sectorId, userId: input.userId },
        mapeamento,
      )
    }

    const activity = await classificacao.criarAtividade(input.itemId, input.sectorId)
    return { status: 'CLASSIFIED', sectorId: input.sectorId, activityId: activity.id }
  })
}
