import type { ActivityStatus } from '../producao/tipos'
import {
  ItemNaoEncontradoError,
  SetorInvalidoError,
  type ItemParaClassificar,
} from './classificar-item'
import type { Sector } from './gerenciar-setores'

/** Atividade do item (item × setor) com a contagem dos registros que travam a correção. */
export interface AtividadeDoItem {
  id: string
  itemId: string
  sectorId: string
  status: ActivityStatus
  execucoes: number
  ocorrencias: number
  entregas: number
}

export interface TrocaSetorInput {
  atividadeId: string
  itemId: string
  setorAnteriorId: string
  sectorId: string
  userId: string
  motivo: string | null
}

export interface CorrecaoSetorRepository {
  /** Item do pedido, ou null se não existir. */
  findItemById(itemId: string): Promise<ItemParaClassificar | null>
  /** Setor pelo id, ativo ou inativo, ou null se não existir. */
  findSectorById(sectorId: string): Promise<Sector | null>
  /** Atividade do item, ou null se o item não tiver atividade. */
  findActivityByItemId(itemId: string): Promise<AtividadeDoItem | null>
  /**
   * Troca o setor da atividade e grava a auditoria na mesma transação, somente
   * se a atividade continuar sem registros operacionais. Retorna `false` quando
   * a condição não se mantém (registro criado entre a leitura e a gravação).
   */
  trocarSetorDaAtividade(input: TrocaSetorInput): Promise<boolean>
}

export class ItemNaoClassificadoError extends Error {
  constructor(itemId: string) {
    super(`Item ainda não foi desmembrado: ${itemId}`)
    this.name = 'ItemNaoClassificadoError'
  }
}

export class RegistrosOperacionaisError extends Error {
  constructor(itemId: string) {
    super(`Item possui registros operacionais e não pode mudar de setor: ${itemId}`)
    this.name = 'RegistrosOperacionaisError'
  }
}

export class MotivoObrigatorioError extends Error {
  constructor() {
    super('Informe o motivo da correção de setor')
    this.name = 'MotivoObrigatorioError'
  }
}

export interface CorrigirSetorInput {
  itemId: string
  sectorId: string
  motivo: string | null
  /** Gerente e responsável pelo sistema informam o motivo; vendedor não. */
  exigeMotivo: boolean
  userId: string
}

export interface CorrigirSetorResult {
  status: 'CLASSIFIED'
  sectorId: string
  activityId: string
  alterado: boolean
}

/**
 * Corrige o setor de um item já desmembrado. A correção só é aceita enquanto
 * o item não tiver execução, ocorrência, entrega ou atividade iniciada; caso
 * contrário responde conflito, para não deixar registros órfãos no setor antigo.
 */
export async function corrigirSetorItem(
  input: CorrigirSetorInput,
  repo: CorrecaoSetorRepository,
): Promise<CorrigirSetorResult> {
  const item = await repo.findItemById(input.itemId)
  if (!item) throw new ItemNaoEncontradoError(input.itemId)
  if (item.classificationStatus !== 'CLASSIFIED') throw new ItemNaoClassificadoError(input.itemId)

  const motivo = input.motivo?.trim() || null
  if (input.exigeMotivo && motivo === null) throw new MotivoObrigatorioError()

  const sector = await repo.findSectorById(input.sectorId)
  if (!sector || !sector.active) throw new SetorInvalidoError(input.sectorId)

  const atividade = await repo.findActivityByItemId(input.itemId)
  if (!atividade) throw new ItemNaoClassificadoError(input.itemId)

  if (atividade.sectorId === input.sectorId) {
    return {
      status: 'CLASSIFIED',
      sectorId: atividade.sectorId,
      activityId: atividade.id,
      alterado: false,
    }
  }

  const possuiRegistros =
    atividade.status !== 'PENDING' ||
    atividade.execucoes > 0 ||
    atividade.ocorrencias > 0 ||
    atividade.entregas > 0
  if (possuiRegistros) throw new RegistrosOperacionaisError(input.itemId)

  const trocado = await repo.trocarSetorDaAtividade({
    atividadeId: atividade.id,
    itemId: input.itemId,
    setorAnteriorId: atividade.sectorId,
    sectorId: input.sectorId,
    userId: input.userId,
    motivo,
  })
  if (!trocado) throw new RegistrosOperacionaisError(input.itemId)

  return {
    status: 'CLASSIFIED',
    sectorId: input.sectorId,
    activityId: atividade.id,
    alterado: true,
  }
}
